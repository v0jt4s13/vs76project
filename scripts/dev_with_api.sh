#!/usr/bin/env bash
# Lokalny podgląd z działającym formularzem (CAPTCHA z 6 ikonami): serwer PHP dla web/api + Astro dev z proxy /api.
# Konfiguracja testowa powstaje w katalogu tymczasowym (losowy sekret, bez poczty), nic nie trafia do Git.
# Użycie: bash scripts/dev_with_api.sh [szablon]   (domyślnie starter; Ctrl+C kończy PHP, Astro: cd web && npx astro dev stop)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TPL="${1:-starter}"
PORT="${API_PORT:-18081}"
TMP="$(mktemp -d)"
cat > "$TMP/config.php" <<PHP
<?php
return ['secret' => '$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')', 'to' => 'test@example.com', 'from' => 'formularz@example.com',
  'transport' => 'smtp', 'smtp' => ['host' => '127.0.0.1', 'port' => 1, 'secure' => 'none', 'user' => 'x', 'pass' => 'x'],
  'allowed_origins' => ['http://127.0.0.1:4321', 'http://localhost:4321'], 'state_dir' => '$TMP/state'];
PHP
TALNET_CONFIG="$TMP/config.php" php -S "127.0.0.1:$PORT" -t "$ROOT/web/api" >"$TMP/php.log" 2>&1 &
PHP_PID=$!
trap 'kill $PHP_PID 2>/dev/null || true; rm -rf "$TMP"' EXIT
cd "$ROOT/web"
echo "Formularz: wysyłka poczty w tym trybie się nie uda (brak SMTP), ale zadanie z ikonami działa."
PUBLIC_TEMPLATE="$TPL" PUBLIC_CONTACT_API=true DEV_API_PROXY="http://127.0.0.1:$PORT" npm run dev:local -- --port 4321
# nowy Astro uruchamia serwer w tle i wraca; trzymamy PHP przy życiu
wait $PHP_PID
