import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// Wymaga builda z PUBLIC_CONTACT_API=true w dist-api (npm run test:api-ui).
const html=readFileSync(new URL('../dist-api/kontakt/index.html',import.meta.url),'utf8');
const head=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(script=>script.includes("localStorage.getItem('vs76project-theme')"));
const external=html.match(/<script type="module" src="([^"]+)"/)?.[1];
const bootstrap=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]||(external&&readFileSync(new URL('../dist-api'+external,import.meta.url),'utf8'));
assert.ok(head&&bootstrap,'brak skryptów w dist-api');
assert.match(html,/data-api="\/api\/contact\.php"/);
class El{
 constructor(tag='div'){this.tag=tag;this.attributes={};this.listeners={};this.children=[];this.dataset={};this.hidden=false;this.textContent='';this.disabled=false;this.classes=new Set();this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};this.innerHTML=''}
 setAttribute(k,v){this.attributes[k]=v}
 getAttribute(k){return this.attributes[k]}
 addEventListener(k,fn){this.listeners[k]=fn}
 replaceChildren(){this.children=[]}
 append(c){this.children.push(c)}
 querySelectorAll(){return this.children}
 focus(){}
}
function setup({responses}){
 const theme=new El('button'),form=new El('form'),options=new El(),use=new El(),cm=new El(),status=new El(),submit=new El('button'),fields=new El('fieldset'),select=new El('select');
 cm.hidden=true;status.hidden=true;fields.disabled=true;
 form.dataset={recipient:'',api:'/api/contact.php',challengeUrl:'/api/challenge.php'};
 form.reportValidity=()=>true;form.reset=()=>{form.wasReset=true};
 const map={'[data-challenge-options]':options,'[data-challenge-message]':cm,'[data-form-status]':status,'button[type="submit"]':submit,'[data-challenge-target] use':use,'[name="topic"]':select,'[data-inquiry-fields]':fields};
 form.querySelector=s=>map[s]||null;
 const document={documentElement:{dataset:{}},querySelector:s=>s==='[data-theme-toggle]'?theme:s==='[data-inquiry-form]'?form:null,querySelectorAll:()=>[],createElement:t=>new El(t)};
 const calls=[];
 const fetch=async(url,init)=>{calls.push({url,init});const r=responses.shift();return {ok:r.ok,json:async()=>r.body}};
 const payload={name:'Anna',email:'anna@example.org',topic:'Doradztwo',message:'Treść wiadomości testowej.',website:''};
 const context={document,localStorage:{getItem(){return null},setItem(){}},navigator:{},URLSearchParams,FormData:class{entries(){return Object.entries(payload)}},fetch,window:{location:{search:''},matchMedia:()=>({matches:true})}};
 runInNewContext(head,context);runInNewContext(bootstrap,context);
 return {form,options,use,cm,status,submit,fields,calls};
}
const tick=()=>new Promise(r=>setTimeout(r,0));
const challenge=(target='mail')=>({ok:true,body:{token:'tok.sig',target,options:['mail','square','clock','users','pin','bars'],expires_in:600}});
test('wyzwanie się ładuje, formularz jest włączony, wysyłka wymaga wyboru ikony',async()=>{
 const ui=setup({responses:[challenge()]});await tick();
 assert.equal(ui.fields.disabled,false);
 assert.equal(ui.options.children.length,6);
 assert.equal(ui.use.attributes.href,'#icon-mail');
 assert.equal(ui.options.children[0].attributes['aria-label'],'koperta');
 await ui.form.listeners.submit({preventDefault(){}});
 assert.match(ui.cm.textContent,/Wybierz ikonę/);assert.equal(ui.calls.length,1,'bez wyboru ikony nie ma POST');
});
test('poprawny wybór wysyła JSON z tokenem i ikoną i pokazuje potwierdzenie',async()=>{
 const ui=setup({responses:[challenge(),{ok:true,body:{ok:true}},challenge('clock')]});await tick();
 ui.options.children[0].listeners.click();
 await ui.form.listeners.submit({preventDefault(){}});await tick();
 const post=ui.calls[1];assert.equal(post.url,'/api/contact.php');assert.equal(post.init.method,'POST');
 const body=JSON.parse(post.init.body);
 assert.equal(body.challenge_token,'tok.sig');assert.equal(body.selected_icon,'mail');assert.equal(body.name,'Anna');assert.equal(body.website,'');
 assert.match(ui.status.textContent,/Wiadomość została wysłana/);assert.equal(ui.status.classes.has('is-error'),false);
 assert.equal(ui.form.wasReset,true);assert.equal(ui.submit.disabled,false);assert.equal(ui.use.attributes.href,'#icon-clock','po wysyłce nowe wyzwanie');
});
test('błąd serwera pokazuje komunikat i odświeża wyzwanie',async()=>{
 const ui=setup({responses:[challenge(),{ok:false,body:{ok:false,komunikat:'Zbyt wiele prób. Spróbuj ponownie później.'}},challenge('pin')]});await tick();
 ui.options.children[0].listeners.click();
 await ui.form.listeners.submit({preventDefault(){}});await tick();
 assert.equal(ui.status.textContent,'Zbyt wiele prób. Spróbuj ponownie później.');assert.equal(ui.status.classes.has('is-error'),true);
 assert.equal(ui.use.attributes.href,'#icon-pin');assert.equal(ui.submit.disabled,false);
});
test('niedostępny endpoint wyzwania daje czytelny komunikat',async()=>{
 const ui=setup({responses:[{ok:false,body:{ok:false,komunikat:'Formularz jest chwilowo niedostępny.'}}]});await tick();
 assert.match(ui.cm.textContent,/Nie udało się przygotować zabezpieczenia/);assert.equal(ui.cm.classes.has('is-error'),true);
});
