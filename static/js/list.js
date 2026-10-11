// My List: the shopping list.

import { api } from './api.js';
import { icon, catIcon } from './icons.js';
import { h, state, toast, openSheet, closeSheet, nameInput, stepper, setNavBadge, qtyText } from './ui.js';

const root = document.getElementById('view-list');

export async function renderList() {
  state.list = await api.get('/list');
  setNavBadge(state.list.filter((i) => i.bought).length);
  draw();
}

function draw() {
  const toBuy = state.list.filter((i) => !i.bought);
  const bought = state.list.filter((i) => i.bought);

  const name = nameInput({ placeholder: 'Add an ingredient…', label: 'Ingredient to buy', onPick: () => add() });
  const add = async () => {
    const value = name.input.value.trim();
    if (!value) return name.input.focus();
    await api.post('/list', { name: value });
    await renderList();
    root.querySelector('.add-row input')?.focus();
  };

  root.replaceChildren(
    h('header', { class: 'page-head' },
      h('h1', null, 'My List'),
      h('p', { class: 'sub' }, `${toBuy.length} to buy · ${bought.length} bought`)),
    h('div', { class: 'list-layout' },
      h('form', { class: 'add-row', onsubmit: (e) => { e.preventDefault(); add(); } },
        name.el,
        h('button', { class: 'btn primary square', type: 'submit', 'aria-label': 'Add to list' }, icon('plus'))),

      h('section', { class: 'block' },
        h('h2', null, 'To buy'),
        toBuy.length
          ? h('ul', { class: 'rows' }, toBuy.map(rowEl))
          : h('p', { class: 'empty' }, 'Nothing to buy. Add something above, or add missing ingredients from a recipe.')),

      bought.length ? h('section', { class: 'block' },
        h('h2', null, 'Bought ', h('span', { class: 'tag soon' }, 'NOT STORED YET')),
        h('ul', { class: 'rows' }, bought.map(rowEl)),
        h('p', { class: 'hint' },
          'Put these away from the + button in My Fridge, so each one gets an expiry date. ',
          h('a', { href: '#fridge' }, 'Go to My Fridge'))) : null),
  );
}

function rowEl(item) {
  return h('li', { class: 'row' + (item.bought ? ' bought' : '') },
    h('button', {
      class: 'tick' + (item.bought ? ' on' : ''), type: 'button', role: 'checkbox',
      'aria-checked': String(item.bought), 'aria-label': `${item.name} bought`,
      onclick: async () => {
        await api.put(`/list/${item.id}`, { bought: !item.bought });
        await renderList();
      },
    }, item.bought && icon('check')),
    h('span', { class: 'row-main static' },
      catIcon(item.category),
      h('span', { class: 'row-text' }, h('strong', null, item.name, qtyText(item)))),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Edit ${item.name}`, onclick: () => openEdit(item) }, icon('edit')),
    h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': `Delete ${item.name}`,
      onclick: async () => {
        await api.del(`/list/${item.id}`);
        toast(`${item.name} removed`);
        await renderList();
      },
    }, icon('trash')));
}

function openEdit(item) {
  let quantity = item.quantity;
  const name = nameInput({ value: item.name });
  const error = h('p', { class: 'form-error', role: 'alert' });
  openSheet(
    h('form', {
      class: 'form',
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          await api.put(`/list/${item.id}`, { name: name.input.value, quantity });
          closeSheet();
          await renderList();
        } catch (err) {
          error.textContent = err.message;
        }
      },
    },
      h('label', { class: 'field' }, h('span', { class: 'label' }, 'Name'), name.el),
      h('div', { class: 'field inline' }, h('span', { class: 'label' }, 'Quantity'), stepper(quantity, (v) => { quantity = v; })),
      error,
      h('button', { class: 'btn primary wide', type: 'submit' }, 'Save changes')),
    { title: 'Edit list item' });
}
