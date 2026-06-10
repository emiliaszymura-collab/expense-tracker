# Wdrożenie serwera na Railway

## Krok 1 — Konto Salt Edge (5 minut)
1. Wejdź na https://www.saltedge.com/products/account_information
2. Kliknij "Get started" → zarejestruj się
3. Po zalogowaniu: Dashboard → Keys
4. Skopiuj **App-id** i **Secret**

## Krok 2 — Konto Railway (2 minuty)
1. Wejdź na https://railway.app
2. Zaloguj się przez GitHub

## Krok 3 — Wdróż serwer
1. Na Railway kliknij "New Project" → "Deploy from GitHub"
2. Wybierz repozytorium expense-tracker
3. Railway spyta o root directory → wpisz: **server**
4. Dodaj zmienne środowiskowe (Variables):
   - SALTEDGE_APP_ID = (twój App-id z Salt Edge)
   - SALTEDGE_SECRET = (twój Secret z Salt Edge)
   - FRONTEND_URL = https://neon-baklava-de6d2d.netlify.app
5. Kliknij Deploy

## Krok 4 — Zaktualizuj URL serwera w aplikacji
1. Skopiuj URL serwera Railway (np. https://expense-server-xyz.railway.app)
2. Dodaj do pliku .env.local w głównym folderze:
   REACT_APP_SERVER_URL=https://expense-server-xyz.railway.app
3. Zbuduj ponownie i wgraj na Netlify

## Sandbox vs Production
- Domyślnie Salt Edge działa w trybie **sandbox** — używaj testowych banków
- Produkcja wymaga weryfikacji firmy przez Salt Edge
- Dla osobistego użytku sandbox wystarczy (testowe banki działają jak prawdziwe)
