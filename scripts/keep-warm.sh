#!/usr/bin/env bash
# Keeps a free-tier hosted API from going to sleep (it idles out after ~15 minutes and then needs ~30s
# to wake, which the app reports as "dataset unavailable"). Read-only dataset endpoints only: no
# recommendations, discovery or assistant calls, so this never spends provider or model budget.
#
#   scripts/keep-warm.sh [BASE_URL]        default: https://nook-api-demo.onrender.com
#   KEEP_WARM_INTERVAL=240 scripts/keep-warm.sh
set -u

BASE_URL="${1:-https://nook-api-demo.onrender.com}"
INTERVAL="${KEEP_WARM_INTERVAL:-240}"
SLOW_SECONDS=5
CITY_ID="us-tx-austin"

case "$BASE_URL" in
  https://*|http://localhost*|http://127.0.0.1*) ;;
  *) echo "Refusing non-HTTPS base URL: $BASE_URL" >&2; exit 2 ;;
esac

probe() {
  local path="$1" seconds code
  # Output is discarded on purpose; only status and latency matter.
  read -r code seconds < <(curl -s -m 90 -o /dev/null -w '%{http_code} %{time_total}' "${BASE_URL}${path}" || echo "000 90")
  printf '%s  %-34s HTTP %s  %ss' "$(date '+%H:%M:%S')" "$path" "$code" "$seconds"
  if [ "$code" != "200" ]; then printf '  <-- FAILED\n'; return 1; fi
  if awk -v s="$seconds" -v max="$SLOW_SECONDS" 'BEGIN { exit !(s > max) }'; then printf '  <-- slow (server was asleep)\n'; else printf '\n'; fi
}

echo "Keeping ${BASE_URL} warm every ${INTERVAL}s. Ctrl-C to stop."
while true; do
  probe /health
  probe /v1/cities
  probe "/v1/cities/${CITY_ID}/spots"
  sleep "$INTERVAL"
done
