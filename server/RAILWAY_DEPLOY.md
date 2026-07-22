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
3. Root directory zostaw **puste** (główny katalog repo).
   Plik `railway.json` w roocie sam uruchomi serwer przez `node index.js`.
   (Możesz też ustawić root directory na `server` — działa tak samo.)
4. Dodaj zmienne środowiskowe (Variables):
   - FRONTEND_URL = https://neon-baklava-de6d2d.netlify.app
   - AUTH_SECRET = (dowolny długi losowy ciąg — dzięki temu logowanie
     przetrwa restarty; bez tego sesje resetują się po każdym redeployu)
   - (opcjonalnie, dla banków/AI) SALTEDGE_APP_ID, SALTEDGE_SECRET,
     ANTHROPIC_API_KEY, GC_SECRET_ID, GC_SECRET_KEY, EB_APP_ID, EB_PRIVATE_KEY
   - (opcjonalnie) dodaj usługę **PostgreSQL** — Railway wstrzyknie DATABASE_URL
     i dane przetrwają restarty (bez tego działa pamięć ulotna)
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
