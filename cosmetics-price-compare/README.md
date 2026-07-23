# Blask — porównywarka cen kosmetyków (aplikacja desktopowa)

Aplikacja Electron do porównywania cen kosmetyków w polskich drogeriach
(Rossmann, Hebe, Notino, Douglas, Sephora, Superpharm, Ezebra, e.Leclerc).

## Uruchomienie

Wymagany Node.js 20+.

```bash
cd cosmetics-price-compare
npm install
npm start
```

Linki „Kup" otwierają się w domyślnej przeglądarce systemowej
(obsługa w `main.js` przez `shell.openExternal`).

## Budowanie instalatora

```bash
npm run dist
```

Tworzy instalator dla bieżącego systemu (Windows: NSIS `.exe`,
macOS: `.dmg`, Linux: AppImage) w katalogu `dist/`.

## Struktura

```
main.js              — proces główny Electrona (okno, otwieranie linków zewnętrznych)
renderer/index.html  — struktura strony
renderer/styles.css  — style (jasny design inspirowany Apple)
renderer/data.js     — dane demonstracyjne: sklepy, kategorie, produkty
renderer/app.js      — logika: wyszukiwarka, filtry, strona produktu, ulubione, alerty
```

## Zdjęcia produktów

Przy pierwszym uruchomieniu aplikacja pobiera prawdziwe zdjęcia produktów
z Open Beauty Facts (otwarta baza zdjęć rzeczywistych produktów) i cache'uje
adresy lokalnie. Bez dostępu do sieci karty pokazują wektorowe ilustracje.
W wersji produkcyjnej zdjęcia pochodziłyby z oficjalnych feedów sklepów
(sieci afiliacyjne udostępniają je partnerom wraz z cenami).

## Masowy import katalogu produktów (Open Beauty Facts)

`sync/import-catalog.mjs` pobiera realne produkty marek z otwartej bazy
Open Beauty Facts (ODbL) — nazwy, marki, zdjęcia, kody EAN — i zapisuje je do
`renderer/catalog.js`. Dzięki temu wyszukiwarka zna tysiące prawdziwych
produktów offline (ceny dokłada synchronizacja feedów). Wymaga internetu.

```bash
node sync/import-catalog.mjs                  # wszystkie marki z rejestru
node sync/import-catalog.mjs "Ziaja" "CeraVe" # wybrane marki
```

## Automatyczna codzienna synchronizacja (zalecane)

`sync/sync.mjs` to narzędzie, które codziennie pobiera feedy sklepów i
generuje `renderer/feed.js` (produkty, ceny, promocje, linki, zdjęcia) oraz
`renderer/brands.js` (pełna lista marek wyciągana automatycznie z feedów —
nowa marka w sklepie pojawia się w aplikacji sama). Wykrywa też nowe i
zakończone promocje względem poprzedniego dnia. Konfiguracja adresów feedów:
`sync/feeds.config.json`; harmonogram (cron / Harmonogram zadań / GitHub
Action): `sync/README-cron.md`.

```bash
node sync/sync.mjs      # jednorazowo
```

## Import prawdziwej bazy sklepów (feedy produktowe)

Pełne katalogi sklepów (nazwa, marka, cena, link partnerski, zdjęcie, EAN)
pobiera się legalnie jako feedy produktowe z sieci afiliacyjnych po dołączeniu
do programu partnerskiego danego sklepu (Awin, webePartners, TradeDoubler,
Conversand). Import:

1. Pobierz feed każdego sklepu i zapisz jako `feeds/<Sklep>.csv`
   (np. `feeds/Notino.csv`, `feeds/Hebe.csv`),
2. `node scripts/import-feed.mjs`,
3. `npm start`.

Skrypt scala oferty tego samego produktu z różnych sklepów po kodzie EAN,
generuje `renderer/feed.js` i od tego momentu aplikacja pokazuje prawdziwy
katalog: ceny, zdjęcia sklepowe i linki partnerskie zamiast bazy demo.

## Wyszukiwarka i katalog

Wyszukiwarka łączy dwa źródła: produkty śledzone w porównywarce (pełne
tabele cen) oraz otwarty katalog Open Beauty Facts przeszukiwany na żywo —
wpisać można dowolny kosmetyk. Produkt spoza porównywarki dostaje kartę
z przyciskami "Szukaj w Rossmann/Hebe/Notino..." (deep-linki do wyszukiwarek
sklepów) i opcją dodania do listy życzeń. Przyciski "Kup" przy cenach również
prowadzą do wyszukiwania danego produktu w wybranym sklepie.

## Dane

Ceny i produkty w `renderer/data.js` są demonstracyjne. W wersji produkcyjnej
ten plik zastępuje się feedem cenowym (API sklepów / sieci afiliacyjnych),
a adresy w `STORES[].url` — linkami partnerskimi do konkretnych produktów.
