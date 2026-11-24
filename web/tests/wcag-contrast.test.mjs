import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
// Kontrast WCAG 2.2 (SC 1.4.3 tekst 4.5:1, SC 1.4.11 elementy interfejsu 3:1) liczony ze źródłowych tokenów CSS.
const tplDir=new URL('../src/templates/',import.meta.url);
const templates=readdirSync(tplDir,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('_')&&existsSync(new URL(d.name+'/styles.css',tplDir))).map(d=>d.name);
assert.ok(templates.length>=1,'brak szablonów w src/templates');

const hex=(h)=>{h=h.replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
function parseColor(v){
 v=v.trim();
 if(v.startsWith('#'))return [...hex(v),1];
 const m=v.match(/^rgba?\(([^)]+)\)$/);
 if(m){const p=m[1].split(',').map(s=>parseFloat(s));return [p[0],p[1],p[2],p[3]??1]}
 throw new Error('Nieobsługiwany kolor: '+v);
}
const over=(fg,bg)=>[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3])).concat(1);   // alfa nad tłem
const lum=([r,g,b])=>{const f=(c)=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};

for(const tpl of templates){
const css=readFileSync(new URL(tpl+'/styles.css',tplDir),'utf8');
const hasPoster=css.includes('.brand-poster');
function block(re){const m=css.match(re);assert.ok(m,'brak bloku tokenów: '+re);return Object.fromEntries([...m[1].matchAll(/--([\w-]+):(#[0-9a-fA-F]{3,8})/g)].map(x=>[x[1],x[2]]))}
const light=block(/:root\s*\{([^}]*)\}/);
const darkAuto=block(/@media\(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{([^}]*)\}/);
const darkManual=block(/:root\[data-theme="dark"\]\{([^}]*)\}/);
const palettes={jasny:light,'ciemny (auto)':darkAuto,'ciemny (ręczny)':darkManual};

// Wartość deklaracji z pierwszej reguły o danym selektorze (np. '.poster-kicker','color').
function decl(selector,prop){
 // Reguły z listą selektorów (a,b{...}) też się liczą; łączymy deklaracje wszystkich pasujących reguł.
 const bodies=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].split(',').map(x=>x.trim().replace(/^.*\*\/\s*/,'')).includes(selector)).map(m=>m[2]);
 const d=bodies.join(';').match(new RegExp('(?:^|;)\\s*'+prop+':([^;]+)'));
 assert.ok(d,`brak ${prop} w ${selector}`);return d[1].trim();
}
const resolve=(v,pal)=>{const m=v.match(/^var\(--([\w-]+)\)$/);if(m){assert.ok(pal[m[1]],'brak tokenu '+m[1]);return pal[m[1]]}return v};

test(`[${tpl}] palety ciemne (auto i ręczna) mają identyczne tokeny`,()=>{
 assert.deepEqual(darkAuto,darkManual);
});

// [tło, tekst, minimum, opis]. Wartości to tokeny (nazwy z palety) albo konkretne kolory.
const tokenPairs=[
 ['bg','text',4.5,'tekst podstawowy na tle'],['surface','text',4.5,'tekst na powierzchni'],['soft','text',4.5,'tekst na tle pomocniczym'],
 ['bg','muted',4.5,'tekst pomocniczy na tle'],['surface','muted',4.5,'tekst pomocniczy na powierzchni'],['soft','muted',4.5,'tekst pomocniczy na tle pomocniczym'],
 ['bg','accent',4.5,'linki i akcent tekstowy na tle'],['surface','accent',4.5,'akcent na powierzchni'],['soft','accent',4.5,'akcent na tle pomocniczym'],
 ['primary','on-primary',4.5,'tekst przycisku głównego'],['field','text',4.5,'tekst w polu formularza'],
 ['bg','error',4.5,'komunikat błędu na tle'],['soft','error',4.5,'komunikat błędu na tle pomocniczym'],
 ['bg','line',3,'obramowanie elementu interfejsu (1.4.11)'],['field','line',3,'obramowanie pola formularza (1.4.11)'],
 ['bg','focus',3,'wskaźnik fokusu na tle (2.4.11)'],['surface','focus',3,'wskaźnik fokusu na powierzchni'],['soft','focus',3,'wskaźnik fokusu na tle pomocniczym'],
];
for(const [name,pal] of Object.entries(palettes)){
 for(const [bg,fg,min,desc] of tokenPairs){
  test(`[${tpl}] kontrast [${name}] ${desc}: --${fg} na --${bg} >= ${min}:1`,(t)=>{
   const r=ratio(parseColor(pal[fg]),parseColor(pal[bg]));
   t.diagnostic(`${r.toFixed(2)}:1`);
   assert.ok(r>=min,`${pal[fg]} na ${pal[bg]} = ${r.toFixed(2)}:1 (wymagane ${min}:1)`);
  });
 }
}

// Elementy z kolorami zapisanymi w regułach (także zależnymi od motywu).
const rulePairs=[
 // [selektor tekstu, własność tekstu, selektor tła, własność tła, minimum, opis]
 ['.poster-kicker','color','.poster-info','background',4.5,'plakat: numer kategorii na białej karcie'],
 ['.poster-title','color','.poster-info','background',4.5,'plakat: nagłówek na białej karcie'],
 ['.poster-text','color','.poster-info','background',4.5,'plakat: tekst na białej karcie'],
 ['.poster-badge','color','.poster-badge','background',4.5,'plakat: numer w niebieskim kwadracie'],
 ['.challenge-option[aria-pressed="true"]','color','.challenge-option[aria-pressed="true"]','background',4.5,'CAPTCHA: wybrana ikona'],
 ['.challenge-option','color','.challenge-option','background',4.5,'CAPTCHA: ikona'],
 ['.training-badge','color','.training-badge','background',4.5,'plakietka na kafelku szkolenia'],
 ['.form-message','color','.form-message','background',4.5,'komunikat formularza'],
 ['.form-message.is-error','color','.form-message','background',4.5,'komunikat błędu formularza'],
 ['.per-person','color','.training-row','background',4.5,'cena na osobę'],
 ['.tag','color','.tag','background',4.5,'dział Edukacja: znacznik czasu i odbiorców modułu'],
];
for(const [name,pal] of Object.entries(palettes)){
 for(const [fs,fp,bs,bp,min,desc] of rulePairs){
  if(!css.includes(fs.split(' ')[0].replace(/\[.*$/,'')))continue;   // reguła nie istnieje w tym szablonie
  test(`[${tpl}] kontrast [${name}] ${desc}`,(t)=>{
   let bgv;try{bgv=decl(bs,bp)}catch{bgv='var(--bg)'}      // brak własnego tła: tło strony
   const base=parseColor(resolve('var(--bg)',pal));
   const bg=over(parseColor(resolve(bgv,pal)),base);
   const fg=over(parseColor(resolve(decl(fs,fp),pal)),bg);
   const r=ratio(fg,bg);t.diagnostic(`${r.toFixed(2)}:1`);
   assert.ok(r>=min,`${desc}: ${r.toFixed(2)}:1 (wymagane ${min}:1)`);
  });
 }
}

// Plakat jest zawsze granatowy (niezależnie od motywu): teksty na tle #063957.
hasPoster&&test(`[${tpl}] plakat: teksty na granatowym tle mają kontrast >= 4.5:1`,(t)=>{
 const navy=parseColor('#063957');
 for(const [c,min] of [['#fff',4.5],['#c6dce9',4.5]]){
  const r=ratio(parseColor(c),navy);t.diagnostic(`${c}: ${r.toFixed(2)}:1`);
  assert.ok(r>=min,`${c} na granacie: ${r.toFixed(2)}:1`);
 }
 assert.ok(css.includes('#c6dce9')&&css.includes('#063957'),'kolory plakatu zmieniły się, zaktualizuj test');
});
hasPoster&&test(`[${tpl}] plakat: przyciski sterowania mają kontrast ikony >= 3:1 na jasnym i ciemnym tle`,(t)=>{
 const btn=parseColor(decl('.poster-controls button','background')),fg=parseColor(decl('.poster-controls button','color'));
 for(const under of ['#ffffff','#063957','#0a4a70']){
  const bg=over(btn,parseColor(under));const r=ratio(fg,bg);t.diagnostic(`pod ${under}: ${r.toFixed(2)}:1`);
  assert.ok(r>=3,`ikona na przycisku pod ${under}: ${r.toFixed(2)}:1`);
 }
});
hasPoster&&test(`[${tpl}] plakat: numery 01-09 w kwadratach są dekoracyjne (aria-hidden), więc poza wymaganiem kontrastu`,()=>{
 const html=readFileSync(new URL('../src/templates/classic/Home.astro',import.meta.url),'utf8');
 assert.match(html,/<div class="poster-matrix"[^>]*role="img"/);   // siatka jest jednym obrazem z opisem, dzieci pomijane
});
test(`[${tpl}] CSS honoruje prefers-reduced-motion i ma widoczny fokus`,()=>{
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
 assert.match(css,/:focus-visible/);
});

}
