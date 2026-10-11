// Recipes: drag fridge food into the pot, cook, and browse the recipe book.

import { api } from './api.js';
import { icon, catIcon } from './icons.js';
import { h, state, toast, openSheet, closeSheet, nameInput, daysLabel, statusTag } from './ui.js';

const root = document.getElementById('view-recipes');
const COOK_MS = 1100;

let pot = [];        // [{ key, name, category }]
let results = null;  // null until the first Cook
let cooking = false;

export async function renderRecipes() {
  [state.fridge, state.recipes] = await Promise.all([api.get('/fridge'), api.get('/recipes')]);
  const keys = new Set(state.fridge.map((i) => i.key));
  pot = pot.filter((p) => keys.has(p.key));
  draw();
}

// One chip per ingredient, soonest to expire first; expired food goes last.
function fridgeIngredients() {
  const rank = (i) => (i.days_left < 0 ? 100000 - i.days_left : i.days_left);
  const byKey = new Map();
  for (const item of state.fridge) {
    const current = byKey.get(item.key);
    if (!current || rank(item) < rank(current)) byKey.set(item.key, item);
  }
  return [...byKey.values()].sort((a, b) => rank(a) - rank(b));
}

// ---------------------------------------------------------------- page

function draw() {
  const inPot = new Set(pot.map((p) => p.key));
  const items = fridgeIngredients();

  root.replaceChildren(
    h('header', { class: 'page-head with-action' },
      h('div', null, h('h1', null, 'Recipes'), h('p', { class: 'sub' }, 'Drag food into the pot, then cook.')),
      h('button', { class: 'btn', type: 'button', onclick: () => openEditor() }, icon('plus'), 'New recipe')),
    h('div', { class: 'recipes-layout' },
      h('div', { class: 'cook-col' },
        h('div', { class: 'stove' + (cooking ? ' cooking' : '') },
          h('div', { class: 'pot', id: 'pot' },
            h('i', { class: 'pot-handle left' }), h('i', { class: 'pot-handle right' }),
            pot.length ? pot.map(potChip) : h('p', { class: 'pot-hint' }, 'Drag food in here')),
          h('div', { class: 'flames', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map(() => icon('flame'))),
          h('div', { class: 'burner' })),
        h('button', { class: 'btn fire wide cook-btn', type: 'button', disabled: cooking, onclick: cook },
          icon('flame'), cooking ? 'Cooking…' : 'Cook'),
        h('section', { class: 'block' },
          h('h2', null, 'In your fridge'),
          h('p', { class: 'sub' }, 'Eat-soon food comes first. Drag it into the pot, or tap it.'),
          items.length
            ? h('div', { class: 'drag-grid' }, items.map((i) => fridgeChip(i, inPot.has(i.key))))
            : h('p', { class: 'empty' }, 'Your fridge is empty. Add food in My Fridge first.'))),
      h('div', { class: 'book-col' }, resultsSection(), bookSection())),
  );
}

function fridgeChip(item, used) {
  const el = h('button', {
    class: `chip drag ${item.status}` + (used ? ' used' : ''), type: 'button', disabled: used,
    'aria-label': used ? `${item.name}, already in the pot` : `Add ${item.name} to the pot`,
    onclick: () => { if (!el.dataset.dragged) addToPot(item); },
  },
    catIcon(item.category),
    h('span', { class: 'chip-name' }, item.name),
    used ? h('span', { class: 'chip-days' }, 'In pot') : h('span', { class: 'chip-days' }, daysLabel(item)),
    !used && statusTag(item));
  if (!used) makeDraggable(el, (overPot) => { if (overPot) addToPot(item); });
  return el;
}

function potChip(p) {
  const el = h('span', { class: 'chip in-pot' },
    catIcon(p.category),
    h('span', { class: 'chip-name' }, p.name),
    h('button', { class: 'chip-x', type: 'button', 'aria-label': `Take ${p.name} out of the pot`,
      onclick: () => removeFromPot(p.key) }, icon('x')));
  makeDraggable(el, (overPot) => { if (!overPot) removeFromPot(p.key); });
  return el;
}

function addToPot(item) {
  if (pot.some((p) => p.key === item.key)) return;
  pot.push({ key: item.key, name: item.name, category: item.category });
  draw();
}

function removeFromPot(key) {
  pot = pot.filter((p) => p.key !== key);
  draw();
}

// ---------------------------------------------------------------- drag and drop
// Pointer events so the same code handles mouse, touch and pen.

function makeDraggable(el, onDrop) {
  el.addEventListener('pointerdown', (down) => {
    if (down.pointerType === 'mouse' && down.button !== 0) return;
    if (down.target.closest('.chip-x')) return;

    const potEl = document.getElementById('pot');
    const overPot = (e) => {
      const r = potEl.getBoundingClientRect();
      return e.clientX > r.left - 16 && e.clientX < r.right + 16 && e.clientY > r.top - 24 && e.clientY < r.bottom + 16;
    };
    let ghost = null;
    let last = down;
    let scrollTimer = null;

    const place = (e) => {
      ghost.style.transform = `translate(${e.clientX - ghost.offsetWidth / 2}px, ${e.clientY - ghost.offsetHeight / 2}px) rotate(-4deg)`;
      potEl.classList.toggle('over', overPot(e));
    };
    const start = () => {
      el.setPointerCapture(down.pointerId);
      ghost = el.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = `${el.offsetWidth}px`;
      document.body.append(ghost);
      el.classList.add('dragging');
      // Nudge the page when dragging near its top or bottom edge, so the pot stays reachable.
      scrollTimer = setInterval(() => {
        const dy = last.clientY < 70 ? -14 : last.clientY > window.innerHeight - 110 ? 14 : 0;
        if (dy) { window.scrollBy(0, dy); place(last); }
      }, 16);
    };
    const move = (e) => {
      last = e;
      if (!ghost) {
        if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < 6) return;
        start();
      }
      place(e);
    };
    const end = (e) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      if (!ghost) return; // a plain tap: the click handler deals with it
      clearInterval(scrollTimer);
      ghost.remove();
      el.classList.remove('dragging');
      potEl.classList.remove('over');
      // Swallow the click that follows a drag.
      el.dataset.dragged = '1';
      setTimeout(() => delete el.dataset.dragged, 0);
      onDrop(e.type === 'pointerup' && overPot(e));
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });
}

// ---------------------------------------------------------------- cooking

const recommend = () => api.post('/recommendations', { ingredients: pot.map((p) => p.name) });

async function cook() {
  if (!pot.length) return toast('Drag something into the pot first');
  cooking = true;
  draw();
  try {
    // Let the flames play even when the server answers instantly.
    [results] = await Promise.all([recommend(), new Promise((r) => setTimeout(r, COOK_MS))]);
  } finally {
    cooking = false;
    draw();
  }
  document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resultsSection() {
  if (results === null) return null;
  return h('section', { class: 'block', id: 'results' },
    h('h2', null, 'You could make'),
    results.length
      ? h('div', { class: 'cards' }, results.map(resultCard))
      : h('p', { class: 'empty' }, 'No recipes use those yet. Try other ingredients, or write your own recipe.'));
}

function resultCard(r) {
  return h('article', { class: 'recipe-card' },
    h('h3', null, r.name),
    h('p', { class: 'sub' },
      `Uses ${r.used.length} of ${pot.length} in your pot`,
      r.uses_soon.length ? [' · uses up ', h('strong', null, r.uses_soon.join(', '))] : null),
    ingredientGroups(r),
    h('div', { class: 'card-actions' },
      addMissingButton(r),
      h('button', { class: 'btn', type: 'button', onclick: () => openDetail(r.id) }, 'View recipe')));
}

function ingredientGroups(r) {
  const chip = (i) => h('li', { class: i.have ? 'have' : 'need' }, i.have && icon('check'), i.name, !i.have && i.in_list ? ' (on list)' : '');
  const have = r.ingredients.filter((i) => i.have);
  const missing = r.ingredients.filter((i) => !i.have);
  return h('div', { class: 'ing-groups' },
    have.length ? [h('span', { class: 'label' }, 'You have'), h('ul', { class: 'ings' }, have.map(chip))] : null,
    missing.length ? [h('span', { class: 'label' }, 'Missing'), h('ul', { class: 'ings' }, missing.map(chip))] : null);
}

function addMissingButton(r, after) {
  const toAdd = r.ingredients.filter((i) => !i.have && !i.in_list).length;
  if (!r.missing.length) return h('p', { class: 'all-set' }, icon('check'), 'You have everything');
  if (!toAdd) return h('p', { class: 'all-set' }, icon('bag'), 'Missing items are on My List');
  return h('button', {
    class: 'btn primary', type: 'button',
    onclick: async () => {
      const { added } = await api.post(`/recipes/${r.id}/add-missing`);
      toast(`Added to My List: ${added.join(', ')}`);
      if (results) results = await recommend();
      await renderRecipes();
      after?.();
    },
  }, icon('bag'), 'Add missing ingredients to My List');
}

// ---------------------------------------------------------------- recipe book

function bookSection() {
  return h('section', { class: 'block' },
    h('h2', null, 'Recipe book'),
    h('ul', { class: 'rows' }, state.recipes.map((r) =>
      h('li', { class: 'row' },
        h('button', { class: 'row-main', type: 'button', onclick: () => openDetail(r.id) },
          h('span', { class: 'row-text' },
            h('strong', null, r.name),
            h('small', null, `You have ${r.have.length} of ${r.ingredients.length} ingredients`, r.minutes ? ` · ${r.minutes} min` : '')),
          r.custom && h('span', { class: 'tag' }, 'YOURS'),
          icon('chevron'))))));
}

function openDetail(id) {
  const r = state.recipes.find((x) => x.id === id);
  if (!r) return closeSheet();
  openSheet(
    h('div', { class: 'recipe-detail' },
      r.minutes && h('p', { class: 'sub' }, `About ${r.minutes} minutes`),
      h('h3', null, 'Ingredients'),
      ingredientGroups(r),
      addMissingButton(r, () => openDetail(id)),
      h('h3', null, 'Steps'),
      r.steps.length ? h('ol', { class: 'steps' }, r.steps.map((s) => h('li', null, s))) : h('p', { class: 'empty' }, 'No steps written yet.'),
      r.custom && h('div', { class: 'detail-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => openEditor(r) }, icon('edit'), 'Edit'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            await api.del(`/recipes/${r.id}`);
            toast(`${r.name} deleted`);
            closeSheet();
            if (results) results = await recommend();
            await renderRecipes();
          },
        }, icon('trash'), 'Delete'))),
    { title: r.name });
}

// ---------------------------------------------------------------- create / edit your own recipe

function openEditor(recipe = null) {
  let ingredients = recipe ? recipe.ingredients.map((i) => i.name) : [];
  const nameField = h('input', { class: 'input', type: 'text', maxlength: 60, value: recipe?.name || '', placeholder: 'e.g. Midnight noodles' });
  const steps = h('textarea', { class: 'input', rows: 5, placeholder: 'One step per line' }, recipe ? recipe.steps.join('\n') : '');
  const chosen = h('ul', { class: 'ings editable' });
  const error = h('p', { class: 'form-error', role: 'alert' });

  const paint = () => chosen.replaceChildren(...ingredients.map((n, idx) =>
    h('li', { class: 'have' }, n,
      h('button', { class: 'chip-x', type: 'button', 'aria-label': `Remove ${n}`,
        onclick: () => { ingredients.splice(idx, 1); paint(); } }, icon('x')))));

  const ing = nameInput({ placeholder: 'Add an ingredient…', label: 'Ingredient', onPick: () => addIngredient() });
  const addIngredient = () => {
    const value = ing.input.value.trim();
    if (!value) return;
    if (!ingredients.some((n) => n.toLowerCase() === value.toLowerCase())) ingredients.push(value);
    ing.input.value = '';
    paint();
    ing.input.focus();
  };
  ing.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.defaultPrevented) { e.preventDefault(); addIngredient(); }
  });

  paint();
  openSheet(
    h('form', {
      class: 'form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        addIngredient(); // include anything still sitting in the ingredient box
        const data = { name: nameField.value, ingredients, steps: steps.value.split('\n') };
        try {
          const saved = recipe ? await api.put(`/recipes/${recipe.id}`, data) : await api.post('/recipes', data);
          toast(`${saved.name} saved`);
          if (results) results = await recommend();
          await renderRecipes();
          openDetail(saved.id);
        } catch (err) {
          error.textContent = err.message;
        }
      },
    },
      h('label', { class: 'field' }, h('span', { class: 'label' }, 'Recipe name'), nameField),
      h('div', { class: 'field' },
        h('span', { class: 'label' }, 'Ingredients'),
        h('div', { class: 'add-row' }, ing.el,
          h('button', { class: 'btn square', type: 'button', 'aria-label': 'Add ingredient', onclick: addIngredient }, icon('plus'))),
        chosen),
      h('label', { class: 'field' }, h('span', { class: 'label' }, 'Steps'), steps),
      error,
      h('button', { class: 'btn primary wide', type: 'submit' }, recipe ? 'Save changes' : 'Save recipe')),
    { title: recipe ? 'Edit recipe' : 'New recipe' });
}
