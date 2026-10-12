# Chicken Fridge

A mobile-first web app that helps students waste less food. Three pages:

- **My Fridge**: a cartoon fridge with Pantry, Chilled and Frozen compartments. Food sits on the shelves, soonest to expire on the left. A bin chicken stands on top; its mood shows how much food went in the bin this week. When food is past its date, a pop-up asks what happened to it.
- **My List**: a shopping list. Ticked items wait behind the fridge's **+** button until you store them with an expiry date.
- **Recipes**: drag fridge food into the pot, press **Cook**, and get recipes ranked by what expires soonest.

## Setup

Requires Python 3.14.

```bash
python3.14 -m venv .venv
```

```bash
.venv/bin/pip install -r requirements.txt
```

## Run

```bash
.venv/bin/python app.py
```

Open <http://localhost:5001>. To try it on a phone, use your browser's device toolbar (375 px wide or similar).

To reach it from a phone on the same Wi-Fi, start it with `--lan` and open `http://<your computer's IP>:5001`:

```bash
.venv/bin/python app.py --lan
```

There are no accounts. Each browser gets an anonymous cookie (`cf_visitor`) and its own copy of the seed data, so several people can try the app at once without sharing a fridge. Clearing cookies, or using another browser or device, starts a fresh copy.

All data lives in server memory and is lost whenever the server restarts. When deploying, run a single server process (e.g. one gunicorn worker): each process has its own memory.

### Deploy (Render)

The repo includes `render.yaml`. Push it to GitHub, then in Render choose **New > Blueprint** and pick the repository. Render installs `requirements.txt` and starts the app with gunicorn on a single worker. On the free plan the service sleeps when idle; waking it takes a little while and everyone's data starts again from the seed data.

### Demo helper

Open <http://localhost:5001/?demo=1> for a small corner panel on My Fridge: buttons that force each bin chicken mood, and **Reset data** to reload the seed data for your own browser. A forced mood lasts until the next item is eaten or thrown away, or until a reset.

## Project structure

```
app.py                Flask app: in-memory store, REST API, recommendation logic
seed.py               Seed data: ingredient dictionary, recipes, sample fridge and list
requirements.txt
render.yaml            Render deployment settings
templates/index.html  Page shell (nav + three views)
static/css/style.css  All styles; palette and fonts are CSS variables at the top
static/img/bin-chicken/  The four bin chicken mood images
static/js/
  app.js              Entry point, hash routing (#fridge, #list, #recipes)
  api.js              fetch wrapper for the JSON API
  ui.js               Shared pieces: DOM helper, sheet, toast, autocomplete, stepper
  icons.js            Inline SVG icons
  fridge.js           My Fridge page, Add Item panel, item details
  list.js             My List page
  recipes.js          Recipes page: drag-and-drop pot, results, recipe book and editor
```

Layout breakpoints: up to 440 px wide is mobile (bottom tab bar, bottom sheets); wider is desktop (left sidebar, dialogs). From 900 px the fridge gets a details panel on its right.

## API

All endpoints return JSON. Errors look like `{"error": "message"}` with a 4xx status.

### Ingredients

| Method | Path | Description |
|---|---|---|
| GET | `/api/ingredients` | The ingredient dictionary (name, zone, shelf life, category). |
| GET | `/api/ingredients/match?name=` | Dictionary entry for a typed name, ignoring case and plurals, or `null`. |

### Fridge

| Method | Path | Description |
|---|---|---|
| GET | `/api/fridge` | All items, soonest expiry first. Each has `days_left` and `status` (`ok`, `soon`, `expired`). |
| POST | `/api/fridge` | Add an item. Body: `name`, `expiry` (`YYYY-MM-DD`, required), optional `zone`, `quantity`, `from_list_id` (the bought list item being stored; it is removed from the list). |
| PUT | `/api/fridge/<id>` | Edit `name`, `zone`, `expiry`, `quantity`. |
| DELETE | `/api/fridge/<id>` | Delete an item (e.g. added by mistake). Not recorded, so it never counts as waste. |
| GET | `/api/fridge/expired-check` | Items past their date that need checking now (not in a "keep for now" period). |
| POST | `/api/fridge/<id>/resolve` | Body: `action` (`eaten`, `thrown` or `keep`) and, for `keep`, `days` (1-3). Eaten and thrown remove the item and add it to the history log. Returns the item (or `null`) and the new mascot state. |
| GET | `/api/log` | History of finished items: `item_name`, `category`, `action`, `was_expiring`, `date`. |

Items have `status` `ok`, `soon`, `expired` or `kept` (past its date, user said it is still good), plus `keep_until`, `kept_days_total`, `high_risk` and `keep_options`.

### Bin chicken

| Method | Path | Description |
|---|---|---|
| GET | `/api/mascot` | `{"mood": "superhappy" \| "happy" \| "content" \| "sulky" \| "angry", "message": "..."}` |
| POST | `/api/demo/mood` | Demo only. Body: `mood`. Forces that mood. |
| POST | `/api/demo/reset` | Demo only. Reloads the seed data. |

The standing mood (what the bird on the fridge shows) is checked in this order: **superhappy** (more than 10 items eaten in a row), **happy** (more than 5 eaten in a row), **angry** (more than 3 thrown away in the last 7 days), **sulky** (1 to 3 thrown away in the last 7 days), otherwise **content**. Throwing something away resets the eaten-in-a-row count. Separately, every eaten or thrown-away item triggers a one-off reaction shown on its own card or inside the expired-check pop-up (the happy picture with a hop, or the angry picture with a shake); the bird on the fridge keeps showing the standing mood; `/resolve` returns it as `reaction`. The thresholds are constants at the top of `app.py`. Images: `content` and `happy` both use the heart picture (`bin-chicken-content.png`); `superhappy` uses the dancing picture (`bin-chicken-happy.png`) with a looping dance.

### List

| Method | Path | Description |
|---|---|---|
| GET | `/api/list` | All shopping list items. |
| GET | `/api/list/pending` | Items ticked as bought but not stored in the fridge yet. |
| POST | `/api/list` | Add an item. Body: `name`, optional `quantity`. Merges into an existing unbought entry for the same ingredient. |
| PUT | `/api/list/<id>` | Edit `name`, `quantity`, or set `bought` (`true`/`false`). |
| DELETE | `/api/list/<id>` | Delete an item. |

### Recipes

| Method | Path | Description |
|---|---|---|
| GET | `/api/recipes` | All recipes. Each ingredient is marked `have` (in the fridge) and `in_list`. |
| GET | `/api/recipes/<id>` | One recipe. |
| POST | `/api/recipes` | Create a recipe. Body: `name`, `ingredients` (list of names), `steps` (list of strings). |
| PUT | `/api/recipes/<id>` | Edit a user-created recipe. |
| DELETE | `/api/recipes/<id>` | Delete a user-created recipe. |
| POST | `/api/recipes/<id>/add-missing` | Add ingredients that are in neither the fridge nor the list to My List. Returns `{"added": [...]}`. |
| POST | `/api/recommendations` | Body: `ingredients` (names in the pot). Returns matching recipes, best first. |

### How recommendations are ranked

1. **Urgency.** Each pot ingredient a recipe uses scores `1 / (days left + 1)`, so food expiring soonest counts most. Expired food scores nothing.
2. Then by how many pot ingredients the recipe uses.
3. Then by fewest missing ingredients.

### Name matching

Ingredient names are compared case-insensitively and singular/plural-insensitively ("Tomato" = "tomatoes"), so fridge items, list items and recipe ingredients line up. See `normalize()` in `app.py`.
