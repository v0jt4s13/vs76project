import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../dist/kontakt/index.html',import.meta.url),'utf8');
const head=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(script=>script.includes("localStorage.getItem('vs76project-theme')"));
const external=html.match(/<script type="module" src="([^"]+)"/)?.[1];
const bootstrap=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]||(external&&readFileSync(new URL('../dist'+external,import.meta.url),'utf8'));
assert.ok(head && bootstrap,'Oczekiwano inline inicjalizacji i bootstrapu w gotowym HTML');
function element(){return {hidden:true,value:'',textContent:'',attributes:{},listeners:{},disabled:true,focus(){this.focused=true},select(){this.selected=true},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.listeners[k]=fn},scrollIntoView(v){this.scrolled=v}}}
function setup({recipient='',clipboard=true,storageError=false}={}){
 const button=element(),form=element(),select=element(),fields=element(),panel=element(),output=element(),mail=element(),heading=element(),copy=element(),status=element();
 form.dataset={recipient};form.reportValidity=()=>true;form.querySelector=(s)=>s.includes('topic')?select:fields;
 const all={'[data-theme-toggle]':button,'[data-inquiry-form]':form,'[data-inquiry-result]':panel,'[data-inquiry-output]':output,'[data-inquiry-mail]':mail,'[data-result-heading]':heading,'[data-copy-inquiry]':copy,'[data-copy-status]':status};
 const document={documentElement:{dataset:{}},querySelector:s=>all[s],querySelectorAll:()=>[]};
 const saved=new Map([['vs76project-theme','dark']]);const localStorage={getItem(k){if(storageError)throw Error('blocked');return saved.get(k)},setItem(k,v){if(storageError)throw Error('blocked');saved.set(k,v)}};
 const payload={name:'Osoba testowa',email:'osoba@example.test',topic:'AI Security w firmie',message:'Syntetyczny opis celu szkolenia'};
 let copied='';const navigator=clipboard?{clipboard:{async writeText(t){copied=t}}}:{};
 const context={document,localStorage,navigator,URLSearchParams,FormData:class{entries(){return Object.entries(payload)}},window:{location:{search:'?temat=AI%20Security%20w%20firmie'},matchMedia:()=>({matches:true})}};
 runInNewContext(head,context);runInNewContext(bootstrap,context);
 return {button,form,select,fields,panel,output,mail,heading,copy,status,document,saved,get copied(){return copied}};
}
test('gotowy HTML przywraca motyw przed bootstrapem i uruchamia pełny cykl',()=>{
 const ui=setup();assert.equal(ui.document.documentElement.dataset.theme,'dark');assert.equal(ui.button.hidden,false);assert.equal(ui.button.textContent,'Motyw: Ciemny');
 ui.button.listeners.click();assert.equal(ui.document.documentElement.dataset.theme,undefined);assert.equal(ui.saved.get('vs76project-theme'),'auto');
 ui.button.listeners.click();assert.equal(ui.document.documentElement.dataset.theme,'light');
});
test('zablokowany localStorage nie zatrzymuje formularza',()=>{const ui=setup({storageError:true});assert.equal(ui.button.textContent,'Motyw: Auto');assert.equal(ui.fields.disabled,false)});
test('gotowy formularz zachowuje temat, pokazuje lokalny szkic i kopiuje tekst',async()=>{
 const ui=setup();assert.equal(ui.select.value,'AI Security w firmie');assert.equal(ui.fields.disabled,false);
 let prevented=false;ui.form.listeners.submit({preventDefault(){prevented=true}});
 assert.equal(prevented,true);assert.equal(ui.panel.hidden,false);assert.equal(ui.heading.focused,true);assert.ok(ui.output.value.includes('Syntetyczny opis celu'));assert.equal(ui.mail.hidden,true);
 await ui.copy.listeners.click();assert.equal(ui.copied,ui.output.value);assert.ok(ui.status.textContent.includes('skopiowana'));
});
test('brak schowka pozostawia zaznaczony tekst do ręcznego skopiowania',async()=>{const ui=setup({clipboard:false});ui.form.listeners.submit({preventDefault(){}});await ui.copy.listeners.click();assert.equal(ui.output.selected,true);assert.ok(ui.status.textContent.includes('Nie udało'))});
test('negatywna walidacja nie pokazuje szkicu, a potwierdzony odbiorca dostaje kodowany mailto',()=>{
 const invalid=setup();invalid.form.reportValidity=()=>false;invalid.form.listeners.submit({preventDefault(){}});assert.equal(invalid.panel.hidden,true);
 const valid=setup({recipient:'kontakt@example.test'});valid.form.listeners.submit({preventDefault(){}});assert.equal(valid.mail.hidden,false);assert.ok(valid.mail.href.startsWith('mailto:kontakt@example.test?'));assert.equal(new URL(valid.mail.href).searchParams.get('body'),valid.output.value);
});

test('oferta narzędzi i adresy programów prowadzą do właściwych tematów formularza',()=>{
 const read=(path)=>readFileSync(new URL('../dist/'+path+'/index.html',import.meta.url),'utf8');
 for(const [slug,topic] of [['ai-w-przedsiebiorstwie','AI w codziennej pracy'],['projektowanie-pilota-ai','Projektowanie pilota AI'],['ai-security','AI Security w firmie'],['narzedzia-ai','Szkolenie z narzędzi AI']]){
  const page=read('szkolenia/'+slug);
  const queries=[...page.matchAll(/href="(\/kontakt\/\?temat=[^"]+)"/g)].map(m=>new URL(m[1],'https://example.test').searchParams.get('temat'));
  assert.ok(queries.includes(topic),slug);
  assert.ok(html.includes('value="'+topic+'"'),topic);
 }
});
test('ceny w schema są cenami netto grupy, bez fikcyjnego terminu',()=>{
 for(const [slug,price] of [['ai-w-przedsiebiorstwie',5900],['projektowanie-pilota-ai',6400],['ai-security',6900]]){
  const page=readFileSync(new URL('../dist/szkolenia/'+slug+'/index.html',import.meta.url),'utf8');
  const schemas=[...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const course=schemas.find(s=>s['@type']==='Course');
  assert.equal(course.offers.priceSpecification.price,price);
  assert.equal(course.offers.priceSpecification.valueAddedTaxIncluded,false);
  assert.equal(course.offers.priceSpecification.unitText,'grupa do 10 osób');
  assert.equal(course.hasCourseInstance.courseMode,'online');
  assert.equal(course.hasCourseInstance.startDate,undefined);
 }
});
