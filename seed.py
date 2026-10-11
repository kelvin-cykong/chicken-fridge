"""Seed data loaded into memory on startup."""

# (name, default zone, default shelf life in days, category)
# Categories: veg, fruit, meat, dairy, grain, drink, other
INGREDIENTS = [
    # Chilled
    ("Milk", "chilled", 7, "dairy"),
    ("Egg", "chilled", 21, "dairy"),
    ("Butter", "chilled", 30, "dairy"),
    ("Cheese", "chilled", 21, "dairy"),
    ("Yogurt", "chilled", 10, "dairy"),
    ("Cream", "chilled", 7, "dairy"),
    ("Chicken breast", "chilled", 3, "meat"),
    ("Minced beef", "chilled", 3, "meat"),
    ("Bacon", "chilled", 7, "meat"),
    ("Sausage", "chilled", 5, "meat"),
    ("Ham", "chilled", 5, "meat"),
    ("Salmon", "chilled", 2, "meat"),
    ("Tofu", "chilled", 7, "other"),
    ("Hummus", "chilled", 7, "other"),
    ("Lettuce", "chilled", 5, "veg"),
    ("Spinach", "chilled", 4, "veg"),
    ("Tomato", "chilled", 7, "veg"),
    ("Cucumber", "chilled", 7, "veg"),
    ("Carrot", "chilled", 21, "veg"),
    ("Bell pepper", "chilled", 7, "veg"),
    ("Broccoli", "chilled", 5, "veg"),
    ("Mushroom", "chilled", 5, "veg"),
    ("Courgette", "chilled", 7, "veg"),
    ("Spring onion", "chilled", 7, "veg"),
    ("Lemon", "chilled", 21, "fruit"),
    ("Strawberry", "chilled", 4, "fruit"),
    ("Grapes", "chilled", 7, "fruit"),
    ("Orange juice", "chilled", 7, "drink"),
    # Pantry
    ("Bread", "pantry", 5, "grain"),
    ("Rice", "pantry", 365, "grain"),
    ("Pasta", "pantry", 365, "grain"),
    ("Noodles", "pantry", 180, "grain"),
    ("Oats", "pantry", 180, "grain"),
    ("Cereal", "pantry", 90, "grain"),
    ("Flour", "pantry", 180, "grain"),
    ("Tortilla wrap", "pantry", 14, "grain"),
    ("Potato", "pantry", 21, "veg"),
    ("Onion", "pantry", 30, "veg"),
    ("Garlic", "pantry", 30, "veg"),
    ("Banana", "pantry", 5, "fruit"),
    ("Apple", "pantry", 14, "fruit"),
    ("Avocado", "pantry", 4, "fruit"),
    ("Canned tomatoes", "pantry", 365, "other"),
    ("Canned beans", "pantry", 365, "other"),
    ("Canned tuna", "pantry", 365, "other"),
    ("Lentils", "pantry", 365, "other"),
    ("Coconut milk", "pantry", 365, "other"),
    ("Peanut butter", "pantry", 90, "other"),
    ("Soy sauce", "pantry", 365, "other"),
    ("Olive oil", "pantry", 365, "other"),
    # Frozen
    ("Peas", "frozen", 90, "veg"),
    ("Sweetcorn", "frozen", 90, "veg"),
    ("Berries", "frozen", 90, "fruit"),
    ("Fish fingers", "frozen", 90, "meat"),
    ("Frozen pizza", "frozen", 60, "other"),
    ("Ice cream", "frozen", 60, "dairy"),
]

RECIPES = [
    {
        "name": "Tomato Egg Stir-fry",
        "minutes": 15,
        "ingredients": ["Tomato", "Egg", "Spring onion", "Rice"],
        "steps": [
            "Put the rice on to cook.",
            "Beat the eggs with a pinch of salt. Scramble them softly in a hot oiled pan, then tip them out.",
            "Fry chopped tomatoes in the same pan until they collapse into a sauce.",
            "Stir the eggs back in, scatter over sliced spring onion and serve on the rice.",
        ],
    },
    {
        "name": "Veggie Fried Rice",
        "minutes": 20,
        "ingredients": ["Rice", "Egg", "Carrot", "Peas", "Spring onion", "Soy sauce"],
        "steps": [
            "Cook the rice and let it cool (leftover rice is even better).",
            "Fry diced carrot in oil for 3 minutes, then add the peas.",
            "Push the veg aside, scramble the eggs in the gap, then mix together.",
            "Add the rice and soy sauce and fry on high heat until hot. Top with spring onion.",
        ],
    },
    {
        "name": "Creamy Mushroom Pasta",
        "minutes": 20,
        "ingredients": ["Pasta", "Mushroom", "Garlic", "Cream", "Cheese"],
        "steps": [
            "Boil the pasta in salted water.",
            "Fry sliced mushrooms until golden, then add chopped garlic for 1 minute.",
            "Pour in the cream and a splash of pasta water and simmer for 2 minutes.",
            "Toss with the drained pasta and grated cheese.",
        ],
    },
    {
        "name": "Chicken & Broccoli Stir-fry",
        "minutes": 25,
        "ingredients": ["Chicken breast", "Broccoli", "Garlic", "Soy sauce", "Rice"],
        "steps": [
            "Put the rice on to cook.",
            "Slice the chicken and fry in hot oil until browned and cooked through.",
            "Add broccoli florets, garlic and a splash of water. Cover for 3 minutes.",
            "Stir in the soy sauce and serve on the rice.",
        ],
    },
    {
        "name": "Cheesy Spinach Omelette",
        "minutes": 10,
        "ingredients": ["Egg", "Cheese", "Milk", "Spinach"],
        "steps": [
            "Beat the eggs with a splash of milk, salt and pepper.",
            "Wilt the spinach in a buttered pan for 1 minute.",
            "Pour the eggs over and cook gently until almost set.",
            "Add grated cheese, fold in half and serve.",
        ],
    },
    {
        "name": "Tuna Pasta Bake",
        "minutes": 35,
        "ingredients": ["Pasta", "Canned tuna", "Canned tomatoes", "Cheese", "Onion"],
        "steps": [
            "Boil the pasta until just tender and heat the oven to 200°C.",
            "Soften chopped onion in oil, add the canned tomatoes and simmer for 5 minutes.",
            "Mix the sauce, drained tuna and pasta in an oven dish.",
            "Cover with grated cheese and bake for 15 minutes until golden.",
        ],
    },
    {
        "name": "Bean Chilli",
        "minutes": 40,
        "ingredients": ["Minced beef", "Canned beans", "Canned tomatoes", "Onion", "Garlic", "Rice"],
        "steps": [
            "Fry chopped onion and garlic until soft, then brown the mince.",
            "Add the canned tomatoes, drained beans and chilli powder to taste.",
            "Simmer for 25 minutes, stirring now and then.",
            "Serve with rice.",
        ],
    },
    {
        "name": "Avocado Toast with Egg",
        "minutes": 10,
        "ingredients": ["Bread", "Avocado", "Egg", "Lemon"],
        "steps": [
            "Toast the bread.",
            "Mash the avocado with a squeeze of lemon, salt and pepper.",
            "Fry or poach the egg.",
            "Spread the avocado on the toast and top with the egg.",
        ],
    },
    {
        "name": "Banana Oat Pancakes",
        "minutes": 15,
        "ingredients": ["Banana", "Oats", "Egg", "Milk"],
        "steps": [
            "Mash the banana, then mix in the oats, egg and a splash of milk.",
            "Leave the batter for 5 minutes to thicken.",
            "Fry spoonfuls in a lightly oiled pan, 2 minutes each side.",
        ],
    },
    {
        "name": "Chicken Salad Wrap",
        "minutes": 20,
        "ingredients": ["Tortilla wrap", "Chicken breast", "Lettuce", "Tomato", "Yogurt"],
        "steps": [
            "Slice the chicken, season it and fry until cooked through.",
            "Shred the lettuce and chop the tomato.",
            "Spread yogurt over the wrap, pile on the chicken and salad, and roll it up.",
        ],
    },
]

# (name, zone, days until expiry from today, quantity)
SAMPLE_FRIDGE = [
    ("Bread", "pantry", -2, 1),
    ("Banana", "pantry", 3, 4),
    ("Onion", "pantry", 20, 3),
    ("Rice", "pantry", 200, 1),
    ("Pasta", "pantry", 300, 2),
    ("Chicken breast", "chilled", -1, 2),
    ("Spinach", "chilled", 1, 1),
    ("Milk", "chilled", 2, 1),
    ("Yogurt", "chilled", 6, 1),
    ("Tomato", "chilled", 5, 4),
    ("Egg", "chilled", 12, 6),
    ("Cheese", "chilled", 15, 1),
    ("Ice cream", "frozen", 40, 1),
    ("Peas", "frozen", 60, 1),
    ("Berries", "frozen", 80, 1),
]

# Finished items: (name, action, was expiring soon or past its date, days ago)
SAMPLE_HISTORY = [
    ("Lettuce", "thrown", True, 3),
]

# (name, quantity, bought)
SAMPLE_LIST = [
    ("Garlic", 1, False),
    ("Carrot", 3, False),
    ("Broccoli", 1, True),
    ("Mushroom", 1, True),
]
