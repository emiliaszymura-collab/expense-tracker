# Spendli — przewodnik do nauki (jak zbudowano całą aplikację)

Ten plik to Twój **schemat do nauki**. Prowadzę Cię od zera przez wszystko, co składa się na Spendli: od podstaw programowania, przez bazę danych (SQL), aż po wdrożenie w internecie i własną domenę. To Twój pierwszy projekt do portfolio — a jednocześnie mapa do kariery w tworzeniu aplikacji i automatyzacji firm.

> Jak korzystać: czytaj sekcja po sekcji. Przy każdej technologii masz: **co to jest → po co → gdzie w Spendli → jak się tego uczyć dalej.**

---

## 0. Widok z lotu ptaka — jak to wszystko działa razem

```
  TELEFON / PRZEGLĄDARKA                 SERWER (Railway)              USŁUGI ZEWNĘTRZNE
 ┌─────────────────────┐   HTTPS    ┌──────────────────────┐        ┌──────────────────┐
 │  Frontend (React)   │ ─────────▶ │  Backend (Node +     │ ─────▶ │ Anthropic (AI)   │
 │  - ekrany, przyciski│  zapytania │  Express)            │        │ Enable Banking   │
 │  - logika w apce    │ ◀───────── │  - API /api/...      │ ◀───── │ (banki, PSD2)    │
 └─────────────────────┘   dane     │  - logowanie, klucze │        └──────────────────┘
        │                            │                      │
   localStorage                      └──────────┬───────────┘
   (dane na urządzeniu)                         │
                                          PostgreSQL (baza danych)
                                          - konta użytkowników
                                          - transakcje, paragony
```

**Zasada:** frontend to „to, co widzisz", backend to „mózg i strażnik kluczy", baza danych to „pamięć trwała", a usługi zewnętrzne to gotowe klocki (AI, banki), których nie budujemy sami.

---

## 1. Podstawy programowania (fundament)

**Zmienne** — pudełka na dane: `const budzet = 3000`.
**Funkcje** — przepisy wykonujące zadanie: `function dodaj(a, b) { return a + b }`.
**Warunki** — decyzje: `if (saldo < 0) { ostrzeż() }`.
**Pętle** — powtarzanie: `for (const wydatek of wydatki) { ... }`.
**Tablice i obiekty** — listy i „karty danych": `{ nazwa: "Biedronka", kwota: 45.50 }`.

W Spendli używamy **JavaScript** (język przeglądarki i Node) oraz **TypeScript** (JavaScript z „etykietami typów", które łapią błędy zanim program się uruchomi — np. że `kwota` to liczba, a nie tekst).

📚 *Nauka dalej:* „JavaScript.info" (po polsku dostępne kursy), potem TypeScript Handbook.

---

## 2. Frontend — React + TypeScript (to, co widać)

**React** to biblioteka do budowania interfejsów z **komponentów** — klocków wielokrotnego użytku. Każdy ekran Spendli to komponent:
- `Dashboard.tsx` — pulpit z wykresami i saldem,
- `LoginGate.tsx` — ekran logowania/rejestracji,
- `AccountSync.tsx` — karta „Stan konta" + „Synchronizuj teraz",
- `Navigation.tsx` — menu.

Kluczowe pojęcia React:
- **Komponent** = funkcja zwracająca „jak ma wyglądać ekran" (JSX — HTML w JavaScript).
- **Props** = dane przekazywane do komponentu (jak argumenty funkcji).
- **State (stan)** = pamięć komponentu: `const [pin, setPin] = useState('')`. Gdy stan się zmienia, ekran sam się przerysowuje.
- **Hooki** = `useState` (stan), `useEffect` (efekty uboczne, np. pobranie danych po wejściu na ekran).

**localStorage** — mała pamięć w przeglądarce/telefonie, gdzie trzymamy wydatki i cele „lokalnie na urządzeniu".

**CSS** — wygląd (kolory, układ). W Spendli: `App.css`, tryb ciemny przez zmienne CSS (`var(--bg)`), responsywność (inny układ na telefonie i komputerze).

**PWA (Progressive Web App)** — dzięki `manifest.json` aplikacja webowa może być „dodana do ekranu głównego" i działać jak natywna (ikona, splash, nazwa „Spendli").

📚 *Nauka dalej:* oficjalny tutorial React (react.dev), potem zbuduj własną małą apkę (np. lista zadań).

---

## 3. Backend — Node.js + Express (mózg i strażnik)

**Node.js** pozwala uruchamiać JavaScript **na serwerze** (nie w przeglądarce).
**Express** to framework do budowania **API** — czyli „drzwi", przez które frontend prosi o dane.

**API / endpointy** = adresy, pod które frontend wysyła zapytania:
- `POST /api/auth/register` — załóż konto,
- `POST /api/ai-chat` — zapytaj AI,
- `POST /api/eb/sync` — zsynchronizuj bank.

**Metody HTTP:** `GET` (pobierz), `POST` (wyślij/utwórz), `DELETE` (usuń).
**Middleware** = funkcja „po drodze", np. `requireAuth` sprawdza token, zanim wpuści do chronionego endpointu.

**Dlaczego backend jest ważny:** klucz do AI (Anthropic) **nigdy** nie może być w przeglądarce (każdy by go podejrzał). Dlatego frontend prosi backend, a backend — mając klucz w bezpiecznej zmiennej środowiskowej — woła AI. To był cały sens przebudowy „ukryj klucz na backendzie".

📚 *Nauka dalej:* kurs „Node + Express REST API", zbuduj proste API (np. notatki).

---

## 4. Baza danych i SQL (pamięć trwała)

**Baza danych** przechowuje dane, które muszą przetrwać restart serwera. Używamy **PostgreSQL** (popularna, darmowa baza relacyjna).

**SQL** to język zapytań do bazy. Podstawy na przykładach ze Spendli:

**Tabela** = arkusz z kolumnami i wierszami. Nasza tabela paragonów:
```sql
CREATE TABLE receipts (
  id      TEXT PRIMARY KEY,   -- unikalny identyfikator
  store   TEXT,               -- nazwa sklepu
  total   NUMERIC,            -- kwota
  user_id TEXT                -- do kogo należy (izolacja użytkowników!)
);
```

**Cztery podstawowe operacje (CRUD):**
```sql
INSERT INTO receipts (id, store, total, user_id)   -- Create (utwórz)
       VALUES ('r1', 'Lidl', 42.50, 'user123');

SELECT * FROM receipts WHERE user_id = 'user123';  -- Read (odczytaj)

UPDATE receipts SET total = 45.00 WHERE id = 'r1'; -- Update (zmień)

DELETE FROM receipts WHERE id = 'r1';              -- Delete (usuń)
```

Ważne pojęcia:
- **PRIMARY KEY** — kolumna, która jednoznacznie identyfikuje wiersz.
- **WHERE** — warunek („tylko wiersze, które…").
- **JSONB** — kolumna trzymająca dane w formacie JSON (np. lista produktów z paragonu).
- **Izolacja danych** — dodaliśmy kolumnę `user_id`, żeby każdy użytkownik widział TYLKO swoje dane (`WHERE user_id = ...`). To fundament wielu użytkowników.

W Spendli jest też prostszy wzorzec **KV (klucz–wartość)** — tabela `kv`, gdzie pod kluczem (np. `users`) trzymamy cały obiekt JSON. Wygodne do rzeczy, które nie potrzebują pełnej tabeli.

📚 *Nauka dalej:* „SQLBolt" (interaktywny kurs SQL), potem projekt z własną tabelą.

---

## 5. Logowanie i bezpieczeństwo (jak chronimy konta)

- **Hasło/PIN nie jest zapisywane wprost!** Zapisujemy **hash** (jednokierunkowy „odcisk") przez algorytm **scrypt**. Przy logowaniu porównujemy hashe. Nawet my nie znamy PIN-u użytkownika.
- **Token sesji** — po zalogowaniu backend wydaje podpisany token (HMAC), który frontend dołącza do każdego zapytania. Token zawiera `userId`, więc serwer wie, kto pyta.
- **Passkey / Face ID (WebAuthn)** — logowanie twarzą/odciskiem bez hasła; klucz kryptograficzny jest w telefonie.
- **Rate limiting** — ograniczenie liczby zapytań (20/min), żeby nikt nie „zaspamował" i nie generował kosztów.
- **HTTPS** — szyfrowane połączenie (kłódka w przeglądarce). Bez tego dane lecą „otwartym tekstem".

📚 *Pojęcia do zapamiętania:* hash vs szyfrowanie, token, uwierzytelnianie (kim jesteś) vs autoryzacja (co możesz).

---

## 6. Integracje zewnętrzne (gotowe klocki)

- **Anthropic (Claude AI)** — skanowanie paragonów (model „widzi" zdjęcie i zwraca dane) i doradca. Komunikacja przez API: wysyłamy `messages`, dostajemy tekst.
- **Enable Banking (PSD2 / Open Banking)** — bezpieczny, licencjonowany dostęp do banków. Proces: aplikacja przekierowuje użytkownika do banku → user się loguje → bank odsyła z powrotem z „kodem" → wymieniamy kod na dostęp do odczytu transakcji. To wzorzec **OAuth / redirect flow**.
  - ⚠️ Ważny szczegół, który był błędem: bank akceptuje tylko **wcześniej zarejestrowane adresy powrotne**. Po zmianie domeny trzeba dodać nowy adres w panelu Enable Banking — inaczej „Redirect URI not allowed".

📚 *Pojęcie:* API (Application Programming Interface) = umówiony sposób, w jaki programy rozmawiają.

---

## 7. Narzędzia i wdrożenie (DevOps)

- **Git** — system kontroli wersji: zapisuje historię zmian (`commit`) i pozwala cofać. **GitHub** — chmura na kod.
- **Railway** — hosting: bierze kod z GitHuba, buduje i uruchamia serwer + bazę. Auto-deploy: `git push` → nowa wersja online.
- **Zmienne środowiskowe (env)** — sekrety (klucze API, hasło do bazy) trzymane poza kodem, w ustawieniach Railway. Np. `ANTHROPIC_API_KEY`.
- **Build** — `npm run build` zamienia kod React w zoptymalizowane pliki dla przeglądarki.
- **Domena i DNS** — kupiłaś `spendliapp.com` (Spaceship). **DNS** to „książka telefoniczna internetu": rekord **CNAME** kieruje `www.spendliapp.com` na serwer Railway; **przekierowanie** wysyła gołą domenę na `www`. **SSL/certyfikat** daje HTTPS.
- **Cache** — przeglądarka zapamiętuje pliki; dlatego przy zmianach dodawaliśmy `?v=` żeby wymusić świeżą wersję.

📚 *Nauka dalej:* „Git & GitHub for beginners", potem wdróż własną stronę na Railway/Vercel.

---

## 8. Architektura Spendli — pliki i za co odpowiadają

```
expense-tracker/
├── public/            # pliki statyczne + manifest PWA + splash
│   ├── manifest.json  # nazwa "Spendli", ikony, tryb standalone
│   └── index.html     # szkielet strony + ekran startowy (splash)
├── src/               # FRONTEND (React + TypeScript)
│   ├── App.tsx        # główny komponent, stan aplikacji
│   ├── components/     # ekrany: Dashboard, LoginGate, AccountSync, ...
│   ├── authToken.ts   # token logowania po stronie klienta
│   └── icons.tsx      # profesjonalne ikony (Lucide)
├── server/            # BACKEND (Node + Express)
│   ├── index.js       # API: auth, bank, AI, paragony
│   ├── auth.js        # konta, PIN (scrypt), tokeny, passkey
│   ├── db.js          # PostgreSQL: tabele, zapytania SQL
│   ├── anthropic.js   # wywołania AI (klucz z env)
│   └── enablebanking.js # integracja z bankami (PSD2)
├── railway.json       # jak Railway ma budować/uruchamiać
└── docs/              # ten materiał + analiza prawna
```

---

## 9. Historia projektu = lekcja iteracyjnego tworzenia

Spendli powstawało **krok po kroku**, tak jak prawdziwe produkty:
1. Podstawowa apka do wydatków (localStorage).
2. Ładny wygląd: animacje, tryb ciemny, profesjonalne ikony.
3. Integracja z bankiem (PSD2) i AI (paragony, doradca).
4. **Bezpieczeństwo:** przeniesienie klucza AI na backend.
5. **Własna marka:** logo, ekran startowy, nazwa Spendli.
6. **Własna domena** + HTTPS.
7. **Wielu użytkowników:** konta, logowanie, izolacja danych.
8. Poprawki błędów (np. redirect banku, splash) i dokumentacja.

**Najważniejsza lekcja:** nie buduje się wszystkiego naraz. Robisz działającą wersję, testujesz, poprawiasz, dokładasz kolejną rzecz. Błędy (jak „Redirect URI not allowed" czy build padający na Railway) to **normalna część pracy programisty** — sztuką jest je diagnozować krok po kroku (czytać logi, sprawdzać po kolei).

---

## 10. O „PowerPoint" i prezentacji projektu w portfolio

W tej aplikacji **nie używaliśmy PowerPointa** — to narzędzie do prezentacji, nie do programowania. Ale skoro budujesz **portfolio**, oto jak zaprezentować Spendli (np. w PowerPoint / Canva / jako stronę):

Slajdy, które robią wrażenie na rekruterze/kliencie:
1. **Problem** — „Trudno kontrolować wydatki i widzieć realne saldo".
2. **Rozwiązanie** — Spendli: automatyczny import z banku + AI + cele.
3. **Zrzuty ekranu** — pulpit, skan paragonu, wykresy.
4. **Technologie** — React, TypeScript, Node, PostgreSQL, PSD2, AI.
5. **Wyzwania i jak je rozwiązałaś** — bezpieczeństwo klucza, wielu użytkowników, wdrożenie na własną domenę.
6. **Efekt** — działająca apka pod `spendliapp.com`, gotowa do pokazania.

To pokazuje nie tylko „umiem klikać", ale **myślenie produktowe** — bardzo cenne w automatyzacji firm.

---

## 11. Twoja ścieżka dalej (app dev + automatyzacja firm)

Kolejność, która ma sens:
1. **Podstawy:** JavaScript → TypeScript → HTML/CSS.
2. **Frontend:** React (zbuduj 2–3 małe apki).
3. **Backend:** Node + Express + REST API.
4. **Bazy danych:** SQL (PostgreSQL) + podstawy projektowania tabel.
5. **Integracje/automatyzacja:** API zewnętrzne, webhooki, narzędzia low-code (n8n, Make, Zapier) — idealne do **automatyzacji firm**.
6. **Wdrożenia:** Git/GitHub, Railway/Vercel, domeny, HTTPS.
7. **Bezpieczeństwo i RODO** — bo pracujesz z danymi ludzi.

Spendli dotknęło **wszystkich** tych obszarów — dlatego jest świetnym pierwszym projektem. Wracaj do tego pliku, gdy chcesz sobie przypomnieć, „jak to było zrobione i dlaczego".

---

## 12. Mini-słowniczek

| Termin | Znaczenie w skrócie |
|---|---|
| Frontend | Część widoczna dla użytkownika (przeglądarka) |
| Backend | Serwer: logika, klucze, dostęp do bazy |
| API / endpoint | „Drzwi" do wymiany danych między programami |
| React | Biblioteka do budowy interfejsów z komponentów |
| TypeScript | JavaScript z typami (mniej błędów) |
| Node.js | JavaScript na serwerze |
| SQL | Język zapytań do bazy danych |
| PostgreSQL | Konkretna baza danych |
| Hash | Jednokierunkowy „odcisk" hasła (nieodwracalny) |
| Token | Podpisany „bilet" potwierdzający zalogowanie |
| PSD2 / Open Banking | Regulacje umożliwiające bezpieczny dostęp do banku |
| OAuth / redirect flow | Wzorzec logowania przez przekierowanie do usługi |
| PWA | Aplikacja webowa działająca jak natywna |
| DNS / CNAME | „Książka telefoniczna" internetu, kierowanie domeny |
| SSL/HTTPS | Szyfrowane, bezpieczne połączenie |
| Git / GitHub | Kontrola wersji kodu + chmura |
| Deploy | Wdrożenie/opublikowanie aplikacji |
| Env (zmienne środowiskowe) | Sekrety poza kodem |
| Rate limiting | Ograniczenie liczby zapytań |

---

*Powodzenia — masz już za sobą to, czego wielu uczy się miesiącami: prawdziwą aplikację od pomysłu do własnej domeny. To solidny pierwszy punkt portfolio.* 🚀
