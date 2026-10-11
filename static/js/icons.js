// Hand-drawn inline SVG icons: 24px grid, 2px ink outline, palette fills only.

const ICONS = {
  // Navigation
  fridge: '<rect x="5" y="2.5" width="14" height="19" rx="2.5" fill="var(--ice)"/><path d="M5 9.5h14M8.5 5.5v1.5M8.5 12.5v3"/>',
  list: '<rect x="5" y="4" width="14" height="17" rx="2" fill="var(--wheat)"/><rect x="9" y="2.5" width="6" height="3.5" rx="1" fill="var(--white)"/><path d="M8.5 11l1.2 1.2 2-2.4M14.5 11H16M8.5 16l1.2 1.2 2-2.4M14.5 16H16"/>',
  pot: '<path d="M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="var(--mint)"/><path d="M3 10h18M2.5 13.5H5M19 13.5h2.5M9.5 6.5c0-1.2 1-1.2 1-2.5M14 6.5c0-1.2 1-1.2 1-2.5"/>',

  // Actions
  plus: '<path d="M12 5v14M5 12h14" stroke-width="2.6"/>',
  minus: '<path d="M5 12h14" stroke-width="2.6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  edit: '<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z" fill="var(--wheat)"/><path d="M14 6.5l3.5 3.5"/>',
  trash: '<path d="M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="var(--white)"/><path d="M4 7h16M9.5 7V4.5h5V7M10 11v6M14 11v6"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2" fill="var(--white)"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  bag: '<path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" fill="var(--wheat)"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  flame: '<path d="M12 2.5c1 3.5 5.5 5.5 5.5 11a5.500 5.500 0 0 1-11 0c0-2.500 1.200-4 2.500-5.200.300 1.600 1 2.400 2 2.900-.500-3 .200-6.200 1-8.700z" fill="var(--tomato)"/><path d="M12 14.500c.800 1 1.800 1.600 1.800 3.200a1.800 1.800 0 0 1-3.600 0c0-1.300.900-2 1.800-3.200z" fill="var(--wheat)"/>',

  // Food categories
  veg: '<path d="M12 9.500c-3.500-.500-4.500-3-3.500-6 2.500.500 3.500 3 3.500 6zM12 9.500c3.500-.500 4.500-3 3.500-6-2.500.500-3.500 3-3.500 6z" fill="var(--mint)"/><path d="M7.500 9.500h9L12.800 21a.850.850 0 0 1-1.600 0z" fill="var(--tomato)"/><path d="M10 13h2M11.500 16.500h1.500"/>',
  fruit: '<path d="M12 8.500c-2.200-1.800-7-1-7 4 0 4.500 2.800 8.500 5 8.500.900 0 1.200-.500 2-.500s1.100.500 2 .500c2.200 0 5-4 5-8.500 0-5-4.800-5.800-7-4z" fill="var(--tomato)"/><path d="M12 8.500c0-2 .500-3.500 1.500-5"/><path d="M13.500 5.500c1-2 3-2.500 5-2-.500 2-2.500 3-5 2z" fill="var(--mint)"/>',
  meat: '<path d="M14.500 3a6.500 6.500 0 0 1 6.500 6.500c0 4-3.800 7-8 7-1.500 0-2.500.300-3.500 1.200L7.300 15.500c.900-1 1.200-2 1.200-3.500 0-4.200 2-9 6-9z" fill="var(--wheat)"/><path d="M8.400 16.600l-2.700 2.700"/><circle cx="4.300" cy="18.300" r="1.600" fill="var(--white)"/><circle cx="6.200" cy="20.200" r="1.600" fill="var(--white)"/>',
  dairy: '<path d="M7 9.500l2-5.500h6l2 5.500V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="var(--white)"/><path d="M7 13h10v4.500H7z" fill="var(--ice)"/><path d="M7 9.500h10M9 4V2.500h6V4"/>',
  grain: '<path d="M3.500 10.500c0-3 3.500-5 8.500-5s8.500 2 8.500 5c0 1.400-.800 2.300-2 2.800V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-5.700c-1.200-.500-2-1.400-2-2.800z" fill="var(--wheat)"/><path d="M9.500 10.500v2M14.500 10.500v2"/>',
  drink: '<path d="M6.500 8h11l-1.200 12.100a1 1 0 0 1-1 .900H8.700a1 1 0 0 1-1-.900z" fill="var(--ice)"/><path d="M7 12.500h10M12.500 8l1.800-5.500h3.200"/>',
  other: '<rect x="5.500" y="8.500" width="13" height="12.500" rx="2" fill="var(--mint)"/><rect x="7" y="3.500" width="10" height="5" rx="1" fill="var(--wheat)"/><path d="M9 13.500h6M9 16.500h3.500"/>',
};

export function icon(name, className = '') {
  const span = document.createElement('span');
  span.className = `icon ${className}`.trim();
  span.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.other}</svg>`;
  return span;
}

export const catIcon = (category) => icon(category in ICONS ? category : 'other', 'cat');
