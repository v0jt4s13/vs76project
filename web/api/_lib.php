<?php
// vs76project | formularz kontaktowy: wspólny kod endpointów challenge.php i contact.php.
// PHP 7.4+. Bez zależności. Nie zapisuje treści wiadomości; do limitów trzyma tylko skróty adresów IP.
declare(strict_types=1);

// Lista ikon wyzwania. Etykiety po polsku są w web/src/scripts/site.ts (te same klucze).
const TN_ICONS = ['square', 'users', 'clock', 'mail', 'pin', 'shield', 'check', 'bars'];
// Muszą odpowiadać web/src/scripts/contact-utils.mjs (pilnuje tego scripts/test_contact_api.py).
const TN_TOPICS = ['AI w codziennej pracy', 'Projektowanie pilota AI', 'AI Security w firmie', 'Szkolenie z narzędzi AI', 'Przegląd zasad korzystania z AI', 'AI w edukacji', 'Doradztwo', 'Współpraca B2B', 'Pomoc w wyborze'];
const TN_FORMATS = ['Do ustalenia', 'Online', 'Stacjonarnie'];
const TN_CHALLENGE_TTL = 600;
const TN_MAX_BODY = 16384;

final class TnError extends Exception
{
    /** @var int */
    public $status;
    /** @var string */
    public $kind;

    public function __construct(int $status, string $message, string $kind = '')
    {
        parent::__construct($message);
        $this->status = $status;
        $this->kind = $kind;
    }
}

function tn_respond(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function tn_fail(TnError $e): void
{
    $body = ['ok' => false, 'komunikat' => $e->getMessage()];
    if ($e->kind !== '') {
        $body['kod'] = $e->kind;
    }
    tn_respond($body, $e->status);
}

/** Ładuje konfigurację spoza katalogu publicznego (lub z TALNET_CONFIG). */
function tn_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $candidates = [];
    $env = getenv('TALNET_CONFIG');
    if (is_string($env) && $env !== '') {
        $candidates[] = $env;
    }
    // Hostingi z open_basedir (np. cyber_Folks) widzą tylko katalog publiczny i /tmp: wtedy konfiguracja
    // musi leżeć w api/config.php (blokowany w .htaccess). Plik nad katalogiem publicznym jest wariantem
    // dla hostingów bez takiego ograniczenia.
    $candidates[] = __DIR__ . '/config.php';
    $docroot = isset($_SERVER['DOCUMENT_ROOT']) ? (string) $_SERVER['DOCUMENT_ROOT'] : '';
    if ($docroot !== '') {
        $candidates[] = dirname(rtrim($docroot, '/')) . '/talnet-config.php';
    }
    foreach ($candidates as $path) {
        if (@is_file($path)) {
            $loaded = require $path;
            if (is_array($loaded)) {
                $cfg = tn_validate_config($loaded);
                return $cfg;
            }
        }
    }
    // Szczegóły wyłącznie do logu serwera (nie do odpowiedzi HTTP): pomagają znaleźć przyczynę, np. open_basedir.
    $checked = [];
    foreach ($candidates as $path) {
        $checked[] = $path . ' is_file=' . (@is_file($path) ? '1' : '0') . ' readable=' . (@is_readable($path) ? '1' : '0');
    }
    $last = error_get_last();
    error_log('[talnet-contact] brak pliku konfiguracji; docroot=' . $docroot . '; sprawdzono: ' . implode(' | ', $checked)
        . '; open_basedir=' . (string) ini_get('open_basedir') . '; php=' . PHP_VERSION
        . ($last ? '; ostatni_blad=' . $last['message'] : ''));
    throw new TnError(503, 'Formularz jest chwilowo niedostępny.', 'config-brak');
}

function tn_validate_config(array $c): array
{
    $secret = isset($c['secret']) && is_string($c['secret']) ? $c['secret'] : '';
    $okMail = static function ($v) {
        return is_string($v) && filter_var($v, FILTER_VALIDATE_EMAIL) !== false;
    };
    if (strlen($secret) < 32 || !$okMail($c['to'] ?? null) || !$okMail($c['from'] ?? null)) {
        error_log('[talnet-contact] niepełna konfiguracja (secret, to, from)');
        throw new TnError(503, 'Formularz jest chwilowo niedostępny.', 'config-niepelna');
    }
    $transport = $c['transport'] ?? 'smtp';
    if (!in_array($transport, ['smtp', 'mail'], true)) {
        throw new TnError(503, 'Formularz jest chwilowo niedostępny.', 'config-transport');
    }
    $c['transport'] = $transport;
    $c['smtp'] = isset($c['smtp']) && is_array($c['smtp']) ? $c['smtp'] : [];
    $c['allowed_origins'] = isset($c['allowed_origins']) && is_array($c['allowed_origins']) ? $c['allowed_origins'] : [];
    $limits = isset($c['limits']) && is_array($c['limits']) ? $c['limits'] : [];
    $c['limits'] = $limits + [
        'send_per_hour' => 5,        // wysyłki na adres IP (liczone także nieudane próby)
        'challenge_per_hour' => 60,  // pobrania wyzwania na adres IP
        'send_per_day_total' => 100, // łączny dzienny limit wysyłek
        'min_solve_seconds' => 3,    // minimalny czas od wydania wyzwania do wysłania
    ];
    return $c;
}

// --- stan (limity, jednorazowość wyzwań) ----------------------------------------------

function tn_state_dir(array $cfg): string
{
    static $dir = null;
    if ($dir !== null) {
        return $dir;
    }
    $docroot = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/') : '';
    $options = [];
    if (!empty($cfg['state_dir']) && is_string($cfg['state_dir'])) {
        $options[] = $cfg['state_dir'];
    } elseif ($docroot !== '') {
        $options[] = dirname($docroot) . '/talnet-state';
    }
    $options[] = sys_get_temp_dir() . '/talnet-' . substr(hash('sha256', $cfg['secret']), 0, 12);
    foreach ($options as $path) {
        if ((@is_dir($path) || @mkdir($path, 0700, true)) && @is_writable($path)) {
            @mkdir($path . '/nonces', 0700, true);
            @mkdir($path . '/rl', 0700, true);
            $dir = $path;
            tn_prune($path);
            return $dir;
        }
    }
    error_log('[talnet-contact] brak zapisywalnego katalogu stanu; próbowano: ' . implode(' | ', $options) . '; open_basedir=' . (string) ini_get('open_basedir'));
    throw new TnError(503, 'Formularz jest chwilowo niedostępny.', 'katalog-stanu');
}

/** Sporadyczne sprzątanie starych plików stanu. */
function tn_prune(string $dir, bool $force = false): int
{
    if (!$force && random_int(1, 50) !== 1) {
        return 0;
    }
    $removed = 0;
    $now = time();
    foreach (['nonces' => TN_CHALLENGE_TTL * 2, 'rl' => 2 * 86400] as $sub => $ttl) {
        $files = glob($dir . '/' . $sub . '/*');
        if (!is_array($files)) {
            continue;
        }
        foreach ($files as $f) {
            if (is_file($f) && $now - (int) @filemtime($f) > $ttl) {
                if (@unlink($f)) {
                    $removed++;
                } elseif ($force && file_exists($f)) {
                    throw new RuntimeException('Nie udało się usunąć pliku stanu.');
                }
            }
        }
    }
    return $removed;
}

function tn_client_key(array $cfg): string
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
    $header = $cfg['trusted_ip_header'] ?? null;
    if (is_string($header) && $header !== '') {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $header));
        if (!empty($_SERVER[$key])) {
            $ip = trim(explode(',', (string) $_SERVER[$key])[0]);
        }
    }
    return hash_hmac('sha256', $ip, $cfg['secret']);
}

/** Zlicza zdarzenie w oknie czasowym; przy przekroczeniu rzuca 429. */
function tn_rate(array $cfg, string $bucket, string $subject, int $limit, int $window): void
{
    $path = tn_state_dir($cfg) . '/rl/' . $bucket . '-' . $subject . '.json';
    $fp = @fopen($path, 'c+');
    if ($fp === false) {
        error_log('[talnet-contact] nie można otworzyć pliku limitu');
        throw new TnError(503, 'Formularz jest chwilowo niedostępny.', 'plik-limitu');
    }
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $times = json_decode($raw === false || $raw === '' ? '[]' : $raw, true);
    $times = is_array($times) ? $times : [];
    $now = time();
    $times = array_values(array_filter($times, static function ($t) use ($now, $window) {
        return is_int($t) && $now - $t < $window;
    }));
    if (count($times) >= $limit) {
        flock($fp, LOCK_UN);
        fclose($fp);
        throw new TnError(429, 'Zbyt wiele prób. Spróbuj ponownie później.');
    }
    $times[] = $now;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($times));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

// --- wyzwanie (ikona) ------------------------------------------------------------------

function tn_b64url(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function tn_b64url_decode(string $s): string
{
    $out = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    return $out === false ? '' : $out;
}

function tn_sign(array $payload, string $secret): string
{
    $body = tn_b64url(json_encode($payload));
    return $body . '.' . hash_hmac('sha256', $body, $secret);
}

function tn_new_challenge(array $cfg): array
{
    $pool = TN_ICONS;
    for ($i = count($pool) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        $tmp = $pool[$i];
        $pool[$i] = $pool[$j];
        $pool[$j] = $tmp;
    }
    $options = array_slice($pool, 0, 6);
    $now = time();
    $payload = [
        'target' => $options[random_int(0, 5)],
        'options' => $options,
        'issued' => $now,
        'expires' => $now + TN_CHALLENGE_TTL,
        'nonce' => bin2hex(random_bytes(12)),
    ];
    return [
        'token' => tn_sign($payload, $cfg['secret']),
        'target' => $payload['target'],
        'options' => $options,
        'expires_in' => TN_CHALLENGE_TTL,
    ];
}

/** Sprawdza podpis, ważność, minimalny czas, jednorazowość i wybraną ikonę. */
function tn_check_challenge(array $cfg, $token, $icon): void
{
    $bad = static function ($msg = 'Niepoprawne wyzwanie. Spróbuj ponownie.') {
        return new TnError(400, $msg, 'challenge');
    };
    if (!is_string($token) || substr_count($token, '.') !== 1 || !is_string($icon)) {
        throw $bad();
    }
    list($body, $sig) = explode('.', $token, 2);
    $expected = hash_hmac('sha256', $body, $cfg['secret']);
    if (!hash_equals($expected, $sig)) {
        throw $bad();
    }
    $payload = json_decode(tn_b64url_decode($body), true);
    if (!is_array($payload) || !isset($payload['target'], $payload['options'], $payload['issued'], $payload['expires'], $payload['nonce'])) {
        throw $bad();
    }
    $now = time();
    if ((int) $payload['expires'] < $now) {
        throw $bad('Wyzwanie wygasło. Spróbuj ponownie.');
    }
    if ($now - (int) $payload['issued'] < (int) $cfg['limits']['min_solve_seconds']) {
        throw $bad('Za szybko. Spróbuj ponownie za chwilę.');
    }
    // Token jest jednorazowy: zużywamy go przy pierwszej próbie, także nieudanej.
    $mark = tn_state_dir($cfg) . '/nonces/' . hash('sha256', (string) $payload['nonce']);
    $fp = @fopen($mark, 'x');
    if ($fp === false) {
        throw $bad('Wyzwanie zostało już użyte. Spróbuj ponownie.');
    }
    fclose($fp);
    if (!is_array($payload['options']) || array_diff($payload['options'], TN_ICONS) !== [] || !in_array($payload['target'], $payload['options'], true) || $icon !== $payload['target']) {
        throw $bad('Wybierz prawidłową ikonę.');
    }
}

// --- walidacja ---------------------------------------------------------------------------

function tn_line($v, int $max, bool $required, string $label): string
{
    if ($v === null) {
        $v = '';
    }
    if (!is_string($v)) {
        throw new TnError(400, "Pole $label ma niepoprawny format.");
    }
    $v = trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v));
    if ($required && $v === '') {
        throw new TnError(400, "Pole $label jest wymagane.");
    }
    if (mb_strlen($v, 'UTF-8') > $max) {
        throw new TnError(400, "Pole $label jest za długie.");
    }
    return $v;
}

function tn_validate(array $d): array
{
    if (isset($d['website']) && $d['website'] !== '') {
        throw new TnError(400, 'Nie udało się wysłać wiadomości.'); // honeypot
    }
    $topic = isset($d['topic']) && is_string($d['topic']) && in_array($d['topic'], TN_TOPICS, true) ? $d['topic'] : 'Pomoc w wyborze';
    $format = isset($d['format']) && is_string($d['format']) && in_array($d['format'], TN_FORMATS, true) ? $d['format'] : 'Do ustalenia';
    $name = tn_line($d['name'] ?? '', 100, true, 'imię i nazwisko');
    $email = tn_line($d['email'] ?? '', 160, true, 'e-mail');
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        throw new TnError(400, 'Podaj prawidłowy adres e-mail.');
    }
    $company = tn_line($d['company'] ?? '', 160, false, 'firma');
    $people = tn_line($d['people'] ?? '', 30, false, 'liczba osób');
    $message = $d['message'] ?? '';
    if (!is_string($message)) {
        throw new TnError(400, 'Pole cel i kontekst ma niepoprawny format.');
    }
    $message = trim(str_replace(["\r\n", "\r"], "\n", $message));
    $message = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $message);
    $len = mb_strlen($message, 'UTF-8');
    if ($len < 15) {
        throw new TnError(400, 'Opisz cel i kontekst w co najmniej 15 znakach.');
    }
    if ($len > 2500) {
        throw new TnError(400, 'Opis jest za długi (maksymalnie 2500 znaków).');
    }
    return compact('topic', 'format', 'name', 'email', 'company', 'people', 'message');
}

// --- wysyłka -------------------------------------------------------------------------------

function tn_build_message(array $cfg, array $d): array
{
    $domain = substr((string) strrchr($cfg['from'], '@'), 1);
    $subject = 'Zapytanie ze strony vs76project.pl: ' . $d['topic'];
    $text = "Dzień dobry,\n\nchcę porozmawiać o: {$d['topic']}.\n\n"
        . 'Firma / zespół: ' . ($d['company'] !== '' ? $d['company'] : 'do ustalenia') . "\n"
        . "Osoba kontaktowa: {$d['name']}\n"
        . "E-mail: {$d['email']}\n"
        . 'Liczba osób: ' . ($d['people'] !== '' ? $d['people'] : 'do ustalenia') . "\n"
        . "Forma: {$d['format']}\n\n"
        . "Cel i kontekst:\n{$d['message']}\n\n"
        . "Proszę o kontakt w sprawie zakresu i terminu.\n";
    $headers = [
        'Date' => date('r'),
        'From' => 'vs76project formularz <' . $cfg['from'] . '>',
        'To' => '<' . $cfg['to'] . '>',
        'Reply-To' => '<' . $d['email'] . '>',
        'Subject' => '=?UTF-8?B?' . base64_encode($subject) . '?=',
        'Message-ID' => '<' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => 'base64',
        'X-Mailer' => 'talnet-contact',
    ];
    $body = chunk_split(base64_encode($text), 76, "\r\n");
    return ['headers' => $headers, 'body' => $body, 'subject' => $subject, 'text' => $text];
}

function tn_render_headers(array $headers, array $skip = []): string
{
    $lines = [];
    foreach ($headers as $name => $value) {
        if (!in_array($name, $skip, true)) {
            $lines[] = $name . ': ' . $value;
        }
    }
    return implode("\r\n", $lines);
}

function tn_send(array $cfg, array $d): void
{
    $m = tn_build_message($cfg, $d);
    try {
        if ($cfg['transport'] === 'mail') {
            $extra = tn_render_headers($m['headers'], ['To', 'Subject', 'Date']);
            if (!mail($cfg['to'], $m['headers']['Subject'], $m['body'], $extra, '-f' . $cfg['from'])) {
                throw new RuntimeException('mail() zwróciło false');
            }
            return;
        }
        $raw = tn_render_headers($m['headers']) . "\r\n\r\n" . $m['body'];
        TnSmtp::send($cfg['smtp'], $cfg['from'], $cfg['to'], $raw, substr((string) strrchr($cfg['from'], '@'), 1));
    } catch (Throwable $e) {
        error_log('[talnet-contact] wysyłka nieudana: ' . get_class($e) . ': ' . $e->getMessage());
        throw new TnError(502, 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
    }
}

final class TnSmtp
{
    /** @var resource */
    private $fp;

    public static function send(array $smtp, string $from, string $to, string $raw, string $heloName): void
    {
        $host = isset($smtp['host']) ? (string) $smtp['host'] : '';
        $port = isset($smtp['port']) ? (int) $smtp['port'] : 587;
        $secure = isset($smtp['secure']) ? (string) $smtp['secure'] : 'tls';
        if ($host === '' || !in_array($secure, ['tls', 'ssl', 'none'], true)) {
            throw new RuntimeException('niepoprawna konfiguracja SMTP');
        }
        $loopback = in_array($host, ['localhost', '127.0.0.1', '::1'], true);
        if ($secure === 'none' && !$loopback) {
            throw new RuntimeException('SMTP bez szyfrowania dozwolony tylko dla localhost');
        }
        $verify = !isset($smtp['verify_peer']) || (bool) $smtp['verify_peer'];
        $ctx = stream_context_create(['ssl' => [
            'verify_peer' => $verify,
            'verify_peer_name' => $verify,
            'peer_name' => isset($smtp['peer_name']) && is_string($smtp['peer_name']) ? $smtp['peer_name'] : $host,
            'SNI_enabled' => true,
        ]]);
        $target = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $fp = @stream_socket_client($target, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
        if (!is_resource($fp)) {
            throw new RuntimeException("połączenie SMTP nieudane ($errno)");
        }
        stream_set_timeout($fp, 10);
        $c = new self();
        $c->fp = $fp;
        try {
            $c->expect(220);
            $c->cmd('EHLO ' . ($heloName !== '' ? $heloName : 'localhost'), 250);
            if ($secure === 'tls') {
                $c->cmd('STARTTLS', 220);
                if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('STARTTLS nieudane');
                }
                $c->cmd('EHLO ' . ($heloName !== '' ? $heloName : 'localhost'), 250);
            }
            if (!empty($smtp['user'])) {
                $c->cmd('AUTH PLAIN ' . base64_encode("\0" . $smtp['user'] . "\0" . ($smtp['pass'] ?? '')), 235);
            }
            $c->cmd('MAIL FROM:<' . $from . '>', 250);
            $c->cmd('RCPT TO:<' . $to . '>', 250);
            $c->cmd('DATA', 354);
            $data = str_replace(["\r\n", "\r", "\n"], "\n", $raw);
            $data = str_replace("\n", "\r\n", $data);
            $data = (string) preg_replace('/^\./m', '..', $data);
            fwrite($fp, rtrim($data, "\r\n") . "\r\n.\r\n");
            $c->expect(250);
            @fwrite($fp, "QUIT\r\n");
        } finally {
            @fclose($fp);
        }
    }

    private function cmd(string $line, int $ok): void
    {
        if (fwrite($this->fp, $line . "\r\n") === false) {
            throw new RuntimeException('zapis do SMTP nieudany');
        }
        $this->expect($ok);
    }

    private function expect(int $ok): void
    {
        $code = 0;
        do {
            $line = fgets($this->fp, 1024);
            if ($line === false) {
                throw new RuntimeException('brak odpowiedzi SMTP');
            }
            $code = (int) substr($line, 0, 3);
        } while (isset($line[3]) && $line[3] === '-');
        if ($code !== $ok) {
            throw new RuntimeException("SMTP odpowiedział $code zamiast $ok");
        }
    }
}

/** Wspólne sprawdzenia żądania: metoda, origin. */
function tn_guard(array $cfg, string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        throw new TnError(405, 'Niedozwolona metoda.');
    }
    if ($method === 'POST') {
        // Endpoint accepts JSON only, not cross-site HTML form encodings.
        $contentType = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
        if ($contentType !== 'application/json') {
            throw new TnError(415, 'Wymagany format zgłoszenia: application/json.');
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && $cfg['allowed_origins'] !== [] && !in_array($origin, $cfg['allowed_origins'], true)) {
            throw new TnError(403, 'Niedozwolone źródło żądania.');
        }
    }
}
