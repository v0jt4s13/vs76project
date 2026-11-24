# Szablony strony

Strona ma wymienne szablony wyglądu. Szablon decyduje o powłoce (nagłówek, stopka), stronie głównej i arkuszu stylów. Treść podstron, dane (szkolenia, edukacja), komponenty, skrypty, formularz i SEO są wspólne dla wszystkich szablonów.

## Dostępne szablony

```sh
cd web && npm run templates:list
```

| Nazwa | Opis |
|---|---|
| `classic` | Domyślny. Granatowy plakat z animowanymi blokami na stronie głównej, nawigacja w nagłówku, rozbudowana stopka. |
| `starter` | Jasny, szeroki układ ze zdjęciem w sekcji głównej i listą szkoleń ze zdjęciami. Projekt: `materials/website-design-projekt/vs76project-starter`. |

## Przełączanie

Szablon wybiera się przy budowaniu zmienną `PUBLIC_TEMPLATE` (domyślnie `classic`). Nieznana nazwa zatrzymuje build z listą dostępnych. Do paczki trafia tylko wybrany szablon.

```sh
cd web
PUBLIC_TEMPLATE=starter npm run dev                 # podgląd jednego szablonu
PUBLIC_TEMPLATE=starter npm run build               # build produkcyjny wybranym szablonem
npm run dev:templates                               # podgląd wszystkich; przełącznik w nagłówku przechodzi między portami
npm run test:templates                              # build i test struktury WCAG każdego szablonu
TEMPLATE=starter bash ../scripts/build_release.sh DOMENA EMAIL   # paczka do wgrania z wybranym szablonem
```

Wybór produkcyjnego układu jest na etapie builda: strona statyczna zawiera jeden szablon. Podczas lokalnego porównywania `npm run dev:templates` uruchamia osobny serwer dla każdego układu i pokazuje przełącznik w nagłówku. Zatrzymaj wcześniej pojedynczy serwer Astro, jeśli zajmuje port 4321. Przełącznik nie pojawia się w buildzie produkcyjnym.

## Struktura szablonu

```
web/src/templates/<nazwa>/
  template.json     nazwa, etykieta, opis (czyta npm run templates:list)
  Layout.astro      powłoka: <html>, <head> (przez _shared/Head.astro), nagłówek, <main>, stopka, skrypty
  Home.astro        treść strony głównej (renderowana w <slot /> powłoki)
  styles.css        style (importowane przez Layout.astro)
  Brand.astro       znak i nazwa (opcjonalnie, tylko dla własnego użytku szablonu)
  assets/           obrazy i inne zasoby szablonu (opcjonalnie)
  *.ts              dodatkowe skrypty szablonu (opcjonalnie, np. menu mobilne)
web/src/templates/_shared/Head.astro   wspólny <head>: SEO, Open Graph, motyw, dane strukturalne
```

Katalogi zaczynające się od `_` nie są szablonami. Alias `@template` (konfiguracja w `astro.config.mjs`) wskazuje na katalog aktywnego szablonu. `src/layouts/Layout.astro` przekazuje wszystko do `@template/Layout.astro`, a `src/pages/index.astro` renderuje `@template/Home.astro`.

## Umowa: co szablon musi zapewnić

Layout:
- Przyjmuje właściwości `title`, `seoTitle`, `description`, `schema` i przekazuje je do `<Head {...Astro.props} />` z `_shared/Head.astro`.
- `<html lang="pl" data-template="<nazwa>">`, link pomijający nawigację (`a.skip-link` do `#tresc`), `<main id="tresc" tabindex="-1"><slot /></main>`.
- Każdy `<nav>` ma `aria-label`. Aktualna strona oznaczona `aria-current="page"`.
- Przełącznik motywu: element `[data-theme-toggle]` z atrybutem `hidden` (skrypt go odsłania). Domyślnie to przycisk tekstowy "Motyw: …". Dla przycisku z ikonami dodaj `data-theme-icon` (wtedy skrypt przełącza jasny/ciemny i ustawia tylko `aria-label`). Motyw zapisuje się w `localStorage` pod kluczem `vs76project-theme`, wspólnym dla wszystkich szablonów.
- Ładuje `scripts/site` (motyw, formularz) i `scripts/motion` (pojawianie bloków, plakat klasyczny).
- Linki do wszystkich działów (szkolenia, edukacja, doradztwo, AI Security, wiedza, O nas, współpraca, kontakt, prywatność).

Style (`styles.css`):
- Tokeny kolorów w trzech blokach o tej kolejności i strukturze (testy kontrastu je czytają): `:root{color-scheme:light;...}`, `@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){...}}`, `:root[data-theme="dark"]{...}`. Obowiązkowe nazwy (wartości jako `#hex`): `--bg --surface --text --muted --line --accent --primary --on-primary --soft --focus --field --error`. Paleta ciemna w obu blokach identyczna. `--line` musi mieć kontrast 3:1 (elementy interfejsu), reszta zgodnie z `tests/wcag-contrast.test.mjs`.
- Style wszystkich wspólnych klas używanych przez podstrony: `container page-head lead button button-secondary button-inverse text-link actions section section-top section-bottom section-intro split-feature two-col service-list process-list principle-line training-list training-row training-main training-meta training-badge per-person fine-print content-block prose article-row download-line faq course-grid course-sidebar price course-facts table-scroll module-list module-meta tag contact-grid contact-context inquiry-form field field-grid inquiry-result status challenge challenge-title challenge-target challenge-icon challenge-options challenge-option form-message trap contact-band contact-band-inner sr-only skip-link`.
- Obsługa `prefers-reduced-motion` i widoczny fokus (`:focus-visible`).
- Opcjonalnie reguły `.js-motion … .is-visible` dla pojawiania się bloków (patrz `classic/styles.css` albo `starter/styles.css`).

Strona główna (`Home.astro`) jest swobodna, ale: dokładnie jeden `<h1>`, nagłówki bez przeskoków, linki do szkoleń i kontaktu.

## Jak dodać nowy szablon

1. Skopiuj najbliższy szablon: `cp -r web/src/templates/starter web/src/templates/nowy`.
2. Zmień `template.json` (nazwa musi być równa nazwie katalogu), `data-template` w `Layout.astro` i rozpocznij zmiany w `styles.css`, `Layout.astro`, `Home.astro`.
3. Zachowaj umowę z poprzedniej sekcji (tokeny, klasy, przełącznik motywu).
4. Sprawdź: `PUBLIC_TEMPLATE=nowy npm run dev`, potem `npm run test:templates` (build, struktura WCAG) oraz `npm test` (kontrast tokenów).
5. Obejrzyj w przeglądarce jasny i ciemny motyw oraz wąski ekran. Testy nie sprawdzają wyglądu.
6. Opisz szablon w tabeli powyżej i dopisz braki do `TODO.md`.

## Co jest sprawdzane automatycznie

- `npm test`: kontrast WCAG tokenów (trzy palety) każdego szablonu oraz klas z kolorami w regułach. Klasy plakatu tylko tam, gdzie istnieją.
- `npm run test:templates`: build każdego szablonu, obecność `data-template`, struktura HTML (język, nagłówki, etykiety, nazwy linków i przycisków, alt, tabele, aria), odrzucenie nieznanego szablonu.
- `build_release.sh`: pełny potok (testy, build, weryfikacja) dla wybranego szablonu (`TEMPLATE=...`).
