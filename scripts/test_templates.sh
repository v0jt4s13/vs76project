#!/usr/bin/env bash
# Buduje każdy szablon strony (src/templates/<nazwa>) do web/dist-tpl-<nazwa>/ i sprawdza strukturę WCAG oraz znacznik szablonu.
# Użycie: bash scripts/test_templates.sh [nazwa ...]   (bez argumentów: wszystkie szablony)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"
if [ "$#" -gt 0 ]; then NAMES=("$@"); else
  NAMES=(); for d in src/templates/*/; do n="$(basename "$d")"; case "$n" in _*) continue;; esac; [ -f "$d/Layout.astro" ] && [ -f "$d/Home.astro" ] && NAMES+=("$n"); done
fi
[ "${#NAMES[@]}" -gt 0 ] || { echo "Brak szablonów w web/src/templates"; exit 2; }
for n in "${NAMES[@]}"; do
  echo "=== szablon: $n"
  rm -rf "dist-tpl-$n"
  PUBLIC_TEMPLATE="$n" ASTRO_TELEMETRY_DISABLED=1 node_modules/node/bin/node node_modules/astro/bin/astro.mjs build --outDir "dist-tpl-$n" >/dev/null
  grep -q "data-template=\"$n\"" "dist-tpl-$n/index.html" || { echo "BŁĄD: brak data-template=\"$n\" w index.html"; exit 1; }
  for f in "dist-tpl-$n/kontakt/index.html" "dist-tpl-$n/edukacja/index.html" "dist-tpl-$n/szkolenia/index.html"; do [ -f "$f" ] || { echo "BŁĄD: brak $f"; exit 1; }; done
  WCAG_DIST="dist-tpl-$n" node_modules/node/bin/node --test tests/wcag-structure.test.mjs 2>&1 | grep -E "^# (pass|fail|skipped)|^not ok" || true
  if WCAG_DIST="dist-tpl-$n" node_modules/node/bin/node --test tests/wcag-structure.test.mjs >/dev/null 2>&1; then echo "OK: $n"; else echo "BŁĄD testów struktury: $n"; exit 1; fi
done
echo "--- nieznany szablon musi zatrzymać build"
if PUBLIC_TEMPLATE="__nie_ma__" ASTRO_TELEMETRY_DISABLED=1 node_modules/node/bin/node node_modules/astro/bin/astro.mjs build --outDir dist-tpl-x >/dev/null 2>&1; then echo "BŁĄD: build z nieznanym szablonem nie powinien się udać"; exit 1; else echo "OK: nieznany szablon odrzucony"; fi
rm -rf dist-tpl-x
echo "GOTOWE: ${NAMES[*]}"
