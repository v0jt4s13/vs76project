import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTheme,createInquiry,mailtoUrl } from '../src/scripts/contact-utils.mjs';
test('trzy motywy tworzą pełny cykl',()=>{assert.equal(nextTheme('auto'),'light');assert.equal(nextTheme('light'),'dark');assert.equal(nextTheme('dark'),'auto');assert.equal(nextTheme('unknown'),'auto')});
test('wiadomość ma prawdziwe linie i nieznany temat ma bezpieczny fallback',()=>{const body=createInquiry({topic:'obcy temat',name:' Test ',message:'Praca nad syntetycznym procesem'});assert.ok(body.includes('\n\n'));assert.ok(!body.includes(String.fromCharCode(92)+'n'));assert.ok(body.includes('Pomoc w wyborze'));assert.ok(body.includes('Osoba kontaktowa: Test'))});
test('treść jest ograniczona do uzgodnionego rozmiaru',()=>{const body=createInquiry({message:'X'.repeat(3000)});assert.equal((body.match(/X/g)||[]).length,2500)});
test('mailto koduje dane w treści, bez dodawania nagłówków',()=>{const body='Test & temat\nBcc: someone@example.test';const url=mailtoUrl('kontakt@example.test',body);assert.ok(url);const parsed=new URL(url);assert.equal(parsed.searchParams.get('body'),body);assert.equal(parsed.searchParams.get('bcc'),null)});
test('pusty albo niepoprawny odbiorca nie tworzy linku',()=>{for(const value of ['','abc','person@example.test\nBcc: other@example.test'])assert.equal(mailtoUrl(value,'test'),null)});
