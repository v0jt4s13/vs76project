#!/usr/bin/env bash
# Uruchamia serwery podglądu wszystkich szablonów naraz, każdy na własnym porcie (4321, 4322, ...), żeby porównywać je obok siebie.
# Użycie: bash scripts/dev_templates.sh [nazwa ...]    Zatrzymanie: Ctrl+C
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"
if [ "$#" -gt 0 ]; then NAMES=("$@"); else
  NAMES=(); for d in src/templates/*/; do n="$(basename "$d")"; case "$n" in _*) continue;; esac; [ -f "$d/Layout.astro" ] && [ -f "$d/Home.astro" ] && NAMES+=("$n"); done
fi
PIDS=(); PORT=4321; TEMPLATE_PORTS=""
for n in "${NAMES[@]}"; do
  [ -n "$TEMPLATE_PORTS" ] && TEMPLATE_PORTS+=","
  TEMPLATE_PORTS+="$n:$PORT"
  PORT=$((PORT+1))
done
PORT=4321
for n in "${NAMES[@]}"; do
  if (echo >"/dev/tcp/127.0.0.1/$PORT") >/dev/null 2>&1; then
    echo "Port $PORT jest zajęty. Zatrzymaj wcześniejszy serwer Astro i uruchom ponownie." >&2
    exit 1
  fi
  PORT=$((PORT+1))
done
PORT=4321
trap 'kill "${PIDS[@]}" 2>/dev/null || true' EXIT INT TERM
for n in "${NAMES[@]}"; do
  PUBLIC_TEMPLATE="$n" PUBLIC_TEMPLATE_PORTS="$TEMPLATE_PORTS" ASTRO_TELEMETRY_DISABLED=1 node_modules/node/bin/node node_modules/astro/bin/astro.mjs dev --host 0.0.0.0 --port "$PORT" --ignore-lock >/dev/null 2>&1 &
  PIDS+=($!); echo "szablon $n: http://127.0.0.1:$PORT/"; PORT=$((PORT+1))
done
echo "Ctrl+C zatrzymuje wszystkie serwery."
wait
