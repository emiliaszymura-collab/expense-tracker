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

## Dane

Ceny i produkty w `renderer/data.js` są demonstracyjne. W wersji produkcyjnej
ten plik zastępuje się feedem cenowym (API sklepów / sieci afiliacyjnych),
a adresy w `STORES[].url` — linkami partnerskimi do konkretnych produktów.
