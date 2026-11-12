# Lab CHM.04 – gra do ćwiczenia egzaminu praktycznego

Ćwiczenie procedur z egzaminu zawodowego CHM.04 (technik analityk, podstawa programowa 2019).
Czytasz protokół z arkusza, wpisujesz, co robisz, a gra sprawdza kolejność, BHP i typowe błędy.
Działa offline, bez zewnętrznego API.

## Uruchomienie

Potrzebny Node.js 18+.

```bash
cd chm04-praktyka
npm install
npm run dev
```

Otwórz adres, który pokaże terminal (zwykle http://localhost:5173).

- `npm test` – testy silnika oceniania (m.in. pełne przejście poziomu 1),
- `npm run build` – wersja do wrzucenia na serwer (folder `dist/`).

## Struktura

| Folder / plik | Co zawiera |
|---|---|
| `analiza-arkuszy.md` | analiza arkuszy 2023–2026, ranking metod, co może być na egzaminie |
| `arkusze/`, `zrodla/` | arkusze CKE, podstawa programowa, wyposażenie stanowisk |
| `src/procedury/*.json` | **poziomy gry** – jeden plik = jeden poziom |
| `src/silnik/` | ocenianie wpisów: dopasowanie słów, literówki, kolejność kroków, BHP |
| `src/scena/` | scena 3D (React Three Fiber): stół, sprzęt, laborant |
| `src/ui/` | panel protokołu, dziennik, pole wpisywania |

Postęp zapisuje się w przeglądarce (localStorage).

## Jak dopisać nowy poziom

Skopiuj `src/procedury/01-mydlo-naoh.json` pod nową nazwą (np. `02-ibuprofen.json`) i zmień treść.
Gra sama wczyta każdy plik `.json` z tego folderu, w kolejności nazw.

Najważniejsze pola kroku:

```json
{
  "id": "odwaz",
  "opis": "Co pokazać po poprawnym wykonaniu",
  "wymagane": [
    ["odważ", "zważ", "naważ"],
    ["mydł", "próbk"]
  ],
  "wykluczajace": ["zlewk"],
  "wymaga": ["waga"],
  "wymagaBhp": true,
  "podpowiedz": "Co zrobić (tryb ćwiczenia)",
  "dlaczego": "Dlaczego to ważne / co ocenia egzaminator",
  "sprzet": "waga",
  "stanSceny": { "kolba": "mydlo" }
}
```

- **`wymagane`** – lista grup. Wpis musi zawierać po jednym słowie z **każdej** grupy.
  Pisz **rdzenie** słów: `"odważ"` pasuje do „odważam”, „odważyć”, „odważkę”. Polskie znaki i wielkość liter nie mają znaczenia, drobne literówki są wybaczane.
  Słowo z `=` na początku (np. `"=wyłącz"`) musi być wpisane dokładnie – przydaje się, gdy dwa słowa są podobne („włącz” / „wyłącz”).
- **`wykluczajace`** – jeśli wpis zawiera któreś z tych słów, to nie ten krok (np. ważenie do zlewki to inny krok niż ważenie do kolby).
- **`wymaga`** – id kroków, które muszą być zrobione wcześniej. Brak pola = poprzedni krok z listy. `[]` = można w dowolnym momencie.
- **`wymagaBhp`** – krok z odczynnikami: zablokowany, dopóki laborant nie ma fartucha, rękawic i okularów.
- **`sprzet`** – gdzie stoi laborant: `zlew`, `waga`, `kolba`, `statyw`, `zlewka`, `odpady`, `stol`.
- **`stanSceny`** – co zmienia się na scenie, np. `"kolba": "zolty"`, `"biuretaPoziom": 1`, `"waga": "wlaczona"`.

Sekcja `bledy` na końcu pliku to typowe błędy (np. wylewanie do zlewu) – gra zawsze je wytknie.

Po dopisaniu poziomu warto uruchomić `npm test` i przejść go raz w grze.
