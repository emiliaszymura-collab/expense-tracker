#!/usr/bin/env bash
# ============================================================================
# Blask — instalacja na darmowym VPS (Oracle Cloud Always Free, Ubuntu 22/24)
#
# Użycie na ŚWIEŻEJ maszynie (po zalogowaniu przez SSH):
#     wget https://raw.githubusercontent.com/emiliaszymura-collab/expense-tracker/main/deploy/setup.sh
#     bash setup.sh                      # bez domeny (tylko http://IP)
#     bash setup.sh blask.pl             # z domeną + darmowy HTTPS (Let's Encrypt)
#
# WAŻNE (Oracle): najpierw w panelu chmury otwórz porty 80 i 443 w Security List
# (patrz deploy/README.md), inaczej strona nie będzie widoczna z internetu.
# ============================================================================
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/emiliaszymura-collab/expense-tracker.git"
APPDIR="/var/www/blask"

echo ">> [1/5] Aktualizacja systemu + nginx/git"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx git curl

echo ">> [2/5] Pobranie aplikacji z GitHuba"
sudo rm -rf /tmp/blask-src
git clone --depth 1 "$REPO" /tmp/blask-src
sudo mkdir -p "$APPDIR"
sudo rm -rf "${APPDIR:?}/"*
sudo cp -r /tmp/blask-src/cosmetics-price-compare/renderer/* "$APPDIR"/

echo ">> [3/5] Konfiguracja nginx"
sudo tee /etc/nginx/sites-available/blask >/dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN:-_};
    root ${APPDIR};
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
    location ~* \.(js|css|png|jpg|jpeg|svg|woff2?)\$ { expires 7d; add_header Cache-Control "public"; }
    gzip on; gzip_types text/css application/javascript image/svg+xml;
}
NGINX
sudo ln -sf /etc/nginx/sites-available/blask /etc/nginx/sites-enabled/blask
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">> [4/5] Firewall maszyny (Oracle Ubuntu blokuje porty w iptables)"
sudo iptables -I INPUT -p tcp --dport 80  -j ACCEPT || true
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT || true
# zapis reguł na trwałe (przetrwają restart)
echo 'iptables-persistent iptables-persistent/autosave_v4 boolean true'  | sudo debconf-set-selections
echo 'iptables-persistent iptables-persistent/autosave_v6 boolean true'  | sudo debconf-set-selections
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent || true
sudo netfilter-persistent save 2>/dev/null || true

echo ">> [5/5] HTTPS (Let's Encrypt)"
if [ -n "$DOMAIN" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  if sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos \
        -m "admin@$DOMAIN" --redirect; then
    echo "   HTTPS gotowe."
  else
    echo "   !! Certbot nie przeszedł — najpewniej domena jeszcze nie wskazuje na IP tej maszyny."
    echo "   Ustaw rekord A (@ i www) na IP poniżej, odczekaj kilka–kilkanaście minut i uruchom:"
    echo "      sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  fi
else
  echo "   (pominięto — nie podano domeny)"
fi

IP=$(curl -s ifconfig.me || echo "IP-maszyny")
echo ""
echo "============================================================"
echo " GOTOWE ✅   Blask działa na:  http://$IP/"
[ -n "$DOMAIN" ] && echo "             oraz (po HTTPS):  https://$DOMAIN/"
echo " Aktualizacja później:  bash deploy/update.sh"
echo "============================================================"
