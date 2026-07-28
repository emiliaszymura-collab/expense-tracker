# Blask — szablony wiadomości do afiliacji i sklepów

Gotowe teksty do skopiowania. Uzupełnij pola w `[nawiasach]`.

---

## 1. Rejestracja w sieci afiliacyjnej (opis serwisu we wniosku)

> **Nazwa serwisu:** Blask — porównywarka cen kosmetyków
> **URL:** https://emiliaszymura-collab.github.io/expense-tracker/
> **Kategoria:** uroda / kosmetyki / porównywarka cen
>
> **Opis:** Blask to niezależna porównywarka cen kosmetyków w polskich
> drogeriach i perfumeriach (Rossmann, Hebe, Notino, Douglas, Sephora,
> Superpharm, eZebra). Użytkownik wpisuje nazwę produktu lub marki i widzi,
> gdzie kupi go najtaniej, wraz z ceną za 100 ml, promocjami i linkiem do
> sklepu. Serwis jest bezpłatny dla użytkowników i utrzymuje się z prowizji
> afiliacyjnych. Model promocji: porównywarka cen / content / linki
> partnerskie w kartach produktów.
>
> **Model ruchu:** SEO na frazy produktowe („[marka] najtaniej"), treści
> porównawcze, social (Instagram/TikTok „ten sam kosmetyk — 3 ceny").

---

## 2. Zgłoszenie do programu sklepu (przez sieć afiliacyjną)

> Dzień dobry,
>
> Zgłaszam serwis **Blask** (https://emiliaszymura-collab.github.io/expense-tracker/)
> do Państwa programu partnerskiego. Blask to porównywarka cen kosmetyków —
> prezentujemy oferty w kartach produktów i kierujemy do sklepu użytkowników
> gotowych na zakup. Chętnie podłączymy Państwa feed produktowy, aby ceny,
> promocje i zdjęcia były zawsze aktualne.
>
> Pozdrawiam,
> [Imię i nazwisko], Blask — [e-mail]

---

## 3. Bezpośredni mail do sklepu / marki (gdy nie ma programu w sieci)

> Temat: Współpraca afiliacyjna — porównywarka cen Blask
>
> Dzień dobry,
>
> Nazywam się [Imię i nazwisko] i prowadzę **Blask** — porównywarkę cen
> kosmetyków (https://emiliaszymura-collab.github.io/expense-tracker/).
> Pomagamy klientom znaleźć najniższą cenę danego produktu i kierujemy ich
> do sklepu w momencie decyzji zakupowej.
>
> Chciałabym dodać Państwa ofertę do porównywarki w modelu afiliacyjnym
> (rozliczenie za sprzedaż, CPS). Potrzebowałabym dostępu do feedu
> produktowego (nazwa, marka, cena, EAN, link, zdjęcie) — obsługujemy formaty
> CSV oraz XML (Google Merchant). Aktualizację cen prowadzimy codziennie
> automatycznie.
>
> Czy moglibyśmy umówić się na krótką rozmowę lub czy jest osoba, do której
> najlepiej skierować temat współpracy afiliacyjnej?
>
> Pozdrawiam serdecznie,
> [Imię i nazwisko]
> Blask · [e-mail] · [telefon]

---

## 4. Po akceptacji — podłączenie feedu (techniczne, dla Ciebie)

1. Pobierz z panelu afiliacyjnego URL feedu produktowego danego sklepu.
2. Wpisz go w `sync/feeds.config.json` (pole `url`) i ustaw `"enabled": true`.
   - Adres zawiera Twój identyfikator — trzymaj go w sekretach repo, nie w kodzie.
3. Uruchom `node sync/sync.mjs` lokalnie **albo** poczekaj na codzienny automat.
4. Od tej chwili karty produktów pokazują prawdziwe ceny, promocje, zdjęcia
   sklepowe i linki partnerskie zamiast danych demonstracyjnych.

Sieci do rejestracji: **webePartners** (webepartners.pl), **Awin** (ui.awin.com),
**TradeDoubler**. Programy do zgłoszenia: Notino, Douglas, Sephora, Hebe,
eZebra, Rossmann, Superpharm.
