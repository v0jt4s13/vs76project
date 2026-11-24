# vs76project | strona WWW

Kod statycznej strony vs76project: Astro, TypeScript, CSS oraz formularz kontaktowy w PHP. Dwa szablony: `starter` i `classic`. Materiały w `web/public/` są zasobami przeznaczonymi dla odwiedzających stronę.

## Uruchomienie

Wymagane: npm oraz Python 3 (pakowanie bannerów). Testy API wymagają PHP. Archiwa bannerów powstają automatycznie przed buildem i nie są przechowywane w Git.

```sh
cd web
npm ci
PUBLIC_TEMPLATE=starter npm run dev:local
```

Dla podglądu w sieci lokalnej użyj `npm run dev`. Serwera developerskiego nie należy wystawiać do Internetu.

## Sprawdzenie i budowanie

```sh
cd web
npm run check
npm test
npm run test:templates
PUBLIC_TEMPLATE=starter npm run build
npm run test:build
cd ..
python3 scripts/test_contact_api.py
```

Testy PHP uruchamiają lokalny serwer i atrapę SMTP, bez wysyłania prawdziwej poczty. Build nie jest publikacją. Konfiguracja przykładowa: `web/.env.example` i `web/api/config.example.php`; dane produkcyjne zapisuj wyłącznie w ignorowanych plikach. Formularz wymaga skonfigurowania SMTP, sekretu, dozwolonych originów oraz katalogu stanu. Sprzątanie stanu opisuje `docs/FORMULARZ_RETENCJA.md`.

## Zakres publiczny

Repozytorium zawiera kod strony, testy, publiczne zasoby i niezbędne skrypty. Wewnętrzne decyzje, oferty B2B, materiały trenera, dane administratora, konfiguracja produkcyjna, raporty, artefakty i prywatna historia projektu nie są częścią publikacji.

Lokalna checklista `/odbior/` pojawia się tylko w trybie developerskim, jeżeli istnieje prywatny plik `docs/checklista-odbioru.html`. Nie jest potrzebna do uruchomienia strony i nie trafia do builda.

Szczegóły pracy nad stroną: [web/README.md](web/README.md). Licencje fontów i źródła zdjęć znajdują się przy zasobach. Publiczna dostępność repozytorium nie stanowi zgody na wykorzystanie marki lub materiałów szkoleniowych.
