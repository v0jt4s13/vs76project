<?php
// vs76project | GET: nowe wyzwanie (ikona) dla formularza kontaktowego.
declare(strict_types=1);
require __DIR__ . '/_lib.php';

try {
    $cfg = tn_config();
    tn_guard($cfg, 'GET');
    tn_rate($cfg, 'challenge', tn_client_key($cfg), (int) $cfg['limits']['challenge_per_hour'], 3600);
    tn_respond(tn_new_challenge($cfg));
} catch (TnError $e) {
    tn_fail($e);
} catch (Throwable $e) {
    error_log('[talnet-contact] challenge: ' . get_class($e));
    tn_fail(new TnError(500, 'Formularz jest chwilowo niedostępny.'));
}
