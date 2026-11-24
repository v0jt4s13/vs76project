"""Sprawdza paczkę release (web/dist) pod publikację. Bez sieci i przeglądarki."""
import argparse, sys, re
from xml.etree import ElementTree
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_website as vw

DIST = vw.DIST

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--domain', default='')
    ap.add_argument('--email', default='')
    ap.add_argument('--index', action='store_true')
    ap.add_argument('--template', default='classic')
    args = ap.parse_args()
    ht = (DIST / '.htaccess').read_text()
    assert 'ErrorDocument 404 /404.html' in ht and (DIST / '404.html').is_file()
    redirects=re.findall(r'^RedirectMatch 301 (\S+) (\S+)$', ht, re.MULTILINE)
    training_redirect = ('^/szkolenia/automatyzacja/?$', '/szkolenia/projektowanie-pilota-ai/')
    assert training_redirect in redirects
    assert (DIST / 'szkolenia/projektowanie-pilota-ai/index.html').is_file()
    for slug in ['jak-sprawdzac-odpowiedzi-ai', 'od-zadania-do-pilota']:
        old=f'/wiedza/{slug}'
        target=f'/wiedza/2026-10-30/{slug}/'
        assert (DIST/target.lstrip('/')/'index.html').is_file(), target
        for path in [old, old+'/']:
            assert [dest for pattern,dest in redirects if re.search(pattern,path)]==[target], path
        for path in [target, old+'-inny/', old+'/inny/']:
            assert not any(re.search(pattern,path) for pattern,_ in redirects), path
    assert f'data-template="{args.template}"' in (DIST / 'index.html').read_text(), f'strona nie została zbudowana szablonem {args.template}'
    if args.template == 'starter':
        assert not (DIST / 'poster').exists(), 'starter nie używa plakatu classic'
    if not args.domain:
        vw.main()
        assert not (DIST / 'api').exists(), 'paczka testowa jest statyczna: bez api/'
        assert 'RewriteEngine' not in ht, 'paczka testowa nie może wymuszać HTTPS'
        print('OK: paczka testowa (noindex, bez domeny, .htaccess bez przekierowania HTTPS).')
        return
    base = f'https://{args.domain}'
    pages = {}
    for path in DIST.rglob('*.html'):
        p = vw.Page(); p.feed(path.read_text()); pages[path] = p
    assert len(pages) == 20, len(pages)
    want = 'index,follow' if args.index else 'noindex,nofollow'
    for path, p in pages.items():
        rel = '/' + str(path.relative_to(DIST)).removesuffix('index.html').removesuffix('.html')
        if path.name == '404.html': continue
        assert p.meta.get('robots') == want, (path, p.meta.get('robots'))
        assert p.meta.get('og:image') == base + '/og.png', (path, p.meta.get('og:image'))
        assert p.meta.get('og:url') == base + rel, (path, p.meta.get('og:url'), rel)
    robots = (DIST / 'robots.txt').read_text(); sitemap = (DIST / 'sitemap.xml').read_text()
    if args.index:
        assert 'Allow: /' in robots and f'Sitemap: {base}/sitemap.xml' in robots
        locations=[el.text for el in ElementTree.fromstring(sitemap).findall('{*}url/{*}loc')]
        expected={base+'/'+str(path.relative_to(DIST)).removesuffix('index.html') for path in pages if path.name!='404.html'}
        assert len(locations)==len(set(locations)), 'duplikaty w sitemap'
        assert set(locations)==expected, (set(locations)-expected, expected-set(locations))
    else:
        assert robots == 'User-agent: *\nDisallow: /\n' and '<loc>' not in sitemap
    for f in DIST.rglob('*'):
        if f.is_file() and f.suffix in ('.html', '.txt', '.xml', '.js', '.css', '.svg', '.htaccess'):
            t = f.read_text(errors='ignore')
            assert '127.0.0.1' not in t and 'localhost' not in t, f
    contact = (DIST / 'kontakt/index.html').read_text()
    assert f'data-recipient="{args.email}"' in contact and f'mailto:{args.email}' in contact
    assert f'https://{args.domain}%{{REQUEST_URI}}' in ht
    assert len(list((DIST / 'downloads').glob('*.pdf'))) == 4
    api = DIST / 'api'
    assert sorted(f.name for f in api.iterdir()) == ['_lib.php', 'challenge.php', 'contact.php'], 'api/ ma zawierać tylko trzy pliki'
    assert 'data-api="/api/contact.php"' in contact and 'data-challenge-url="/api/challenge.php"' in contact
    assert not list(DIST.rglob('config*.php')) and not list(DIST.rglob('talnet-config*')), 'konfiguracja nie może trafić do paczki'
    assert '(?!(challenge|contact)\\.php$)' in ht, 'brak blokady pozostałych plików PHP'
    print(f'OK: paczka dla {base}, indeksowanie={"włączone" if args.index else "wyłączone"}, e-mail w kontakcie, canonical/og/robots/sitemap spójne.')

if __name__ == '__main__':
    main()
