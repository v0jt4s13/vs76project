// Elementy, które pojawiają się przy przewijaniu. Każdy dostaje klasę .reveal, a stan ukryty w CSS musi dotyczyć wyłącznie
// elementów z tej listy (szablon, który chowa element spoza listy, zostawiłby go niewidocznym). Pilnuje tego tests/motion-reveal.test.mjs.
const REVEAL = '.section-intro,.section-heading,.principle-line span,.training-row,.course,.service-list li,.process-list li,.content-block,.article-row,.download-line,.contact-band-inner,.consulting-inner,.knowledge>*,.faq,.prose h2,.course-sidebar,.footer-grid>div';
const EXPAND_MS = 900;
const HOLD_MS = 4000;

function reveal() {
 const items = Array.from(document.querySelectorAll<HTMLElement>(REVEAL));
 const seen = new Map<Element, number>();
 for (const el of items) {
  const n = seen.get(el.parentElement as Element) || 0;
  seen.set(el.parentElement as Element, n + 1);
  el.classList.add('reveal');
  el.style.setProperty('--d', `${Math.min(n, 5) * 80}ms`);
 }
 const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
 }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
 items.forEach((el) => observer.observe(el));
}

function poster() {
 const box = document.querySelector<HTMLElement>('.brand-poster');
 const cells = box ? Array.from(box.querySelectorAll<HTMLElement>('.poster-cell')) : [];
 if (!box || cells.length === 0) return;
 let position = 0;
 let active: HTMLElement | null = null;
 let timer = 0;
 let visible = true;
 const measure = (cell: HTMLElement) => {
  const b = box.getBoundingClientRect(), c = cell.getBoundingClientRect();
  cell.style.setProperty('--t', `${c.top - b.top}px`);
  cell.style.setProperty('--l', `${c.left - b.left}px`);
  cell.style.setProperty('--r', `${b.right - c.right}px`);
  cell.style.setProperty('--b', `${b.bottom - c.bottom}px`);
  cell.style.setProperty('--pw', `${b.width}px`);
  cell.style.setProperty('--ph', `${b.height}px`);
 };
 const open = () => {
  active = cells[position];
  measure(active);
  active.classList.add('is-active');
  timer = window.setTimeout(close, EXPAND_MS + HOLD_MS);
 };
 const close = () => {
  active?.classList.remove('is-active');
  active = null;
  position = (position + 1) % cells.length;
  timer = window.setTimeout(open, EXPAND_MS);
 };
 const controls = box.querySelector<HTMLElement>('[data-poster-controls]');
 const toggle = box.querySelector<HTMLButtonElement>('[data-poster-toggle]');
 let paused = false;
 const reset = () => { window.clearTimeout(timer); active?.classList.remove('is-active'); active = null; };
 const sync = () => {
  if (paused) return;
  reset();
  if (visible && !document.hidden) timer = window.setTimeout(open, EXPAND_MS);
 };
 const setPaused = (value: boolean) => {
  if (paused === value) return;
  paused = value;
  toggle?.classList.toggle('is-paused', paused);
  toggle?.setAttribute('aria-label', paused ? 'Wznów animację plakatu' : 'Wstrzymaj animację plakatu');
  if (paused) { window.clearTimeout(timer); return; } // bieżąca klatka zostaje widoczna
  window.clearTimeout(timer);
  timer = window.setTimeout(active ? close : open, active ? HOLD_MS : 0);
 };
 toggle?.addEventListener('click', () => setPaused(!paused));
 if (controls) controls.hidden = false;
 new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.3 }).observe(box);
 document.addEventListener('visibilitychange', sync);
 window.addEventListener('resize', () => { if (active) measure(active); });
}

try {
 if (typeof IntersectionObserver === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.dataset.motion = 'ready';
  reveal();
  poster();
 }
} catch {
 document.documentElement.classList.remove('js-motion');
}
