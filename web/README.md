# vs76project | strona lokalna

Statyczne Astro, TypeScript i CSS. Publiczny kod strony; wewnętrzna dokumentacja projektu jest przechowywana osobno.

## Szablony strony

Wygląd strony jest wymienny (`src/templates/<nazwa>`, wybór zmienną `PUBLIC_TEMPLATE`, domyślnie `classic`). Dostępne szablony, sposób przełączania, umowa i instrukcja dodawania nowego: `src/templates/README.md`. Podgląd wszystkich naraz: `bash ../scripts/dev_templates.sh`. Test każdego: `npm run test:templates`.

## Uruchomienie

```sh
cd web
npm ci
npm run dev
```

Domyślne npm run dev nasłuchuje na 0.0.0.0, więc podgląd jest dostępny w LAN pod http://<adres-IP-maszyny>:4321/. Lokalnie działa również http://127.0.0.1:4321/. Samo powiązanie interfejsu nie konfiguruje routera ani zapory. Dla podglądu wyłącznie na tej maszynie użyj npm run dev:local. Nie ustawiaj allowedHosts=true; dostęp przez adres IP nie wymaga takiego obejścia.

## Kontrole

```sh
npm test
npm run build
npm run test:build
npm run check
cd ..
python3 scripts/verify_website.py
```

Testy WCAG 2.2 (`tests/wcag-contrast.test.mjs` w `npm test`, `tests/wcag-structure.test.mjs` w `npm run test:build` i na buildzie trybu API w `npm run test:api-ui`): kontrast tokenów CSS w trzech paletach (jasna, ciemna auto, ciemna ręczna) i elementów z kolorami w regułach, struktura HTML (język, nagłówki, etykiety pól, nazwy linków i przycisków, alt, tabele, odwołania aria, link pomijający nawigację, przycisk wstrzymania animacji). Nie zastępują testu klawiaturą, czytnikiem ekranu, powiększeniem do 400% ani oceny rozmiaru celów dotyku.

Testy Node obejmują cykl motywów, składanie i ograniczanie zapytania oraz bezpieczne kodowanie mailto. Osobne test:build uruchamia faktycznie zbudowany skrypt w symulowanym środowisku DOM: przywrócenie motywu, wybór tematu, walidacja i kopiowanie z obsługą błędu. To test logiki, nie przeglądarka ani pomiar renderowania. Python sprawdza build, linki, metadane, etykiety, wybór tematu i zakres publicznych plików. Nie zastępują testu klawiaturą i w rzeczywistych rozmiarach ekranu. Browser QA tylko po zgodzie właściciela.

## Konfiguracja przed publikacją

`.env.example` zawiera trzy publiczne ustawienia. PUBLIC_CONTACT_EMAIL: potwierdzony odbiorca wiadomości. PUBLIC_SITE_URL: zatwierdzony origin HTTPS bez ścieżki. PUBLIC_INDEXING: domyślnie false; zmiana na true dopiero po decyzji o publikacji i uzupełnieniu informacji formalnych. Bez domeny nie emitujemy canonical, URL organizacji ani wpisów w sitemapie. Domyślny build ma noindex oraz robots Disallow. To wskazówki dla robotów, nie uwierzytelnianie i nie blokada dostępu do opublikowanej witryny.

Nie wpisujemy domeny na podstawie nazwy katalogu. Strona jest przygotowana do hostowania w katalogu głównym domeny; prefix wymaga dostosowania linków/base. Nie skonfigurowano hostingu, certyfikatów, DNS ani formularza zewnętrznego.

## Formularz

Domyślnie (bez `PUBLIC_CONTACT_API`) formularz działa lokalnie, jak opisano niżej. Z `PUBLIC_CONTACT_API=true` wysyła wiadomość przez `api/contact.php` (własna poczta, wyzwanie z ikoną, limity); konfiguracja przykładowa w `api/config.example.php`. Testy: `npm run test:api-ui` oraz `python3 scripts/test_contact_api.py`.

Tworzy treść lokalnie i umożliwia kopiowanie. Po potwierdzeniu e-maila pojawi się otwarcie programu pocztowego; samo przygotowanie nie wysyła wiadomości. Bez JS pola są wyłączone, zamiast wysyłania danych do statycznej ścieżki. Nie używa localStorage dla danych kontaktowych, fetch ani usług AI. localStorage przechowuje tylko wybór motywu Auto/Jasny/Ciemny.

Adres e-mail pozostaje nieustawiony, dopóki właściciel go nie potwierdzi. Nigdy nie podstawiaj realnego adresu wyłącznie z niezweryfikowanego przykładu.

## Pliki i rozwój

Treści programów i cen: src/data/trainings.ts. Zawartość musi odpowiadać publicznym kartom PDF; nie aktualizuj czasu/ceny tylko w jednym miejscu. Szablon wspólny: src/layouts/. Motyw: src/styles/global.css i skrypt inicjalizujący w head. Wszystkie teksty PL, treści programów odseparowane; EN jako kolejny etap tłumaczenia i przeglądu, bez pozornej działającej wersji językowej.

public/downloads/ zawiera wyłącznie trzy karty i katalog. Bez konspektu, danych klientów i kosztów wewnętrznych. Źródła edytowalne materiałów pozostają poza publicznym repozytorium. Fonty Noto Sans lokalnie, podzbiór łaciński z polskimi znakami; licencja w public/fonts/LICENSE-Noto.txt. Grafika udostępniana przez stronę znajduje się w public/ i src/assets/. Nie załadowano fontów, analityki ani obrazów z zewnętrznego CDN.

Przed publikacją: test ręczny lub zatwierdzony browser QA, adres kontaktowy, domena i treść formalna dotycząca administratora, poczty i hostingu. Samo zatwierdzenie projektu nie oznacza zgody na jego wdrożenie.
