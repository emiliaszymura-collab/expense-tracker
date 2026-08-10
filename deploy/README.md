# Blask na darmowym serwerze (Oracle Cloud Always Free)

Prawdziwy, własny serwer (VPS) — **zawsze darmowy**, z pełną kontrolą i możliwością
podpięcia dowolnej domeny. Poniżej instrukcja krok po kroku. Wszystkie polecenia
na serwerze załatwia gotowy skrypt `setup.sh`.

> Uczciwie: to więcej pracy niż hosting statyczny, ale masz realny serwer, na
> którym później postawisz też backend (np. codzienny scraper cen + baza).

---

## 1. Załóż konto Oracle Cloud (Always Free)
1. Wejdź na **cloud.oracle.com** → „Start for free".
2. Rejestracja wymaga karty (tylko do weryfikacji — **Always Free nie jest
   płatne**, nie schodzi kasa). Wybierz region blisko Polski (np. Frankfurt).

## 2. Utwórz maszynę (instancję)
1. Menu → **Compute → Instances → Create instance**.
2. **Image**: Canonical **Ubuntu 22.04** (lub 24.04).
3. **Shape**: kliknij *Change shape* → **Ampere (ARM) → VM.Standard.A1.Flex**
   (oznaczone „Always Free eligible"; daj 1 OCPU / 6 GB — mieści się w darmowym).
   Jeśli ARM „out of capacity", weź **VM.Standard.E2.1.Micro** (x86, też free).
4. **SSH keys**: „Generate a key pair for me" → **pobierz klucz prywatny**
   (plik `.key`) — będzie potrzebny do logowania.
5. **Create**. Po chwili zapisz **Public IP address** maszyny.

## 3. Otwórz porty 80 i 443 (WAŻNE — bez tego strony nie widać)
Oracle blokuje ruch na dwóch poziomach — otwórz oba:
1. **W chmurze**: Instancja → *Virtual Cloud Network* → **Security Lists** →
   *Default Security List* → **Add Ingress Rules**:
   - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **80**
   - to samo dla portu **443**
2. **Na maszynie**: robi to za Ciebie `setup.sh` (reguły iptables).

## 4. Zaloguj się przez SSH
Na swoim komputerze (terminal / PowerShell), w folderze z pobranym kluczem:
```bash
chmod 600 twoj-klucz.key           # (Linux/Mac)
ssh -i twoj-klucz.key ubuntu@TWOJE_PUBLICZNE_IP
```
(Windows: możesz użyć PuTTY albo terminala z OpenSSH.)

## 5. Postaw Blask jedną komendą
Na serwerze:
```bash
wget https://raw.githubusercontent.com/emiliaszymura-collab/expense-tracker/main/deploy/setup.sh
bash setup.sh                 # jeśli nie masz jeszcze domeny → działa na http://IP
```
Wejdź na `http://TWOJE_IP/` — powinien pojawić się Blask. 🎉

## 6. Podepnij domenę + darmowy HTTPS
1. Kup domenę (np. `blask.pl` — ~kilkadziesiąt zł/rok u dowolnego rejestratora).
   „Darmowa" alternatywa: subdomena (np. DuckDNS) — działa tak samo z krokiem HTTPS.
2. W panelu domeny ustaw rekordy **A**:
   - `@`   → `TWOJE_PUBLICZNE_IP`
   - `www` → `TWOJE_PUBLICZNE_IP`
3. Odczekaj kilka–kilkanaście minut (propagacja DNS), a potem na serwerze:
```bash
bash setup.sh blask.pl        # wpisz swoją domenę → doda darmowy certyfikat HTTPS
```
Gotowe: `https://blask.pl/` z zieloną kłódką (certyfikat odnawia się sam).

## Aktualizacja apki (po zmianach na GitHubie)
```bash
wget https://raw.githubusercontent.com/emiliaszymura-collab/expense-tracker/main/deploy/update.sh
bash update.sh
```

---

## Uwagi / pułapki
- **Always Free bywa „out of capacity"** dla ARM w popularnych regionach —
  spróbuj innego regionu albo shape'u E2.1.Micro.
- Oracle potrafi odzyskać **bezczynne** darmowe instancje — jeśli serwer coś
  realnie robi (nginx + ruch), zwykle zostaje.
- Backend na żywe ceny (Node/scraper + baza) dołożymy tu później — maszyna
  spokojnie to udźwignie. Wtedy dopiszemy usługę i reverse-proxy w nginx.
