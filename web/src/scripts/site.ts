import { nextTheme, topics, createInquiry, mailtoUrl } from './contact-utils.mjs';
const themeButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
let theme = document.documentElement.dataset.theme || 'auto';
const labels: Record<string,string> = { auto:'Auto',light:'Jasny',dark:'Ciemny' };
function renderTheme() {
 if (theme === 'auto') delete document.documentElement.dataset.theme;
 else document.documentElement.dataset.theme = theme;
 if (themeButton) { if (themeButton.dataset?.themeIcon === undefined) themeButton.textContent = `Motyw: ${labels[theme]}`; themeButton.setAttribute('aria-label',themeButton.dataset?.themeIcon!==undefined?(((theme==='auto'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme)==='dark')?'Włącz jasny motyw':'Włącz ciemny motyw'):`Motyw: ${labels[theme]}. Zmień na ${labels[nextTheme(theme)]}.`); themeButton.hidden = false; }
}
renderTheme();
themeButton?.addEventListener('click',()=>{theme=themeButton.dataset?.themeIcon!==undefined?(((theme==='auto'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme)==='dark')?'light':'dark'):nextTheme(theme);try{localStorage.setItem('vs76project-theme',theme)}catch{}renderTheme()});
const fontSelects = document.querySelectorAll<HTMLSelectElement>('[data-font-select]');
const fontChoices = ['noto', 'ibm-plex', 'atkinson', 'literata'];
let font = fontChoices.includes(document.documentElement.dataset.font || '') ? document.documentElement.dataset.font! : 'noto';
function renderFont() {
 document.documentElement.dataset.font = font;
 fontSelects.forEach((select) => { select.value = font; });
}
renderFont();
fontSelects.forEach((select) => select.addEventListener('change', () => {
 if (!fontChoices.includes(select.value)) return;
 font = select.value;
 try { localStorage.setItem('vs76project-font', font); } catch {}
 renderFont();
}));
document.querySelector<HTMLSelectElement>('[data-template-switch]')?.addEventListener('change', (event) => {
 const port = (event.currentTarget as HTMLSelectElement).value;
 if (!/^\d+$/.test(port)) return;
 const destination = new URL(window.location.href);
 destination.port = port;
 window.location.assign(destination);
});
const form=document.querySelector<HTMLFormElement>('[data-inquiry-form]');
if (form) {
 const select=form.querySelector<HTMLSelectElement>('[name="topic"]');
 const requested=new URLSearchParams(window.location.search).get('temat');
 if(select && requested && topics.includes(requested))select.value=requested;
 if(!form.dataset.api)form.addEventListener('submit',(event)=>{
  event.preventDefault();if(!form.reportValidity())return;
  const values=Object.fromEntries(new FormData(form).entries());
  const body=createInquiry(values);
  const panel=document.querySelector<HTMLElement>('[data-inquiry-result]');
  const output=document.querySelector<HTMLTextAreaElement>('[data-inquiry-output]');
  const mail=document.querySelector<HTMLAnchorElement>('[data-inquiry-mail]');
  if(output)output.value=body;
  if(panel){panel.hidden=false;panel.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
  if(mail){const url=mailtoUrl(form.dataset.recipient || '',body);mail.hidden=!url;if(url)mail.href=url;}
  document.querySelector<HTMLElement>('[data-result-heading]')?.focus();
 });
 document.querySelector<HTMLButtonElement>('[data-copy-inquiry]')?.addEventListener('click',async()=>{
  const output=document.querySelector<HTMLTextAreaElement>('[data-inquiry-output]');
  const status=document.querySelector<HTMLElement>('[data-copy-status]');
  if(!output || !status)return;
  try{await navigator.clipboard.writeText(output.value);status.textContent='Treść została skopiowana. Możesz wkleić ją do wiadomości.'}
  catch{output.focus();output.select();status.textContent='Nie udało się skopiować automatycznie. Zaznaczono treść; skopiuj ją skrótem klawiaturowym.'}
 });
 const fields=form.querySelector<HTMLFieldSetElement>('[data-inquiry-fields]');
 if(fields)fields.disabled=false;
 if(form.dataset.api)initApiForm(form);
}

const ICON_LABELS: Record<string,string> = { square:'kwadrat', users:'dwie osoby', clock:'zegar', mail:'koperta', pin:'pinezka mapy', shield:'tarcza', check:'pole wyboru', bars:'wykres słupkowy' };
type Challenge = { token: string; target: string; options: string[] };
function initApiForm(form: HTMLFormElement) {
 const api = form.dataset.api || '';
 const challengeUrl = form.dataset.challengeUrl || '';
 const options = form.querySelector<HTMLElement>('[data-challenge-options]');
 const targetUse = form.querySelector<SVGUseElement>('[data-challenge-target] use');
 const challengeMessage = form.querySelector<HTMLElement>('[data-challenge-message]');
 const status = form.querySelector<HTMLElement>('[data-form-status]');
 if (!options || !targetUse) return;
 const box: HTMLElement = options;
 const useEl: SVGUseElement = targetUse;
 let challenge: Challenge | null = null;
 let selected: string | null = null;
 const say = (el: HTMLElement | null, text: string, error = false) => {
  if (!el) return;
  el.textContent = text; el.hidden = !text; el.classList.toggle('is-error', error);
 };
 async function loadChallenge() {
  say(challengeMessage, 'Ładowanie zadania...');
  try {
   const response = await fetch(challengeUrl, { cache: 'no-store', headers: { Accept: 'application/json' } });
   const data = await response.json();
   if (!response.ok || !data.token || !data.target || !Array.isArray(data.options)) throw new Error(data.komunikat || 'challenge');
   challenge = data; selected = null;
   useEl.setAttribute('href', `#icon-${data.target}`);
   box.replaceChildren();
   for (const icon of data.options as string[]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'challenge-option'; button.setAttribute('aria-label', ICON_LABELS[icon] || 'ikona'); button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<svg aria-hidden="true"><use href="#icon-${icon}"></use></svg>`;
    button.addEventListener('click', () => {
     selected = icon;
     box.querySelectorAll('button').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
     say(challengeMessage, '');
    });
    box.append(button);
   }
   say(challengeMessage, '');
  } catch {
   challenge = null; box.replaceChildren();
   say(challengeMessage, 'Nie udało się przygotować zabezpieczenia. Odśwież stronę lub spróbuj później.', true);
  }
 }
 void loadChallenge();
 form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!challenge || !selected) { say(challengeMessage, 'Wybierz ikonę przed wysłaniem wiadomości.', true); return; }
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) submit.disabled = true;
  say(status, 'Wysyłanie wiadomości...');
  const body = { ...Object.fromEntries(new FormData(form).entries()), challenge_token: challenge.token, selected_icon: selected };
  try {
   const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
   const result = await response.json().catch(() => ({}));
   if (!response.ok || !result.ok) { const error = new Error(result.komunikat || 'Nie udało się wysłać wiadomości.') as Error & { kind?: string }; error.kind = result.kod; throw error; }
   form.reset();
   say(status, 'Dziękujemy. Wiadomość została wysłana, odezwiemy się wkrótce.');
   await loadChallenge();
  } catch (error) {
   say(status, (error as Error).message || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.', true);
   await loadChallenge();
  } finally {
   if (submit) submit.disabled = false;
  }
 });
}
