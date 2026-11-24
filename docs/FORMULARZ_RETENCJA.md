# Regularne usuwanie stanu formularza

Status: przygotowane lokalnie 2026-11-24. Nie zainstalowano zadania na hostingu.

## Co usuwa polecenie

`scripts/cleanup_contact_state.php` uruchamia istniejącą procedurę sprzątania bez losowania. Usuwa pliki starsze niż 20 minut z `nonces/` i starsze niż 2 dni od ostatniej modyfikacji z `rl/`. Nie obsługuje poczty, logów hostingu ani kopii zapasowych. Nie odczytuje konfiguracji SMTP. Jest przeznaczone wyłącznie do PHP CLI, poza katalogiem publicznym.

## W dniu wdrożenia

1. Ustalić rzeczywisty katalog stanu używany przez formularz. Najlepiej skonfigurować jawne `state_dir` w prywatnej konfiguracji; katalog musi być dostępny zarówno dla PHP strony, jak i PHP CLI. Nie tworzyć osobnego katalogu wyłącznie dla crona.
2. Po osobnej zgodzie na wdrożenie przekazać aktualne `_lib.php` i skrypt sprzątający przez sprawdzony dysk SSHFS. Skrypt umieścić poza `public_html`.
3. W panelu hostingu dodać zadanie co 5 minut, pod użytkownikiem mającym dostęp do stanu. Poniżej szablon, nie gotowe polecenie z prawdziwymi ścieżkami:

```text
*/5 * * * * /SCIEZKA/DO/php /SCIEZKA/PRYWATNA/cleanup_contact_state.php /SCIEZKA/public_html/api/_lib.php /SCIEZKA/DO/STANU
```

4. Włączyć raportowanie błędów zadania i potwierdzić jego wykonanie. Nie wyciszać kodów błędu. Nie podawać sekretów w poleceniu.
5. Sprawdzić usuwanie kontrolnych, przeterminowanych plików oraz zachowanie nowych. Dopiero potem zatwierdzić opis retencji na stronie.

Przy poprawnie działającym zadaniu co 5 minut pliki są usuwane w pierwszym przebiegu po przekroczeniu progu, zwykle do około 25 minut lub 2 dni i 5 minut. Nie jest to gwarancja podczas awarii. Kopie zapasowe i logi mają osobne okresy. Kod kończy się błędem przy niedostępnym katalogu lub nieudanym usunięciu, aby zadanie mogło zgłosić problem.

Dotychczasowe sprzątanie podczas żądań pozostaje pomocnicze. Bez skonfigurowanego i sprawdzonego crona nie deklarować maksymalnych terminów fizycznego usuwania plików.
