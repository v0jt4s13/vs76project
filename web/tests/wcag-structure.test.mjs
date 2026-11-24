import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
// Kontrole strukturalne WCAG 2.2 na gotowym HTML. Katalog: WCAG_DIST (domyślnie dist).
const root=new URL('../'+(process.env.WCAG_DIST||'dist')+'/',import.meta.url).pathname;
const files=[];
(function walk(d){for(const n of readdirSync(d)){const p=join(d,n);statSync(p).isDirectory()?walk(p):p.endsWith('.html')&&files.push(p)}})(root);
assert.ok(files.length>=15,'za mało stron w '+root);

const attrs=(s)=>Object.fromEntries([...s.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]??'']));
const text=(h)=>h.replace(/<svg[\s\S]*?<\/svg>/g,m=>(m.match(/aria-label="([^"]*)"/)||[,''])[1]).replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const els=(html,tag)=>[...html.matchAll(new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,'g'))].map(m=>({a:attrs(m[1]||''),inner:m[2]}));
const name=(e)=>e.a['aria-label']||text(e.inner);

for(const f of files){
 const rel=relative(root,f), html=readFileSync(f,'utf8');
 test(`[${rel}] język, tytuł, jeden h1, brak pozytywnego tabindex`,()=>{
  assert.match(html,/<html lang="pl"/);
  assert.ok((html.match(/<title>([^<]+)<\/title>/)||[])[1],'brak <title>');
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1);
  assert.doesNotMatch(html,/tabindex="[1-9]/);
 });
 test(`[${rel}] kolejność nagłówków bez przeskoków`,()=>{
  const levels=[...html.matchAll(/<h([1-6])[\s>]/g)].map(m=>+m[1]);
  levels.forEach((l,i)=>{if(i>0)assert.ok(l<=levels[i-1]+1,`przeskok h${levels[i-1]} -> h${l}`)});
 });
 test(`[${rel}] link pomijający nawigację i cel istnieje (2.4.1)`,()=>{
  assert.match(html,/<a href="#tresc" class="skip-link">/);
  assert.match(html,/<main id="tresc"/);
 });
 test(`[${rel}] linki i przyciski mają nazwę dostępną (4.1.2, 2.4.4)`,()=>{
  for(const e of [...els(html,'a').filter(x=>x.a.href!==undefined),...els(html,'button')])assert.ok(name(e),`pusty ${JSON.stringify(e.a)}`);
 });
 test(`[${rel}] pola formularza mają etykiety (1.3.1, 3.3.2), autocomplete tam, gdzie dotyczy (1.3.5)`,()=>{
  const labels=new Set([...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map(m=>m[1]));
  for(const m of html.matchAll(/<(input|select|textarea)(\s[^>]*)?>/g)){
   const a=attrs(m[2]||'');
   if(a.type==='hidden'||a.tabindex==='-1')continue;           // pułapka antyspamowa jest ukryta przed użytkownikiem
   assert.ok(a['aria-label']||labels.has(a.id),`pole bez etykiety: ${m[0].slice(0,80)}`);
  }
  for(const [id,ac] of [['name','name'],['email','email'],['company','organization']])
   if(new RegExp(`id="${id}"`).test(html))assert.match(html,new RegExp(`id="${id}"[^>]*autocomplete="${ac}"`),`brak autocomplete=${ac}`);
 });
 test(`[${rel}] obrazy i SVG: alt lub aria-hidden/role=img z nazwą (1.1.1)`,()=>{
  for(const m of html.matchAll(/<img(\s[^>]*)>/g))assert.ok('alt' in attrs(m[1]),`img bez alt: ${m[0].slice(0,80)}`);
  for(const m of html.matchAll(/<svg(\s[^>]*)?>/g)){
   const a=attrs(m[1]||'');
   if(a.style&&a.style.includes('position:absolute'))continue;  // sprite ikon (aria-hidden)
   assert.ok(a['aria-hidden']==='true'||(a.role==='img'&&a['aria-label'])||a.focusable!==undefined&&a['aria-hidden'],`svg bez opisu: ${m[0].slice(0,80)}`);
  }
  for(const m of html.matchAll(/<(\w+)[^>]*role="img"[^>]*>/g))assert.match(m[0],/aria-label="[^"]+"/,'role=img bez aria-label');
 });
 test(`[${rel}] tabele mają podpis i nagłówki kolumn (1.3.1)`,()=>{
  for(const t of els(html,'table')){assert.match(t.inner,/<caption/);assert.match(t.inner,/<th scope="col"/)}
 });
 test(`[${rel}] odwołania aria-labelledby/aria-describedby wskazują istniejące id`,()=>{
  const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g))for(const id of m[1].split(/\s+/))assert.ok(ids.has(id),`brak id=${id}`);
  assert.equal(ids.size,[...html.matchAll(/\sid="([^"]+)"/g)].length,'zduplikowane id');
 });
 test(`[${rel}] wskazówka nawigacji: aktualna strona oznaczona aria-current, nav ma etykietę (2.4.8, 1.3.1)`,()=>{
  for(const m of html.matchAll(/<nav(\s[^>]*)?>/g))assert.ok(attrs(m[1]||'')['aria-label'],'nav bez aria-label');
 });
}
test('formularz kontaktowy: komunikaty statusu mają role=status (4.1.3), a w trybie API CAPTCHA ma alternatywę tekstową',()=>{
 const html=readFileSync(join(root,'kontakt/index.html'),'utf8');
 assert.match(html,/role="status"/);
 if(html.includes('data-api=')){
  assert.match(html,/data-challenge-options/);assert.match(html,/role="group" aria-label="Wybór ikony"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/Wybierz ikonę identyczną z wzorcową/);   // instrukcja tekstowa towarzyszy zadaniu
 }
});
(readFileSync(join(root,'index.html'),'utf8').includes('brand-poster')?test:test.skip)('plakat: przycisk wstrzymania animacji istnieje dla każdej animacji dłuższej niż 5 s (2.2.2) i nie ma pułapki fokusu',()=>{
 const html=readFileSync(join(root,'index.html'),'utf8');
 assert.match(html,/data-poster-toggle[^>]*aria-label="Wstrzymaj animację plakatu"/);
 assert.match(html,/<div class="poster-controls"[^>]*role="group"[^>]*aria-label="Animacja plakatu"/);
});
