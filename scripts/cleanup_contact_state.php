<?php
// Uruchamiane przez cron/CLI; nie umieszczać w public_html.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
if ($argc !== 3 || !is_file($argv[1]) || !is_dir($argv[2])) {
    fwrite(STDERR, "Użycie: php cleanup_contact_state.php /pełna/ścieżka/api/_lib.php /pełna/ścieżka/stanu\n");
    exit(1);
}
try {
    require $argv[1];
    $dir = realpath($argv[2]);
    foreach (['nonces', 'rl'] as $sub) {
        if (!is_dir($dir . '/' . $sub) || !is_readable($dir . '/' . $sub) || !is_writable($dir . '/' . $sub)) {
            throw new RuntimeException('Brak dostępu do katalogów stanu.');
        }
    }
    printf("Usunięte przeterminowane pliki: %d\n", tn_prune($dir, true));
} catch (Throwable $e) {
    fwrite(STDERR, "Sprzątanie nie powiodło się: " . $e->getMessage() . "\n");
    exit(1);
}
