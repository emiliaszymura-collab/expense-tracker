#!/usr/bin/env bash
# Utrzymuje aktualne IP maszyny w DuckDNS (opcjonalne — Oracle zwykle ma stałe IP,
# ale to zabezpiecza, gdyby się zmieniło).
#
# Konfiguracja przez zmienne środowiskowe:
#     DUCK_DOMAIN=blask   (sama nazwa, bez .duckdns.org)
#     DUCK_TOKEN=xxxxxxxx (token ze strony duckdns.org)
#
# Ustawienie automatu (co 5 min) — na serwerze:
#     ( crontab -l 2>/dev/null; echo "*/5 * * * * DUCK_DOMAIN=blask DUCK_TOKEN=TWOJ_TOKEN bash $PWD/duckdns.sh" ) | crontab -
set -euo pipefail
: "${DUCK_DOMAIN:?ustaw DUCK_DOMAIN=nazwa}"
: "${DUCK_TOKEN:?ustaw DUCK_TOKEN=token}"
OUT=$(curl -s "https://www.duckdns.org/update?domains=${DUCK_DOMAIN}&token=${DUCK_TOKEN}&ip=")
echo "$(date -Iseconds) duckdns: ${OUT}"
