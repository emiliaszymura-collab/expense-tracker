#!/usr/bin/env bash
# Aktualizacja Blask na VPS do najnowszej wersji z GitHuba (gałąź main).
# Użycie:  bash update.sh
set -euo pipefail
REPO="https://github.com/emiliaszymura-collab/expense-tracker.git"
APPDIR="/var/www/blask"
TMP="/tmp/blask-src-$$"

git clone --depth 1 "$REPO" "$TMP"
sudo rm -rf "${APPDIR:?}/"*
sudo cp -r "$TMP"/cosmetics-price-compare/renderer/* "$APPDIR"/
rm -rf "$TMP"
sudo systemctl reload nginx
echo "Zaktualizowano ✅  ($APPDIR)"
