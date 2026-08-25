# Jak podpiąć PRAWDZIWE ceny do Blask

Silnik jest gotowy i **przetestowany** — pobiera feedy sklepów (CSV/XML), scala
ten sam produkt po kodzie **EAN**, wykrywa promocje i linki, i codziennie (06:00)
aktualizuje aplikację **za darmo na GitHub Actions**. Brakuje tylko jednego:
**adresów feedów produktowych** z Twoich programów afiliacyjnych.

> Uczciwie: to jedyny krok, którego nie zrobię za Ciebie — wymaga Twojego konta
> i akceptacji do programów sklepów. Ale gdy zdobędziesz adresy, reszta dzieje
> się sama.

---

## 1. Co to jest „feed" i skąd go wziąć
Feed produktowy to plik (CSV lub XML), który sklep udostępnia **partnerom
afiliacyjnym** — z nazwą produktu, marką, **EAN**, ceną, ceną sprzed promocji,
linkiem i zdjęciem. Dostajesz go po zapisaniu się do **sieci afiliacyjnej** i
akceptacji do **programu danego sklepu**.

Główne sieci w Polsce (sprawdź, w której jest dany sklep — bywa różnie):
- **webePartners**, **Awin**, **TradeTracker**, **ConvertSocial / Admitad**, **MyLead**.
- Drogerie/perfumerie (Rossmann, Hebe, Notino, Douglas, Sephora, Superpharm, Ezebra)
  najczęściej znajdziesz w webePartners / Awin / TradeTracker.

## 2. Kroki (dla każdego sklepu)
1. **Zarejestruj się** jako wydawca (publisher) w sieci afiliacyjnej.
2. **Złóż wniosek** do programu sklepu (podaj stronę `blask.pl` i/lub kanał TikTok —
   przechodzi łatwiej, gdy widać realny ruch/treści).
3. Po **akceptacji** w panelu sklepu znajdź **„Feed produktowy / Product feed /
   CSV / XML"** i skopiuj **adres URL** (zawiera Twój identyfikator).

## 3. Wklej adres bezpiecznie (GitHub Secrets)
Adres zawiera Twój ID — **nie wkleja się go do repo**, tylko do Sekretów:
1. Repo → **Settings → Secrets and variables → Actions → New repository secret**.
2. Nazwa = jak w configu, np. **`ROSSMANN_FEED_URL`**, wartość = skopiowany URL.
   (kolejne: `HEBE_FEED_URL`, `NOTINO_FEED_URL`, `DOUGLAS_FEED_URL`,
   `SEPHORA_FEED_URL`, `SUPERPHARM_FEED_URL`, `EZEBRA_FEED_URL`.)
3. W `sync/feeds.config.json` ustaw temu sklepowi **`"enabled": true`**
   (pole `url` jest już ustawione na `env:NAZWA`).

## 4. Odpal
- **Automatycznie**: codziennie o 06:00 (workflow „Blask — synchronizacja katalogu").
- **Ręcznie od razu**: repo → **Actions** → ten workflow → **Run workflow**.

Po synchronizacji aplikacja pokazuje **prawdziwe ceny**, promocje i porównanie
między sklepami. Dopóki żaden feed nie jest włączony — działa baza demo.

## 5. Format feedu (dobra wiadomość)
Silnik sam mapuje typowe kolumny (Awin, Google Merchant, polskie nazwy):
`nazwa/name/product_name`, `marka/brand`, `ean/gtin`, `cena/price/search_price`,
`cena_przed/rrp`, `url/deep_link`, `image_url`, `kategoria/category`.
Jeśli sklep ma **nietypowe nagłówki** — wyślij mi jeden wiersz nagłówka, dopiszę
mapowanie w `sync/sync.mjs` (`COL = {...}`).

## 6. Wymóg scalania: EAN
Porównanie „ten sam produkt w kilku sklepach" działa po **EAN/GTIN**. Upewnij się,
że feed ma tę kolumnę (prawie zawsze ma). Bez EAN produkty scalają się słabiej
(po marce+nazwie).

---

### Bez serwera
To wszystko chodzi **za darmo na GitHub Actions** — komputer/serwer nie musi być
włączony. Serwer taty przyda się dopiero, jeśli zechcesz odświeżać **częściej niż
raz dziennie** albo dołożyć własny scraper poza feedami.
