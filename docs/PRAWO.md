# Spendli — analiza prawna udostępniania aplikacji

> ⚠️ **Zastrzeżenie:** Nie jestem prawnikiem, a ten dokument to **materiał informacyjny**, nie porada prawna. Aplikacja przetwarza dane finansowe i bankowe — to obszar szczególnie wrażliwy. **Przed udostępnieniem aplikacji szerzej (znajomym „na poważnie", publicznie, a zwłaszcza odpłatnie) skonsultuj się z prawdziwym prawnikiem** specjalizującym się w RODO / prawie nowych technologii. Poniżej masz mapę tematów, o które trzeba zadbać i zapytać.

---

## 1. Czym jest Spendli w oczach prawa
Twoja aplikacja:
- przechowuje **dane osobowe** użytkowników (nazwa konta, PIN – jako hash, ewentualnie e-mail),
- łączy się z **bankiem** i czyta **transakcje + saldo** (dane finansowe – kategoria najbardziej wrażliwa),
- wysyła treści do **zewnętrznego AI (Anthropic)** przy skanowaniu paragonów i doradcy,
- działa w **UE / Polsce** → obowiązuje **RODO (GDPR)** i przepisy krajowe.

To oznacza, że **stajesz się „administratorem danych osobowych"** (data controller) w rozumieniu RODO w momencie, gdy dane przetwarzają inne osoby niż Ty.

---

## 2. RODO / GDPR — Twoje główne obowiązki
1. **Podstawa prawna przetwarzania** — najczęściej *zgoda użytkownika* (art. 6 ust. 1 lit. a) i/lub *wykonanie umowy* (lit. b). Użytkownik musi świadomie zgodzić się na przetwarzanie.
2. **Polityka prywatności** — obowiązkowy dokument mówiący: jakie dane zbierasz, po co, jak długo, komu je przekazujesz (Anthropic, Enable Banking, Railway), jakie prawa ma użytkownik.
3. **Minimalizacja danych** — zbieraj tylko to, co konieczne. (Np. czy naprawdę potrzebujesz przechowywać obrazy paragonów? Jak długo?)
4. **Prawa użytkownika** — musisz umożliwić: dostęp do danych, sprostowanie, **usunięcie konta i danych** („prawo do bycia zapomnianym"), eksport danych.
5. **Bezpieczeństwo** — hasła/PIN-y hashowane (✅ masz scrypt), połączenie HTTPS (✅ masz SSL), klucz API na backendzie (✅ zrobione). Dane wrażliwe nie mogą wyciekać.
6. **Zgłaszanie naruszeń** — jeśli dojdzie do wycieku danych, masz **72 godziny** na zgłoszenie do **UODO** (Urząd Ochrony Danych Osobowych) i często poinformowanie użytkowników.
7. **Rejestr czynności przetwarzania** — warto prowadzić (nawet prosty) opis, jakie dane i jak przetwarzasz.

**Kary:** RODO przewiduje wysokie kary administracyjne (nawet do 20 mln € / 4% obrotu — to dla dużych firm; dla osoby fizycznej realnie mniejsze, ale UODO może nałożyć karę i nakazać zaprzestanie). Do tego użytkownik może **dochodzić odszkodowania cywilnego** za szkodę z wycieku.

---

## 3. Dane bankowe i PSD2 (najważniejsze!)
- Łączysz się z bankiem przez **Enable Banking**, który jest **licencjonowanym pośrednikiem (AISP — Account Information Service Provider)** działającym w ramach dyrektywy **PSD2**.
- Dopóki **tylko odczytujesz** dane (salda, transakcje) i **korzystasz z licencji Enable Banking** — to Enable Banking bierze na siebie część odpowiedzialności regulacyjnej.
- **Ryzyko:** udostępniając aplikację innym, technicznie **pośredniczysz w dostępie do ich danych bankowych**. Musisz:
  1. **Sprawdzić regulamin i umowę Enable Banking** — czy pozwala Ci udostępniać rozwiązanie osobom trzecim (multi-tenant), czy licencja jest „na Ciebie" czy „na aplikację/firmę". To kluczowe pytanie do EB i do prawnika.
  2. Upewnić się, że użytkownik **wyraźnie zgadza się** na połączenie banku i rozumie, że jego dane są czytane.
  3. Nie przechowywać danych bankowych dłużej niż to potrzebne.
- **Nie świadczysz** sam usług płatniczych (nie robisz przelewów) — to dobrze, bo inicjowanie płatności (PIS) wymagałoby dużo poważniejszych licencji (KNF).

---

## 4. Współpraca z podmiotami zewnętrznymi (procesory danych)
Przekazujesz dane innym firmom — z każdą powinieneś mieć podstawę i (formalnie) **umowę powierzenia przetwarzania (DPA)**:
- **Anthropic** (AI) — wysyłasz treści paragonów / pytania. Sprawdź ich DPA i warunki; w polityce prywatności napisz, że dane idą do AI w USA. Rozważ **niewysyłanie** zdjęć paragonów, jeśli nie trzeba.
- **Enable Banking** — dane bankowe.
- **Railway** (hosting) + **PostgreSQL** — tam leżą dane.
- **Spaceship** (domena) — mniej istotne.

W polityce prywatności **wymień te podmioty** i kraje przetwarzania (część poza UE → potrzebne odpowiednie zabezpieczenia transferu).

---

## 5. Dokumenty, które powinnaś mieć
1. **Regulamin (Terms of Service)** — zasady korzystania, ograniczenie odpowiedzialności, zakaz nadużyć, prawo do zablokowania konta.
2. **Polityka prywatności (Privacy Policy)** — jak wyżej (RODO).
3. **Zgoda / checkbox** przy zakładaniu konta: „Akceptuję Regulamin i Politykę prywatności".
4. **Disclaimer finansowy** — wyraźnie: *„Spendli nie świadczy doradztwa finansowego / inwestycyjnego. Informacje mają charakter poglądowy."* (AI-doradca to NIE licencjonowany doradca).

---

## 6. „Czy ktoś może mnie pozwać?" — realne ryzyka
| Ryzyko | Kiedy | Jak się chronić |
|---|---|---|
| **Wyciek danych** (bank/dane osobowe) | Włamanie, błąd w kodzie | Bezpieczeństwo, HTTPS, hashe, aktualizacje, minimalizacja danych |
| **Brak polityki prywatności / zgód** | Skarga do UODO | Przygotuj dokumenty i zgody |
| **Zła porada AI → strata użytkownika** | Ktoś podjął decyzję „bo apka kazała" | Disclaimer „to nie porada finansowa" |
| **Naruszenie licencji Enable Banking** | Udostępnianie innym niezgodnie z umową | Sprawdź umowę EB, dopytaj ich |
| **Prawo konsumenckie** (jeśli płatne) | Sprzedaż subskrypcji | Regulamin, prawo odstąpienia, faktury, działalność gospodarcza |

**Wniosek:** Do testów ze znajomymi „po cichu" ryzyko jest niewielkie. Do **publicznego / odpłatnego** udostępniania — potrzebujesz dokumentów, zgód i sprawdzenia licencji EB.

---

## 7. Uwaga: wiek i działalność
- Jeśli masz poniżej 18 lat, zawieranie umów (np. płatnych) i prowadzenie działalności jest ograniczone — sprawdź to.
- Gdy zaczniesz **zarabiać** na aplikacji (abonament), najpewniej będziesz potrzebować **działalności gospodarczej** (lub innej formy) i rozliczeń podatkowych.

---

## 8. Praktyczna lista „zanim udostępnię szerzej"
- [ ] Sprawdzić w Enable Banking, czy licencja pozwala na wielu użytkowników
- [ ] Napisać **Politykę prywatności** (RODO) i **Regulamin**
- [ ] Dodać **checkbox zgody** przy rejestracji
- [ ] Dodać **disclaimer** „to nie porada finansowa"
- [ ] Umożliwić **usunięcie konta i danych**
- [ ] Ograniczyć przechowywanie zdjęć paragonów / danych do niezbędnego minimum
- [ ] Rozważyć konsultację z prawnikiem RODO (1 spotkanie potrafi rozwiać większość wątpliwości)
- [ ] Przy zarabianiu → działalność gospodarcza + podatki

---

*Ten dokument pomaga Ci zadać właściwe pytania. Ostateczną ocenę zawsze powinien dać prawnik znający Twój konkretny przypadek.*
