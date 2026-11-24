<?php
// vs76project | przykładowa konfiguracja formularza kontaktowego. NIE zawiera sekretów.
//
// Gdzie położyć plik (kolejność wyszukiwania):
//   1. wskazany zmienną środowiskową TALNET_CONFIG,
//   2. `api/config.php` obok endpointów (jedyna opcja na hostingach z open_basedir ograniczonym do
//      katalogu publicznego, np. cyber_Folks; plik jest blokowany w .htaccess, a PHP bez odpowiedzi nic nie wypisuje),
//   3. `talnet-config.php` w katalogu NAD katalogiem publicznym (hostingi bez takiego ograniczenia, bezpieczniejsze).
// Plik nigdy nie trafia do Git ani do paczki release. Prawa pliku: 600 lub 640.
return [
    // Losowy ciąg min. 32 znaki: php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
    'secret' => 'WSTAW_LOSOWY_CIAG_MIN_32_ZNAKI',

    // Gdzie trafia wiadomość i z jakiego adresu jest wysyłana (skrzynka na Twojej domenie).
    'to' => 'kontakt@twoja-domena.pl',
    'from' => 'formularz@twoja-domena.pl',

    // 'smtp' (zalecane, własny serwer poczty) albo 'mail' (funkcja mail() PHP, bez logowania).
    'transport' => 'smtp',
    'smtp' => [
        'host' => 'WPISZ_SERWER_SMTP_Z_PANELU_HOSTINGU',
        'port' => 587,           // 587 + 'tls' (STARTTLS) albo 465 + 'ssl'
        'secure' => 'tls',       // 'tls' | 'ssl' | 'none' (tylko dla localhost)
        'user' => 'formularz@twoja-domena.pl',
        'pass' => 'WSTAW_HASLO_SKRZYNKI',
        'verify_peer' => true,   // wyłącz tylko przy pewności, że certyfikat serwera nie pasuje do nazwy
        // 'peer_name' => 'mail.twoja-domena.pl', // gdy certyfikat jest wystawiony na inną nazwę niż host
    ],

    // Dozwolone źródła żądań POST (ochrona przed użyciem formularza z cudzej strony).
    'allowed_origins' => ['https://twoja-domena.pl', 'https://www.twoja-domena.pl'],

    // Opcjonalnie: katalog na liczniki limitów i zużyte wyzwania (zapisywalny, najlepiej poza katalogiem publicznym).
    // Domyślnie: katalog `talnet-state` obok katalogu publicznego, a gdy to niemożliwe (open_basedir) katalog tymczasowy /tmp.
    // 'state_dir' => '/sciezka/do/talnet-state',

    // Opcjonalnie: nagłówek z adresem klienta, jeśli przed PHP działa zaufane proxy (np. 'X-Forwarded-For').
    // Domyślnie używany jest REMOTE_ADDR.
    // 'trusted_ip_header' => null,

    // Opcjonalnie: własne limity (wartości domyślne poniżej).
    // 'limits' => ['send_per_hour' => 5, 'challenge_per_hour' => 60, 'send_per_day_total' => 100, 'min_solve_seconds' => 3],
];
