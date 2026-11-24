"""Sprawdza gotowy build statyczny bez uruchamiania przeglądarki."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,parse_qs
import json

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'web/dist'

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.h1=0;self.ids=[];self.links=[];self.labels=[];self.controls=[];self.meta={};self.options=[];self.title='';self.in_title=False;self.schema=[];self.in_schema=False;self.script='';self.fieldset_disabled=False;self.lang=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang')
        if tag=='h1':self.h1+=1
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and 'href' in a:self.links.append(a['href'])
        if tag in ['link','script','img']:
            key='href' if tag=='link' else 'src'
            if a.get(key):self.links.append(a[key])
        if tag=='label' and 'for' in a:self.labels.append(a['for'])
        if tag in ['input','select','textarea'] and a.get('type')!='hidden' and not a.get('aria-label','').strip():self.controls.append(a.get('id'))
        if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if tag=='option' and 'value' in a:self.options.append(a['value'])
        if tag=='fieldset' and 'data-inquiry-fields' in a:self.fieldset_disabled='disabled' in a
        if tag=='title':self.in_title=True
        if tag=='script' and a.get('type')=='application/ld+json':self.in_schema=True;self.script=''
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='script' and self.in_schema:self.schema.append(json.loads(self.script));self.in_schema=False
    def handle_data(self,data):
        if self.in_title:self.title+=data
        if self.in_schema:self.script+=data

def main():
    pages={}
    for path in DIST.rglob('*.html'):
        p=Page();p.feed(path.read_text());pages[path]=p
    assert len(pages)==20,len(pages)
    titles=[]
    contact=pages[DIST/'kontakt/index.html'];assert contact.fieldset_disabled
    assert all(c in contact.labels for c in contact.controls),contact.controls
    requests=0
    for path,p in pages.items():
        assert p.lang=='pl' and p.h1==1,(path,p.h1)
        assert len(p.ids)==len(set(p.ids)),path
        assert p.meta.get('description') and p.meta.get('robots')=='noindex,nofollow',path
        assert p.meta.get('og:image')=='/og.png',path
        assert p.schema,path
        titles.append(p.title)
        for href in p.links:
            split=urlsplit(href)
            if split.scheme or split.netloc:continue
            if not split.path:target=path
            elif split.path.startswith('/'):target=DIST/unquote(split.path).lstrip('/')
            else:target=path.parent/unquote(split.path)
            if target.is_dir():target=target/'index.html'
            assert target.is_file(),(path,href,target)
            if split.fragment and target in pages:assert unquote(split.fragment) in pages[target].ids,(path,href)
            values=parse_qs(split.query)
            if 'temat' in values:
                assert values['temat'][0] in contact.options,values;requests+=1
        assert 'trainer_guide' not in path.read_text() and 'price_model.xlsx' not in path.read_text(),path
    assert len(titles)==len(set(titles))
    # Starter ma dodatkowe odnośniki do trzech programów na stronie głównej.
    expected_requests=11 if 'data-template="starter"' in (DIST/'index.html').read_text() else 8
    assert requests==expected_requests,requests
    assert (DIST/'robots.txt').read_text()=='User-agent: *\nDisallow: /\n'
    assert len(list((DIST/'downloads').glob('*.pdf')))==4
    assert not list(DIST.rglob('*.docx')) and not list(DIST.rglob('*.xlsx'))
    print(f'OK: {len(pages)} HTML, tytuły, H1, metadane, schematy JSON-LD, etykiety, linki i {requests} odnośników z tematem formularza.')
    print('OK: 4 publiczne PDF, brak kluczy trenera, kalkulacji i dokumentów edytowalnych w buildzie.')
    print('OK: noindex i robots Disallow, formularz bez JS nie wysyła danych.')

if __name__=='__main__':main()
