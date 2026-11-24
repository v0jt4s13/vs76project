<?php
// vs76project | POST: walidacja i wysyłka wiadomości z formularza kontaktowego (SMTP własnej poczty).
declare(strict_types=1);
require __DIR__ . '/_lib.php';

try {
    $cfg = tn_config();
    tn_guard($cfg, 'POST');
    // Limit liczony od razu: nieudane próby też się wliczają.
    tn_rate($cfg, 'send', tn_client_key($cfg), (int) $cfg['limits']['send_per_hour'], 3600);
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > TN_MAX_BODY) {
        throw new TnError(413, 'Zgłoszenie jest za duże.');
    }
    $raw = (string) file_get_contents('php://input', false, null, 0, TN_MAX_BODY + 1);
    if (strlen($raw) > TN_MAX_BODY) {
        throw new TnError(413, 'Zgłoszenie jest za duże.');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new TnError(400, 'Nieczytelne zgłoszenie.');
    }
    // Honeypot sprawdzamy przed wyzwaniem, żeby bot nie dostał wskazówki, co zawiodło.
    if (isset($data['website']) && $data['website'] !== '') {
        throw new TnError(400, 'Nie udało się wysłać wiadomości.');
    }
    tn_check_challenge($cfg, $data['challenge_token'] ?? null, $data['selected_icon'] ?? null);
    $clean = tn_validate($data);
    tn_rate($cfg, 'total-day', 'all', (int) $cfg['limits']['send_per_day_total'], 86400);
    tn_send($cfg, $clean);
    tn_respond(['ok' => true]);
} catch (TnError $e) {
    tn_fail($e);
} catch (Throwable $e) {
    error_log('[talnet-contact] contact: ' . get_class($e));
    tn_fail(new TnError(500, 'Formularz jest chwilowo niedostępny.'));
}
