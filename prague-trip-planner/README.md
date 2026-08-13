# Planer Pragi 🗺️

Mobilny planer wycieczki do Pragi — działa jak mini Google Maps z nałożonym
planem podróży. React + Vite + TypeScript, mapa OpenStreetMap (bez klucza API),
offline-first PWA.

## Uruchomienie

```bash
cd prague-trip-planner
npm install
npm run dev        # tryb deweloperski
npm run build      # statyczny build do dist/
npm run preview    # podgląd builda
```

Aplikacja jest mobile-first (min. 375 px), z ciemnym motywem domyślnie.

## Funkcje

### 🗺️ Mapa
- Markery kolorowane wg kategorii: nocleg (niebieski), prysznic (turkusowy),
  zwiedzanie (zielony), klub (fioletowy), jedzenie (pomarańczowy), parking (szary).
- Tap na marker → karta z nazwą, godzinami, kosztem, notatką i przyciskiem
  **Nawiguj** (deep link do Google Maps, pieszo lub autem).
- Filtrowanie po kategorii (checkboxy nad mapą).
- Przełącznik **Dzień 1 / Dzień 2** — pokazuje tylko markery i trasę danego dnia.
- Linia trasy między punktami w kolejności zwiedzania (trasa piesza z OSRM,
  fallback do prostych linii, gdy brak sieci).

### 📋 Plan (oś czasu)
- Lista miejsc w kolejności zwiedzania z orientacyjną godziną.
- Tap na pozycję → mapa centruje się na miejscu.

### 💰 Koszty
- Kalkulator paliwa: spalanie (l/100km) × dystans (km) × cena (zł/l).
- Edytowalny kurs CZK → PLN (domyślnie 0,183).
- Automatyczne przeliczenie wszystkich pozycji na PLN, suma całkowita i koszt/osobę.
- Winieta CZ (10-dniowa, 300 CZK) jako pozycja kosztowa (nie na mapie).
- Możliwość dopisania własnych pozycji (bilet do klubu, jedzenie itp.).

### 📴 Tryb offline (PWA)
- Service worker (vite-plugin-pwa / Workbox) cache'uje zasoby aplikacji,
  kafelki mapy OSM (cache-first) i trasy OSRM.
- Po pierwszym wejściu aplikacja działa bez sieci — dane trasy trzymane są
  w kodzie, stan użytkownika w `localStorage`.
- Live-nawigacja (Google Maps) wymaga oczywiście sieci.

## Struktura

```
src/
  data/trip.ts        # seed: realne miejsca w Pradze + koszty
  lib/
    geo.ts            # OSRM routing, deep link Google Maps, Haversine
    costs.ts          # kalkulacja i przeliczenia walut
    storage.ts        # warstwa localStorage
  components/
    MapView.tsx       # mapa Leaflet + markery + trasa
    MapControls.tsx   # przełącznik dnia + filtr kategorii
    LocationCard.tsx  # dolna karta miejsca
    Timeline.tsx      # oś czasu dnia
    Costs.tsx         # kalkulator kosztów
    BottomNav.tsx     # dolna nawigacja
  App.tsx             # orkiestracja widoków i stanu
```

## Dane

Miejsca (`src/data/trip.ts`) z researchu: P+R Holešovice (parking + baza),
JOHN REED (prysznic), Stare Miasto, Most Karola, Zamek Praski, Cross Club
(dzień 1); prysznic, Vyšehrad, Wieża Žižkov (dzień 2). Współrzędne i koszty
zgodne z ogólnodostępnymi danymi — traktuj kwoty orientacyjnie i zweryfikuj
przed wyjazdem.
