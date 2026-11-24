import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
// Stan ukryty animacji pojawiania się (.js-motion ... {opacity:0}) może dotyczyć wyłącznie elementów, którym skrypt motion.ts dodaje
// widoczność (lista REVEAL). W przeciwnym razie element zostaje na stałe niewidoczny (błąd z szablonu starter, 2026-10-29).
const motion=readFileSync(new URL('../src/scripts/motion.ts',import.meta.url),'utf8');
const reveal=(motion.match(/const REVEAL = '([^']+)'/)||[])[1];
assert.ok(reveal,'brak listy REVEAL w motion.ts');
const known=new Set(reveal.split(',').map(s=>s.trim()));
const dir=new URL('../src/templates/',import.meta.url);
const templates=readdirSync(dir,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('_')&&existsSync(new URL(d.name+'/styles.css',dir))).map(d=>d.name);
for(const t of templates){
 const css=readFileSync(new URL(t+'/styles.css',dir),'utf8');
 test(`[${t}] elementy ukrywane przez .js-motion są na liście REVEAL`,()=>{
  const hidden=[];
  for(const m of css.matchAll(/\.js-motion\s+:is\(([^)]+)\)\s*\{[^}]*opacity:\s*0/g))hidden.push(...m[1].split(',').map(s=>s.trim()));
  for(const m of css.matchAll(/\.js-motion\s+([^{(:][^{]*?)\s*\{[^}]*opacity:\s*0/g))hidden.push(...m[1].split(',').map(s=>s.trim()));
  for(const sel of hidden){
   if(sel==='.reveal'||sel.endsWith('.is-visible'))continue;
   assert.ok(known.has(sel),`szablon ${t} ukrywa "${sel}", którego nie ma w REVEAL (motion.ts): element zostałby niewidoczny`);
  }
 });
 test(`[${t}] każdy stan ukryty ma odpowiadający stan widoczny (.is-visible)`,()=>{
  const hides=/\.js-motion[^{]*\{[^}]*opacity:\s*0/.test(css);
  if(hides)assert.match(css,/\.js-motion[^{]*\.is-visible[^{]*\{[^}]*opacity:\s*1/);
 });
}
