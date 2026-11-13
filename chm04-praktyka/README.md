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

## Karta wyników i pomiary (pole `karta` w pliku poziomu)

Każdy poziom może mieć kartę wyników jak w arkuszu. Opisuje się ją w polu `karta`:

- **`losuj`** – pomiary losowane dla każdego podejścia. Wartość z przedziału (`od`, `do`), z listy (`wybierz`) albo ze wzoru (`wzor`) z wcześniejszych wartości; `szum` to błąd pomiaru, `krok` – zaokrąglenie (np. 0.05 cm³ dla biurety), `miejsca` – liczba miejsc po przecinku.
- **`odczyty`** – co gracz widzi i musi przepisać: `waga`, `wyswietlacz` (pehametr, refraktometr…), `biureta` (powiększenie z meniskiem), `papierek` (pasek i skala pH), `krzywa` (krzywa miareczkowania), `info` (np. etykieta produktu).
- **`sekcje`** – tabele i pola do wypełnienia. W tabeli `"pole": "m{i}"` daje pola `m1`, `m2`, `m3`.
- **`brudnopis`** – podpowiedź, jak liczyć proporcjami; linia zaczynająca się od `~` to proporcja (wiersze rozdzielone ` | `).
- **`kryteria`** – co jest oceniane. Każde kryterium ma listę sprawdzeń (`sprawdz`), wszystkie muszą być spełnione:
  - `liczba` – wpis równy wzorowi ± `tol`. We wzorze `m1` to wylosowany pomiar, a `$m1` to wpis gracza (dzięki temu obliczenia z własnych danych są zaliczane nawet po złym odczycie),
  - `miejsca` – wymagana liczba miejsc po przecinku,
  - `tekst` – wpis zawiera jedno ze słów,
  - `rownanie` – równanie reakcji (cząstki po lewej i prawej stronie, w dowolnej kolejności),
  - `rozrzut` – wyniki nie różnią się o więcej niż `max`,
  - `wybor` – wniosek zależny od wyniku („spełnia” / „nie spełnia”),
  - `tekstRazem` – nazwa sprzętu razem z pojemnością.

We wzorach działają: `+ - * / ( )`, `sr(...)`, `abs`, `min`, `max`, `zaokr(x, n)`.

Pole `scena` ustawia napisy na butelkach i to, który pomiar pokazuje waga (`masaWagi`) i powiększenie biurety (`odczytBiureta`).

## Lista poziomów

Poziomy 1–8 są z arkuszy CHM.04 (2023–2026). Poziomy 9–11 to metody z podstawy programowej, których jeszcze nie było w arkuszach (refraktometria, polarymetria, spektrofotometria) – procedury typowe, liczby przykładowe.

Wszystkie poziomy generuje `scripts/poziomy.py` (wspólne kroki, np. zestaw do miareczkowania i porządkowanie, są tam zapisane raz). Pliki JSON można edytować ręcznie, ale ponowne uruchomienie skryptu je nadpisze.

`npm test` sprawdza dla każdego poziomu, że da się go przejść wpisami z pól `przyklad` i że poprawnie wypełniona karta dostaje komplet punktów.
