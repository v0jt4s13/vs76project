#!/usr/bin/env bash
# Buduje paczkę statyczną do wgrania na hosting (np. cyber_Folks). Niczego nie publikuje.
# Użycie:
#   bash scripts/build_release.sh                                   # paczka testowa: noindex, bez domeny
#   bash scripts/build_release.sh DOMENA EMAIL [index]              # np. talnet.example kontakt@talnet.example index
# Szablon strony (web/src/templates): zmienna TEMPLATE, np. TEMPLATE=starter bash scripts/build_release.sh DOMENA EMAIL. Domyślnie classic.
# DOMENA bez https:// i bez ukośnika. Trzeci argument "index" włącza indeksowanie; bez niego noindex.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${1:-}"; EMAIL="${2:-}"; INDEX="${3:-}"
STAMP="$(date +%Y%m%d)"
OUT_BASE="${RELEASE_OUT:-$ROOT/deliverables/release}"
if [ -n "$DOMAIN" ]; then
  [[ "$DOMAIN" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]] || { echo "Niepoprawna domena: $DOMAIN (małe litery, bez https://)"; exit 2; }
  [ -n "$EMAIL" ] || { echo "Podaj adres e-mail kontaktowy jako drugi argument"; exit 2; }
  [[ "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { echo "Niepoprawny e-mail: $EMAIL"; exit 2; }
  NAME="$DOMAIN-$STAMP"; SITE_URL="https://$DOMAIN"
else
  NAME="staging-$STAMP"; SITE_URL=""; EMAIL=""; INDEX=""
fi
TEMPLATE="${TEMPLATE:-classic}"; export PUBLIC_TEMPLATE="$TEMPLATE"
# Paczki z szablonem innym niż classic mają szablon w nazwie, żeby nie myliły się z domyślną.
[ "$TEMPLATE" != "classic" ] && NAME="$NAME-$TEMPLATE"
INDEXING=false; [ "$INDEX" = "index" ] && INDEXING=true
cd "$ROOT/web"
# 1) kontrole i testy UI na neutralnym buildzie (tryb "przygotuj i skopiuj")
npm run check && npm test
PUBLIC_SITE_URL= PUBLIC_CONTACT_EMAIL= PUBLIC_INDEXING=false PUBLIC_CONTACT_API=false npm run build && npm run test:build
# 2) testy formularza w trybie wysyłki przez serwer (UI) i endpointów PHP (bez sieci zewnętrznej)
npm run test:api-ui
(cd "$ROOT" && python3 scripts/test_contact_api.py)
# 3) build docelowy
CONTACT_API=false; [ -n "$DOMAIN" ] && CONTACT_API=true
export PUBLIC_SITE_URL="$SITE_URL" PUBLIC_CONTACT_EMAIL="$EMAIL" PUBLIC_INDEXING="$INDEXING" PUBLIC_CONTACT_API="$CONTACT_API"
npm run build
if [ "$CONTACT_API" = true ]; then
  mkdir -p dist/api
  cp api/_lib.php api/challenge.php api/contact.php dist/api/
fi
# Zasoby plakatu są używane tylko przez classic.
if [ "$TEMPLATE" = starter ]; then
  rm -f dist/poster/*.svg
  rmdir dist/poster 2>/dev/null || true
fi
# .htaccess: baza + przekierowanie HTTPS/www tylko dla paczki z domeną (paczka testowa działa też po http)
cp deploy/htaccess.base dist/.htaccess
if [ -n "$DOMAIN" ]; then
  ESC="${DOMAIN//./\\.}"
  cat >> dist/.htaccess <<HT

# HTTPS i brak www (wymaga aktywnego certyfikatu SSL w panelu hostingu)
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\\.$ESC\$ [NC]
RewriteRule ^ https://$DOMAIN%{REQUEST_URI} [R=301,L]
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !=https
RewriteRule ^ https://$DOMAIN%{REQUEST_URI} [R=301,L]
<IfModule mod_headers.c>
  # Na start krótki czas; po sprawdzeniu działania HTTPS podnieś do 31536000
  Header always set Strict-Transport-Security "max-age=86400"
</IfModule>
HT
fi
cd "$ROOT"
python3 scripts/verify_release.py --template "$TEMPLATE" --domain "$DOMAIN" --email "$EMAIL" $([ "$INDEXING" = true ] && echo --index)
DEST="$OUT_BASE/$NAME"
[ ! -e "$DEST" ] && [ ! -e "$DEST.zip" ] || { echo "Cel istnieje: $DEST (usuń lub zmień datę)"; exit 3; }
mkdir -p "$DEST"
cp -a web/dist/. "$DEST/"
(cd "$DEST" && zip -qr "../$NAME.zip" . -x '.DS_Store')
[ "$CONTACT_API" = true ] && cp web/api/config.example.php "$OUT_BASE/$NAME.talnet-config.example.php"
(cd "$OUT_BASE" && sha256sum "$NAME.zip" > "$NAME.zip.sha256")
# Utrzymanie: osobny katalog, nigdy do public_html ani do ZIP strony.
MAINTENANCE="$OUT_BASE/$NAME-maintenance"
mkdir -p "$MAINTENANCE"
cp "$ROOT/scripts/cleanup_contact_state.php" "$ROOT/docs/FORMULARZ_RETENCJA.md" "$MAINTENANCE/"
echo "GOTOWE: $DEST (zawartość do public_html) oraz $OUT_BASE/$NAME.zip"
[ "$CONTACT_API" = true ] && echo "Formularz: wysyłka przez api/*.php. Skonfiguruj talnet-config.php na serwerze wg $OUT_BASE/$NAME.talnet-config.example.php (docs/DEPLOY_CYBERFOLKS.md)."
echo "Szablon strony: $TEMPLATE"
echo "Tryb: $([ -n "$DOMAIN" ] && echo "$SITE_URL, indeksowanie=$INDEXING" || echo 'testowy (noindex, bez domeny i e-maila)')"
