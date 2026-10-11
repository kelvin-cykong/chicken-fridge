// Entry point: hash routing between the three pages.

import { api } from './api.js';
import { icon } from './icons.js';
import { state, toast, closeSheet } from './ui.js';
import { renderFridge, drawFridge } from './fridge.js';
import { renderList } from './list.js';
import { renderRecipes } from './recipes.js';

const VIEWS = { fridge: renderFridge, list: renderList, recipes: renderRecipes };
const currentView = () => (location.hash.slice(1) in VIEWS ? location.hash.slice(1) : 'fridge');

async function route() {
  const name = currentView();
  closeSheet();
  for (const link of document.querySelectorAll('.nav a')) {
    if (link.dataset.view === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  await VIEWS[name]();
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${name}`;
  // The fridge measures its shelves, so lay it out again once it is visible.
  if (name === 'fridge') drawFridge();
  window.scrollTo(0, 0);
}

for (const slot of document.querySelectorAll('[data-icon]')) slot.append(icon(slot.dataset.icon));

window.addEventListener('unhandledrejection', (e) => toast(e.reason?.message || 'Something went wrong'));
window.addEventListener('hashchange', route);

// Shelf columns depend on width; re-lay the fridge when it changes.
let lastWidth = window.innerWidth;
let resizeTimer;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (currentView() === 'fridge') drawFridge(); }, 120);
});

state.dict = await api.get('/ingredients');
route();
