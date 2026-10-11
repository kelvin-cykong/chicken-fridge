"""Chicken Fridge: a food-waste MVP. Flask backend with in-memory stores.

There are no accounts. Each browser gets an anonymous cookie and its own copy of
the data, so several people can try the app at once without sharing a fridge.
"""

import re
import secrets
import threading
from collections import OrderedDict
from datetime import date, timedelta
from itertools import count

from flask import Flask, g, jsonify, render_template, request
from werkzeug.local import LocalProxy

from seed import INGREDIENTS, RECIPES, SAMPLE_FRIDGE, SAMPLE_HISTORY, SAMPLE_LIST

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

ZONES = ("pantry", "chilled", "frozen")
SOON_DAYS = 3

# Bin chicken. Its standing mood comes from the history log:
# an unbroken run of eaten items makes it happy, food thrown away makes it cross.
MOOD_WINDOW_DAYS = 7      # only items thrown away this recently count
SULKY_THROWN = 1          # thrown away in the window: a bit cross
ANGRY_THROWN = 4          # more than three: very angry
HAPPY_STREAK = 6          # more than five eaten in a row
SUPERHAPPY_STREAK = 11    # more than ten eaten in a row
MOODS = ("angry", "sulky", "content", "happy", "superhappy")

# Expired item check
KEEP_CHOICES = (1, 2, 3)   # "ask me again in N days"
MAX_KEEP_DAYS = 7          # furthest past its date an item may be kept
HIGH_RISK_CATEGORIES = ("meat", "dairy")   # "meat" covers seafood here
HIGH_RISK_WORDS = ("leftover", "cooked")


class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


@app.errorhandler(ApiError)
def handle_api_error(err):
    return jsonify(error=err.message), err.status


# ---------------------------------------------------------------- names

def _singular(word):
    if len(word) <= 3:
        return word
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("ie") and len(word) > 4:
        return word[:-2] + "y"
    if word.endswith(("sses", "xes", "ches", "shes", "oes")):
        return word[:-2]
    if word.endswith(("ss", "us", "is")):
        return word
    if word.endswith("s"):
        return word[:-1]
    return word


def normalize(name):
    """Matching key: case-insensitive and singular/plural-insensitive."""
    words = re.sub(r"\s+", " ", str(name or "")).strip().lower().split(" ")
    words[-1] = _singular(words[-1])
    return " ".join(words)


# ---------------------------------------------------------------- store

DICTIONARY = [
    {"name": n, "key": normalize(n), "zone": z, "shelf_life": d, "category": c}
    for n, z, d, c in INGREDIENTS
]
DICT_BY_KEY = {d["key"]: d for d in DICTIONARY}


def category_of(name):
    return DICT_BY_KEY.get(normalize(name), {}).get("category", "other")

_ids = count(1)


def new_store():
    """A fresh copy of the seed data for one visitor."""
    data = {"fridge": [], "list": [], "recipes": [], "history": [], "forced_mood": None}
    today = date.today()
    for name, zone, days, qty in SAMPLE_FRIDGE:
        data["fridge"].append({
            "id": next(_ids), "name": name, "zone": zone,
            "expiry": today + timedelta(days=days), "quantity": qty,
            "keep_until": None, "kept_days_total": 0,
        })
    for name, action, was_expiring, days_ago in SAMPLE_HISTORY:
        data["history"].append({
            "item_name": name, "category": category_of(name), "action": action,
            "was_expiring": was_expiring, "date": today - timedelta(days=days_ago),
        })
    for name, qty, bought in SAMPLE_LIST:
        data["list"].append({"id": next(_ids), "name": name, "quantity": qty, "bought": bought})
    for recipe in RECIPES:
        data["recipes"].append({"id": next(_ids), "custom": False, **recipe})
    return data


# ---------------------------------------------------------------- visitors
# One store per browser, keyed by an anonymous cookie. Still memory only: a
# restart clears everything, and the least recently used stores are dropped
# once there are more than MAX_VISITORS.

VISITOR_COOKIE = "cf_visitor"
VISITOR_COOKIE_DAYS = 30
MAX_VISITORS = 500

stores = OrderedDict()   # visitor id -> store
_stores_lock = threading.Lock()


def current_store():
    with _stores_lock:
        if g.visitor_id not in stores:
            stores[g.visitor_id] = new_store()
            while len(stores) > MAX_VISITORS:
                stores.popitem(last=False)
        stores.move_to_end(g.visitor_id)
        return stores[g.visitor_id]


# `store` is the current visitor's data; valid only while handling a request.
store = LocalProxy(current_store)


@app.before_request
def identify_visitor():
    visitor_id = request.cookies.get(VISITOR_COOKIE, "")
    g.new_visitor = not re.fullmatch(r"[A-Za-z0-9_-]{20,64}", visitor_id)
    g.visitor_id = secrets.token_urlsafe(24) if g.new_visitor else visitor_id


@app.after_request
def remember_visitor(response):
    if g.get("new_visitor") and request.endpoint != "static":
        response.set_cookie(VISITOR_COOKIE, g.visitor_id, max_age=VISITOR_COOKIE_DAYS * 86400,
                            httponly=True, samesite="Lax")
    return response


def find(collection, item_id):
    for item in store[collection]:
        if item["id"] == item_id:
            return item
    raise ApiError("Not found.", 404)


# ---------------------------------------------------------------- input

def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def clean_name(value):
    name = re.sub(r"\s+", " ", str(value or "")).strip()
    if not name:
        raise ApiError("Name is required.")
    return name[:60]


def clean_quantity(value):
    try:
        qty = int(value)
    except (TypeError, ValueError):
        raise ApiError("Quantity must be a whole number.")
    return max(1, min(qty, 99))


def clean_zone(value):
    if value not in ZONES:
        raise ApiError("Zone must be pantry, chilled or frozen.")
    return value


def clean_expiry(value):
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise ApiError("Expiry date must look like YYYY-MM-DD.")


def clean_text_list(value, label):
    if not isinstance(value, list):
        raise ApiError(f"{label} must be a list.")
    items = [re.sub(r"\s+", " ", str(v)).strip() for v in value]
    return [i[:300] for i in items if i]


# ---------------------------------------------------------------- views

def is_kept(item):
    """Past its date, but the user said it is still good and the check isn't due yet."""
    return item["keep_until"] is not None and date.today() < item["keep_until"]


def needs_check(item):
    return item["expiry"] < date.today() and not is_kept(item)


def keep_options(item):
    """How many more days the item may be kept without passing MAX_KEEP_DAYS."""
    limit = (item["expiry"] + timedelta(days=MAX_KEEP_DAYS) - date.today()).days
    return [d for d in KEEP_CHOICES if d <= limit]


def fridge_view(item):
    key = normalize(item["name"])
    category = category_of(item["name"])
    days_left = (item["expiry"] - date.today()).days
    if days_left < 0:
        status = "kept" if is_kept(item) else "expired"
    elif days_left <= SOON_DAYS:
        status = "soon"
    else:
        status = "ok"
    return {
        **item,
        "expiry": item["expiry"].isoformat(),
        "keep_until": item["keep_until"].isoformat() if is_kept(item) else None,
        "key": key,
        "category": category,
        "days_left": days_left,
        "status": status,
        "high_risk": category in HIGH_RISK_CATEGORIES
                     or any(w in item["name"].lower() for w in HIGH_RISK_WORDS),
        "keep_options": keep_options(item) if days_left < 0 else [],
    }


def list_view(item):
    entry = DICT_BY_KEY.get(normalize(item["name"]), {})
    return {
        **item,
        "key": normalize(item["name"]),
        "category": entry.get("category", "other"),
        "default_zone": entry.get("zone"),
        "default_shelf_life": entry.get("shelf_life"),
    }


def recipe_view(recipe):
    fridge_keys = {normalize(i["name"]) for i in store["fridge"]}
    list_keys = {normalize(i["name"]) for i in store["list"]}
    ingredients = [
        {"name": n, "have": normalize(n) in fridge_keys, "in_list": normalize(n) in list_keys}
        for n in recipe["ingredients"]
    ]
    return {
        "id": recipe["id"],
        "name": recipe["name"],
        "minutes": recipe.get("minutes"),
        "custom": recipe["custom"],
        "steps": recipe["steps"],
        "ingredients": ingredients,
        "have": [i["name"] for i in ingredients if i["have"]],
        "missing": [i["name"] for i in ingredients if not i["have"]],
    }


# ---------------------------------------------------------------- pages

@app.get("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------- ingredients

@app.get("/api/ingredients")
def get_ingredients():
    return jsonify(DICTIONARY)


@app.get("/api/ingredients/match")
def match_ingredient():
    """Dictionary entry for a typed name (tolerates case and plurals), or null."""
    return jsonify(DICT_BY_KEY.get(normalize(request.args.get("name", ""))))


# ---------------------------------------------------------------- fridge

@app.get("/api/fridge")
def get_fridge():
    items = sorted(store["fridge"], key=lambda i: (i["expiry"], i["name"].lower()))
    return jsonify([fridge_view(i) for i in items])


@app.post("/api/fridge")
def add_fridge_item():
    data = body()
    name = clean_name(data.get("name"))
    entry = DICT_BY_KEY.get(normalize(name), {})
    if data.get("expiry") is None:
        raise ApiError("Expiry date is required.")
    item = {
        "id": next(_ids),
        "name": name,
        "zone": clean_zone(data.get("zone") or entry.get("zone") or "chilled"),
        "expiry": clean_expiry(data["expiry"]),
        "quantity": clean_quantity(data.get("quantity", 1)),
        "keep_until": None,
        "kept_days_total": 0,
    }
    store["fridge"].append(item)

    # Storing a bought list item takes it off the shopping list.
    from_list_id = data.get("from_list_id")
    if from_list_id is not None:
        store["list"] = [i for i in store["list"] if i["id"] != from_list_id]
    return jsonify(fridge_view(item)), 201


@app.put("/api/fridge/<int:item_id>")
def update_fridge_item(item_id):
    item = find("fridge", item_id)
    data = body()
    if "name" in data:
        item["name"] = clean_name(data["name"])
    if "zone" in data:
        item["zone"] = clean_zone(data["zone"])
    if "expiry" in data:
        expiry = clean_expiry(data["expiry"])
        if expiry != item["expiry"]:
            item.update(expiry=expiry, keep_until=None, kept_days_total=0)
    if "quantity" in data:
        item["quantity"] = clean_quantity(data["quantity"])
    return jsonify(fridge_view(item))


def finish_item(item, action):
    """Take an item out of the fridge and record it as eaten or thrown away."""
    view = fridge_view(item)
    store["fridge"].remove(item)
    store["history"].append({
        "item_name": item["name"],
        "category": view["category"],
        "action": action,
        "was_expiring": view["days_left"] <= SOON_DAYS,
        "date": date.today(),
    })
    store["forced_mood"] = None  # real activity ends a demo override


@app.delete("/api/fridge/<int:item_id>")
def remove_fridge_item(item_id):
    """Delete an item. A plain delete (e.g. added by mistake) is not recorded;
    ?reason=eaten|thrown records it like /resolve does."""
    item = find("fridge", item_id)
    reason = request.args.get("reason", "removed")
    if reason not in ("eaten", "thrown", "removed"):
        raise ApiError("Reason must be eaten, thrown or removed.")
    if reason == "removed":
        store["fridge"].remove(item)
    else:
        finish_item(item, reason)
    return "", 204


@app.get("/api/fridge/expired-check")
def get_expired_check():
    """Items past their date that the user should be asked about now."""
    items = sorted((i for i in store["fridge"] if needs_check(i)), key=lambda i: i["expiry"])
    return jsonify([fridge_view(i) for i in items])


@app.post("/api/fridge/<int:item_id>/resolve")
def resolve_fridge_item(item_id):
    """Body: {"action": "eaten" | "thrown" | "keep", "days": 1-3 (keep only)}."""
    item = find("fridge", item_id)
    data = body()
    action = data.get("action")
    if action in ("eaten", "thrown"):
        finish_item(item, action)
        return jsonify(item=None, reaction=reaction(item["name"], action), mascot=mascot_state())
    if action != "keep":
        raise ApiError("Action must be eaten, thrown or keep.")
    if item["expiry"] >= date.today():
        raise ApiError("Only items past their date can be kept for now.")
    options = keep_options(item)
    if not options:
        raise ApiError(f"This has been kept {MAX_KEEP_DAYS} days past its date. Eat it or throw it away.")
    if data.get("days") not in options:
        raise ApiError(f"Days must be one of {options}.")
    item["keep_until"] = date.today() + timedelta(days=data["days"])
    item["kept_days_total"] += data["days"]
    return jsonify(item=fridge_view(item), mascot=mascot_state())


@app.get("/api/log")
def get_log():
    return jsonify([{**e, "date": e["date"].isoformat()} for e in store["history"]])


# ---------------------------------------------------------------- bin chicken

NUMBER_WORDS = ("Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten")


def eaten_streak():
    """Items eaten in a row since the last one was thrown away."""
    streak = 0
    for entry in reversed(store["history"]):
        if entry["action"] != "eaten":
            break
        streak += 1
    return streak


def mascot_state():
    today = date.today()
    thrown = [e for e in store["history"]
              if e["action"] == "thrown" and (today - e["date"]).days < MOOD_WINDOW_DAYS]
    streak = eaten_streak()

    # A good run of eating wins over earlier waste, so the bird can be won back.
    if streak >= SUPERHAPPY_STREAK:
        mood = "superhappy"
    elif streak >= HAPPY_STREAK:
        mood = "happy"
    elif len(thrown) >= ANGRY_THROWN:
        mood = "angry"
    elif len(thrown) >= SULKY_THROWN:
        mood = "sulky"
    else:
        mood = "content"
    mood = store["forced_mood"] or mood

    # The nudge names the soonest-expiring item that is still in date.
    in_date = [i for i in store["fridge"] if i["expiry"] >= today]
    next_up = min(in_date, key=lambda i: i["expiry"], default=None)
    if next_up:
        days = (next_up["expiry"] - today).days
        left = "use it today" if days == 0 else f"{days} day{'' if days == 1 else 's'} left"
        name = next_up["name"]
        next_to_go = f"{name} is next to go — {left}."
        eat_first = (f"Eat the {name.lower()} today." if days == 0
                     else f"Eat the {name.lower()} first, it has {left}.")
    else:
        next_to_go = "Nothing is about to go off."
        eat_first = ""

    if mood in ("happy", "superhappy"):
        run = f"{streak} eaten in a row" if streak >= 2 else "Nothing wasted lately"
        cheer = f"{run}, I can't stop dancing!" if mood == "superhappy" else f"{run}!"
        message = f"{cheer} {next_to_go}" if next_up else cheer
    elif mood == "content":
        message = f"All good! {next_to_go}"
    elif mood == "sulky":
        what = f"The {thrown[-1]['item_name'].lower()}" if thrown else "Something"
        message = f"Hmph. {what} ended up in the bin. {eat_first}".strip()
    else:
        n = len(thrown)
        count_text = NUMBER_WORDS[n] if n < len(NUMBER_WORDS) else str(n)
        opener = f"{count_text} things in the bin this week!" if n >= 2 else "Too much food in the bin this week!"
        message = f"{opener} {eat_first}".strip()

    return {"mood": mood, "message": message, "thrown": len(thrown), "streak": streak}


def reaction(item_name, action):
    """The bird's one-off reaction to a single item. Separate from its standing mood."""
    name = item_name.lower()
    if action == "eaten":
        return {"mood": "happy", "message": f"Yum! The {name} didn't go to waste."}
    return {"mood": "angry", "message": f"Oh no! The {name} went in the bin."}


@app.get("/api/mascot")
def get_mascot():
    return jsonify(mascot_state())


# ---------------------------------------------------------------- demo helper (?demo=1)

@app.post("/api/demo/mood")
def demo_force_mood():
    mood = body().get("mood")
    if mood not in MOODS:
        raise ApiError(f"Mood must be one of {list(MOODS)}.")
    store["forced_mood"] = mood
    return jsonify(mascot_state())


@app.post("/api/demo/reset")
def demo_reset():
    """Reload the seed data for this visitor only."""
    with _stores_lock:
        stores[g.visitor_id] = new_store()
    return jsonify(ok=True)


# ---------------------------------------------------------------- list

@app.get("/api/list")
def get_list():
    return jsonify([list_view(i) for i in store["list"]])


@app.get("/api/list/pending")
def get_pending():
    """Ticked as bought, not stored in the fridge yet."""
    return jsonify([list_view(i) for i in store["list"] if i["bought"]])


def add_to_list(name, quantity=1):
    """Add to the list, merging into an unbought entry for the same ingredient."""
    key = normalize(name)
    for item in store["list"]:
        if not item["bought"] and normalize(item["name"]) == key:
            item["quantity"] = min(item["quantity"] + quantity, 99)
            return item
    item = {"id": next(_ids), "name": name, "quantity": quantity, "bought": False}
    store["list"].append(item)
    return item


@app.post("/api/list")
def add_list_item():
    data = body()
    item = add_to_list(clean_name(data.get("name")), clean_quantity(data.get("quantity", 1)))
    return jsonify(list_view(item)), 201


@app.put("/api/list/<int:item_id>")
def update_list_item(item_id):
    item = find("list", item_id)
    data = body()
    if "name" in data:
        item["name"] = clean_name(data["name"])
    if "quantity" in data:
        item["quantity"] = clean_quantity(data["quantity"])
    if "bought" in data:
        item["bought"] = bool(data["bought"])
    return jsonify(list_view(item))


@app.delete("/api/list/<int:item_id>")
def delete_list_item(item_id):
    store["list"].remove(find("list", item_id))
    return "", 204


# ---------------------------------------------------------------- recipes

def recipe_from_body():
    data = body()
    ingredients = clean_text_list(data.get("ingredients", []), "Ingredients")
    if not ingredients:
        raise ApiError("Add at least one ingredient.")
    return {
        "name": clean_name(data.get("name")),
        "ingredients": [i[:60] for i in ingredients],
        "steps": clean_text_list(data.get("steps", []), "Steps"),
    }


@app.get("/api/recipes")
def get_recipes():
    return jsonify([recipe_view(r) for r in store["recipes"]])


@app.get("/api/recipes/<int:recipe_id>")
def get_recipe(recipe_id):
    return jsonify(recipe_view(find("recipes", recipe_id)))


@app.post("/api/recipes")
def create_recipe():
    recipe = {"id": next(_ids), "custom": True, "minutes": None, **recipe_from_body()}
    store["recipes"].append(recipe)
    return jsonify(recipe_view(recipe)), 201


def find_custom_recipe(recipe_id):
    recipe = find("recipes", recipe_id)
    if not recipe["custom"]:
        raise ApiError("Built-in recipes can't be changed.", 403)
    return recipe


@app.put("/api/recipes/<int:recipe_id>")
def update_recipe(recipe_id):
    recipe = find_custom_recipe(recipe_id)
    recipe.update(recipe_from_body())
    return jsonify(recipe_view(recipe))


@app.delete("/api/recipes/<int:recipe_id>")
def delete_recipe(recipe_id):
    store["recipes"].remove(find_custom_recipe(recipe_id))
    return "", 204


@app.post("/api/recipes/<int:recipe_id>/add-missing")
def add_missing_to_list(recipe_id):
    """Add the recipe's ingredients that are in neither the fridge nor the list."""
    view = recipe_view(find("recipes", recipe_id))
    added = []
    for ing in view["ingredients"]:
        if not ing["have"] and not ing["in_list"]:
            add_to_list(ing["name"])
            added.append(ing["name"])
    return jsonify(added=added)


# ---------------------------------------------------------------- recommendations

def recommend(selected_names):
    """Rank recipes for the ingredients in the pot.

    1. Urgency: each selected ingredient the recipe uses scores 1 / (days left + 1),
       so using up food that expires soonest counts most. Expired food scores nothing.
    2. Then by how many selected ingredients the recipe uses.
    3. Then by fewest missing ingredients.
    """
    selected = {normalize(n) for n in selected_names if str(n).strip()}

    days_left = {}
    for item in store["fridge"]:
        days = (item["expiry"] - date.today()).days
        if days >= 0:
            key = normalize(item["name"])
            days_left[key] = min(days, days_left.get(key, days))

    results = []
    for recipe in store["recipes"]:
        used = [n for n in recipe["ingredients"] if normalize(n) in selected]
        if not used:
            continue
        used_days = {n: days_left.get(normalize(n)) for n in used}
        urgency = sum(1 / (d + 1) for d in used_days.values() if d is not None)
        view = recipe_view(recipe)
        view["used"] = used
        view["uses_soon"] = [n for n, d in used_days.items() if d is not None and d <= SOON_DAYS]
        view["score"] = round(urgency, 3)
        results.append(view)

    results.sort(key=lambda r: (-r["score"], -len(r["used"]), len(r["missing"]), r["name"]))
    return results


@app.post("/api/recommendations")
def get_recommendations():
    names = body().get("ingredients", [])
    if not isinstance(names, list):
        raise ApiError("Ingredients must be a list of names.")
    return jsonify(recommend(names))


if __name__ == "__main__":
    import sys

    if "--lan" in sys.argv:
        # Reachable from phones on the same Wi-Fi. Debug stays off here: the
        # debugger would let anyone on the network run code on this machine.
        app.run(host="0.0.0.0", port=5001, debug=False)
    else:
        app.run(debug=True, port=5001)
