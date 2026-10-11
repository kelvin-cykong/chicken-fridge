// Shared state and small UI building blocks used by every page.

import { icon, catIcon } from './icons.js';

export const state = { dict: [], fridge: [], pending: [], list: [], recipes: [], mascot: null };

export const ZONES = ['pantry', 'chilled', 'frozen'];
export const ZONE_LABEL = { pantry: 'Pantry', chilled: 'Chilled', frozen: 'Frozen' };

// ---------------------------------------------------------------- DOM

const PROPS = new Set(['value', 'checked', 'disabled', 'hidden']);

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : String(kid));
  }
  return el;
}

// ---------------------------------------------------------------- dates & labels

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}

export const fmtDate = (isoDate) =>
  new Date(isoDate + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function daysLabel(item) {
  const d = item.days_left;
  if (d < 0) return `${-d}d ago`;
  if (d === 0) return 'Today';
  if (d < 60) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return '1y+';
}

export function daysLong(item) {
  const d = item.days_left;
  if (item.status === 'kept') return `Past its date, check again ${fmtDate(item.keep_until)}`;
  if (d < 0) return `Expired ${-d} ${d === -1 ? 'day' : 'days'} ago`;
  if (d === 0) return 'Use today';
  return `${d} ${d === 1 ? 'day' : 'days'} left`;
}

export function statusTag(item) {
  if (item.status === 'soon') return h('span', { class: 'tag soon' }, 'SOON');
  if (item.status === 'expired') return h('span', { class: 'tag expired' }, 'EXPIRED');
  if (item.status === 'kept') return h('span', { class: 'tag kept' }, 'PAST DATE');
  return null;
}

export const qtyText = (item) => (item.quantity > 1 ? ` ×${item.quantity}` : '');

// ---------------------------------------------------------------- toast

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------- nav badge

export function setNavBadge(count) {
  const link = document.querySelector('.nav a[data-view="fridge"]');
  link.querySelector('.nav-dot')?.remove();
  if (count > 0) link.querySelector('.nav-icon').append(h('span', { class: 'nav-dot', 'aria-label': `${count} to store` }));
}

// ---------------------------------------------------------------- sheet
// Slides up from the bottom on mobile, centred dialog on desktop.

const sheetRoot = document.getElementById('sheet-root');
let sheetOnClose = null;
let sheetToken = 0;

export const sheetIsOpen = () => sheetRoot.classList.contains('open');

export function openSheet(content, { title, onClose } = {}) {
  const wasOpen = sheetIsOpen();
  sheetToken++;
  sheetOnClose = onClose || null;
  sheetRoot.replaceChildren(
    h('div', { class: 'backdrop', onclick: closeSheet }),
    h('div', { class: 'sheet' + (wasOpen ? ' no-anim' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', { class: 'sheet-head' },
        h('h2', null, title),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: closeSheet }, icon('x'))),
      h('div', { class: 'sheet-body' }, content)),
  );
  sheetRoot.classList.remove('closing');
  sheetRoot.classList.add('open');
}

export function closeSheet() {
  if (!sheetIsOpen()) return;
  const token = ++sheetToken;
  sheetRoot.classList.add('closing');
  sheetRoot.classList.remove('open');
  const onClose = sheetOnClose;
  sheetOnClose = null;
  onClose?.();
  setTimeout(() => {
    if (token !== sheetToken) return;
    sheetRoot.classList.remove('closing');
    sheetRoot.replaceChildren();
  }, 180);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
});

// ---------------------------------------------------------------- ingredient name input
// Text input with autocomplete from the ingredient dictionary. Free text is still allowed.

export function nameInput({ value = '', placeholder = '', label = 'Name', onPick } = {}) {
  const input = h('input', {
    class: 'input', type: 'text', value, placeholder, maxlength: 60,
    autocomplete: 'off', autocapitalize: 'words', 'aria-label': label, 'aria-autocomplete': 'list',
  });
  const menu = h('ul', { class: 'ac-menu', role: 'listbox', hidden: true });
  const el = h('div', { class: 'ac' }, input, menu);
  let options = [];
  let active = -1;

  const close = () => {
    menu.hidden = true;
    active = -1;
  };
  const pick = (entry) => {
    input.value = entry.name;
    close();
    onPick?.(entry);
  };
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    options = !q ? [] : state.dict
      .filter((d) => d.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q))
      .slice(0, 6);
    menu.replaceChildren(...options.map((d, i) =>
      h('li', {
        class: 'ac-opt' + (i === active ? ' active' : ''), role: 'option', 'aria-selected': String(i === active),
        // pointerdown, not click: fires before the input's blur closes the menu
        onpointerdown: (e) => { e.preventDefault(); pick(d); },
      }, catIcon(d.category), h('span', null, d.name), h('small', null, ZONE_LABEL[d.zone]))));
    menu.hidden = !options.length;
  };

  input.addEventListener('input', () => { active = -1; draw(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      draw();
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });
  return { el, input };
}

// ---------------------------------------------------------------- quantity stepper

export function stepper(value, onChange, label = 'Quantity') {
  const out = h('output', { 'aria-live': 'polite' }, String(value));
  const set = (next) => {
    value = Math.max(1, Math.min(99, next));
    out.textContent = String(value);
    onChange(value);
  };
  return h('div', { class: 'stepper', role: 'group', 'aria-label': label },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'One fewer', onclick: () => set(value - 1) }, icon('minus')),
    out,
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'One more', onclick: () => set(value + 1) }, icon('plus')));
}
