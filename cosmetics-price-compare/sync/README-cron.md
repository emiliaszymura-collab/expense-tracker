# Codzienna synchronizacja Blask

`sync/sync.mjs` pobiera feedy sklepów, scala je po EAN i generuje
`renderer/feed.js` (produkty, ceny, promocje, linki, zdjęcia) oraz
`renderer/brands.js` (automatyczna lista marek — bez ręcznego dopisywania).

## Jednorazowo

```bash
node sync/sync.mjs
```

## Konfiguracja

W `sync/feeds.config.json` dla każdego sklepu wklej adres feedu z panelu
afiliacyjnego (Awin / webePartners / TradeDoubler) i ustaw `"enabled": true`.
Plik zawiera Twój identyfikator afiliacyjny, więc jest w `.gitignore`.

## Codziennie automatycznie

### Linux / macOS (cron) — codziennie o 6:00
```bash
crontab -e
# dodaj linię (podmień ścieżkę):
0 6 * * * cd /ścieżka/do/cosmetics-price-compare && /usr/bin/node sync/sync.mjs >> sync/data/sync.log 2>&1
```

### Windows (Harmonogram zadań)
Utwórz zadanie codzienne uruchamiające:
```
node C:\ścieżka\cosmetics-price-compare\sync\sync.mjs
```

### W chmurze (serwer produkcyjny)
Ten sam skrypt uruchamiaj cronem serwera albo jako GitHub Action
(`schedule: cron`) i publikuj wygenerowane `feed.js` / `brands.js`.

## Co daje codzienna synchronizacja

- **Ceny** aktualne na dziś w każdym sklepie,
- **Promocje** — cena przekreślona; skrypt raportuje NOWE i ZAKOŃCZONE
  promocje względem wczoraj (`sync/data/promos-*.json`),
- **Marki** — pełna, aktualna lista wyciągana wprost z feedów; nowa marka
  w sklepie pojawia się w aplikacji sama, bez zmian w kodzie,
- **Zdjęcia i linki partnerskie** — prosto od sklepów.
