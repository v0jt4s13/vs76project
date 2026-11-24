// Menu mobilne szablonu "starter": przycisk, Escape, zamykanie po kliknięciu i po powiększeniu okna.
const button = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.querySelector<HTMLElement>('#navigation');
if (button && nav) {
  const set = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    nav.classList.toggle('is-open', open);
  };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') { set(false); button.focus(); } });
  document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.site-header')) set(false); });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) set(false); });
}
