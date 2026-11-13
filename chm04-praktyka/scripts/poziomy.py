#!/usr/bin/env python3
"""Generuje pliki poziomów src/procedury/*.json z jednego źródła (żeby wspólne kroki – zestaw do
miareczkowania, porządkowanie – były wszędzie takie same). Wynikowe pliki JSON można potem
edytować ręcznie; ponowne uruchomienie skryptu je nadpisze."""
import copy, json, os

KAT = os.path.join(os.path.dirname(__file__), '..', 'src', 'procedury')
L1 = json.load(open(os.path.join(KAT, '01-mydlo-naoh.json'), encoding='utf-8'))
WZ = {k['id']: k for k in L1['kroki']}

def g(s):
    return [x.split('|') for x in s.split(';')]

def K(id, opis, wym, pod, dla, prz, sprzet='stol', anim=None, wymaga=None, bhp=False, wykl=None, stan=None):
    k = {'id': id, 'opis': opis, 'wymagane': g(wym)}
    if wykl: k['wykluczajace'] = wykl.split('|')
    k['wymaga'] = wymaga or []
    if bhp: k['wymagaBhp'] = True
    k.update({'podpowiedz': pod, 'dlaczego': dla, 'sprzet': sprzet})
    if anim: k['animacja'] = anim
    if stan: k['stanSceny'] = stan
    k['przyklad'] = prz
    return k

def W(id, prz, **zm):
    """Krok skopiowany z poziomu 1 (wspólny dla wszystkich miareczkowań), z podmienionymi polami."""
    k = copy.deepcopy(WZ[id])
    for a, b in zm.items():
        if a == 'stan': k['stanSceny'] = b
        elif a == 'nid': k['id'] = b
        elif a == 'wym': k['wymagane'] = g(b)
        elif a == 'wykl': k['wykluczajace'] = b.split('|')
        else: k[a] = b
    k['przyklad'] = prz
    return k

def zestaw(titrant, po=None, zglos=True, biureta='biureta'):
    po = po or []
    kroki = [
        W('montaz', 'montuję zestaw do miareczkowania', wymaga=po, opis=f'Zestaw do miareczkowania zmontowany: statyw, łapa, {biureta}.'),
        W('napelnij', 'napełniam biuretę titrantem przez lejek', wymaga=['montaz'], opis=f'Biureta napełniona titrantem – {titrant} (przez lejek).',
          podpowiedz=f'Napełnij biuretę titrantem – {titrant}, używając lejka.'),
        W('lejek', 'zdejmuję lejek z biurety'),
        W('pecherz', 'usuwam pęcherzyk powietrza z kranika'),
        W('zero', 'ustawiam menisk na zero'),
    ]
    if zglos:
        kroki.append(W('zglos', 'zgłaszam gotowość do oceny'))
    return kroki

def porzadki(po, waga=True, dodatkowe=None):
    kroki = [W('odpady', 'przelewam mieszaniny poreakcyjne do pojemnika na odpady ciekłe', wymaga=po)]
    kroki += dodatkowe or []
    kroki += [W('rozmontuj', 'rozmontowuję zestaw do miareczkowania', wymaga=po), W('myj', 'myję szkło laboratoryjne')]
    ost = ['myj', 'rozmontuj']
    if waga:
        kroki.append(W('wylacz_wage', 'wyłączam wagę', wymaga=po))
        ost.append('wylacz_wage')
    kroki.append(W('stol', 'wycieram stół', wymaga=ost))
    return kroki

BLEDY = [b for b in L1['bledy'] if b['slowa'][0] in ('zlew', 'kanaliz', 'ustami')]

def zapisz(nazwa, d):
    with open(os.path.join(KAT, nazwa), 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')

def liczba(pole, wzor, tol): return {'typ': 'liczba', 'pole': pole, 'wzor': wzor, 'tol': tol}
def miejsca(pole, ile): return {'typ': 'miejsca', 'pole': pole, 'ile': ile}
def tekst(pole, *zawiera): return {'typ': 'tekst', 'pole': pole, 'zawiera': list(zawiera)}
def rown(pole, lewa, prawa): return {'typ': 'rownanie', 'pole': pole, 'lewa': lewa, 'prawa': prawa}
def kr(opis, uwaga, *sprawdz, pokaz=None):
    k = {'opis': opis, 'uwaga': uwaga, 'sprawdz': list(sprawdz)}
    if pokaz: k['pokaz'] = {'wzor': pokaz[0], 'miejsca': pokaz[1], 'jednostka': pokaz[2]}
    return k
def waga(id, et, mi=2, j='g'): return {'typ': 'waga', 'id': id, 'etykieta': et, 'jednostka': j, 'miejsca': mi}
def wysw(id, et, mi, j): return {'typ': 'wyswietlacz', 'id': id, 'etykieta': et, 'jednostka': j, 'miejsca': mi}
def biur(id, et): return {'typ': 'biureta', 'id': id, 'etykieta': et}
def info(et, t): return {'typ': 'info', 'etykieta': et, 'tekst': t}
def pole(id, et, j=None, szer='sr'):
    p = {'id': id, 'etykieta': et, 'szer': szer}
    if j: p['jednostka'] = j
    return p

# ───────────────────────── 1. NaOH w mydle (kroki zostają z pliku, dopisujemy przykłady, scenę i kartę)
PRZ1 = {'montaz': 'montuję zestaw do miareczkowania', 'napelnij': 'napełniam biuretę kwasem solnym przez lejek', 'lejek': 'zdejmuję lejek z biurety',
        'pecherz': 'usuwam pęcherzyk powietrza z kranika', 'zero': 'ustawiam menisk na zero', 'zglos': 'zgłaszam gotowość do oceny',
        'waga': 'włączam i taruję wagę', 'odwaz': 'odważam 2 g mydła do kolby stożkowej', 'woda': 'dodaję 100 cm3 wody destylowanej do kolby',
        'mieszaj': 'mieszam zawartość kolby', 'oranz': 'dodaję 3 krople oranżu metylowego', 'miareczkuj': 'miareczkuję do zmiany barwy',
        'odczyt': 'odczytuję objętość z biurety', 'powtorz': 'powtarzam oznaczenie jeszcze dwa razy',
        'odczyn_roztwor': 'do zlewki odważam 2 g mydła i dodaję 50 cm3 wody', 'papierek': 'zanurzam papierek wskaźnikowy',
        'odpady': 'przelewam mieszaniny do pojemnika na odpady ciekłe', 'rozmontuj': 'rozmontowuję zestaw do miareczkowania', 'myj': 'myję szkło',
        'wylacz_wage': 'wyłączam wagę', 'stol': 'wycieram stół'}
for k in L1['kroki']: k['przyklad'] = PRZ1[k['id']]
L1['scena'] = {'titrant': ['HCl', '0,01 mol/dm³'], 'wskaznik': ['oranż', 'metylowy 0,1%'], 'masaWagi': 'm1', 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'}
XN = '$v{i}/1000*0.01*40/$m{i}*100'
L1['karta'] = {
    'tytul': 'Karta wyników – NaOH w mydle',
    'losuj': [{'id': 'x', 'od': 0.03, 'do': 0.08}] +
             [{'id': f'm{i}', 'od': 1.95, 'do': 2.07, 'miejsca': 2} for i in (1, 2, 3)] +
             [{'id': f'v{i}', 'wzor': f'x/100*m{i}/(0.01*40)*1000', 'szum': 0.05, 'krok': 0.05, 'miejsca': 2} for i in (1, 2, 3)] +
             [{'id': 'ph', 'wybierz': [9, 10]}],
    'odczyty': [x for i in (1, 2, 3) for x in (waga(f'm{i}', f'Waga – próbka {i}'), biur(f'v{i}', f'Biureta – próbka {i}'))] + [{'typ': 'papierek', 'id': 'ph', 'etykieta': 'Papierek wskaźnikowy i skala barw'}],
    'sekcje': [
        {'tytul': 'Wyniki oznaczenia zawartości NaOH', 'tabela': {'wiersze': 3, 'kolumny': [
            {'naglowek': 'Masa próbki [g]', 'pole': 'm{i}'}, {'naglowek': 'V titranta [cm³]', 'pole': 'v{i}'},
            {'naglowek': 'V titranta [dm³]', 'pole': 'vd{i}'}, {'naglowek': 'X [%]', 'pole': 'x{i}'}]},
         'pola': [pole('xsr', 'Zawartość NaOH w mydle (średnia) X =', '%')]},
        {'tytul': 'Wyniki badania odczynu', 'pola': [pole('barwa', 'Zabarwienie papierka:', szer='dl'), pole('ph', 'Przybliżona wartość pH (0–14):', szer='kr'), pole('odczyn', 'Odczyn (kwasowy / obojętny / zasadowy):', szer='dl')]},
        {'tytul': 'Równanie reakcji podczas miareczkowania', 'opis': 'Strzałkę możesz zapisać jako -> albo =, ładunki jako + i -.',
         'pola': [pole('r1', '1. Cząsteczkowo:', szer='max'), pole('r2', '2. Jonowo (pełne):', szer='max'), pole('r3', '3. Jonowo (skrócone):', szer='max')]},
    ],
    'brudnopis': ['Stężenie HCl: 0,01 mol/dm³. Masa molowa NaOH: 40 g/mol. HCl i NaOH reagują 1 : 1.',
                  '~1000 cm³ — 1 dm³ | V cm³ — x dm³', '~1 dm³ roztworu — 0,01 mol HCl | V dm³ — n mol HCl', 'Z równania reakcji: n NaOH = n HCl.',
                  '~1 mol NaOH — 40 g | n mol — a g', '~m próbki [g] — 100% | a [g] — X%',
                  'Przykład na innych liczbach: V = 3,00 cm³ = 0,00300 dm³ → n = 0,00003 mol → a = 0,0012 g → dla m = 2,00 g: X = 0,06%.'],
    'kryteria': [
        kr('Zapisane trzy masy próbek [g], zgodne z odczytem z wagi', 'Przepisz masy dokładnie z wyświetlacza wagi.', *[liczba(f'm{i}', f'm{i}', 0.005) for i in (1, 2, 3)]),
        kr('Masy zapisane z dokładnością do drugiego miejsca po przecinku', 'Każda masa musi mieć dwa miejsca po przecinku, np. 2,00.', *[miejsca(f'm{i}', 2) for i in (1, 2, 3)]),
        kr('Zapisane trzy objętości titranta [cm³], zgodne z odczytem z biurety', 'Odczytaj objętość na dolnym menisku; dopuszczalna różnica to 0,05 cm³.', *[liczba(f'v{i}', f'v{i}', 0.05) for i in (1, 2, 3)]),
        kr('Zapisane trzy objętości titranta [dm³]', '1 dm³ = 1000 cm³, więc cm³ dzielisz przez 1000 (np. 2,55 cm³ = 0,00255 dm³).', *[liczba(f'vd{i}', f'$v{i}/1000', 0.000011) for i in (1, 2, 3)]),
        kr('Obliczona zawartość NaOH dla trzech próbek (adekwatnie do Twoich danych)', 'Sprawdź obliczenia – pamiętaj o objętości w dm³. Próbka 1:', *[liczba(f'x{i}', XN.replace('{i}', str(i)), 0.006) for i in (1, 2, 3)], pokaz=(XN.replace('{i}', '1'), 2, '%')),
        kr('Średnia z co najmniej dwóch wyników nieróżniących się o więcej niż 0,05%', 'Policz średnią arytmetyczną z X₁, X₂, X₃.', {'typ': 'rozrzut', 'pola': ['x1', 'x2', 'x3'], 'max': 0.05}, liczba('xsr', 'sr($x1,$x2,$x3)', 0.006), pokaz=('sr($x1,$x2,$x3)', 2, '%')),
        kr('Wyniki zawartości NaOH z dokładnością do drugiego miejsca po przecinku', 'Każdy wynik X zaokrąglij do dwóch miejsc po przecinku.', *[miejsca(p, 2) for p in ('x1', 'x2', 'x3', 'xsr')]),
        kr('Zapisane zabarwienie papierka wskaźnikowego', 'W odczynie zasadowym papierek uniwersalny robi się zielononiebieski / niebieski.', tekst('barwa', 'nieb', 'ziel', 'gran', 'turkus', 'fiolet')),
        kr('Przybliżona wartość pH adekwatna do zabarwienia', 'Porównaj barwę papierka ze skalą.', liczba('ph', 'ph', 1)),
        kr('Odczyn adekwatny do wartości pH', 'pH powyżej 7 oznacza odczyn zasadowy.', tekst('odczyn', 'zasad')),
        kr('Równanie w formie cząsteczkowej', 'NaOH + HCl → NaCl + H₂O', rown('r1', ['naoh', 'hcl'], ['nacl', 'h2o'])),
        kr('Równanie w formie jonowej pełnej', 'Na⁺ + OH⁻ + H⁺ + Cl⁻ → Na⁺ + Cl⁻ + H₂O', rown('r2', ['na', 'oh', 'h', 'cl'], ['na', 'cl', 'h2o'])),
        kr('Równanie w formie jonowej skróconej', 'H⁺ + OH⁻ → H₂O', rown('r3', ['h', 'oh'], ['h2o'])),
    ],
}
zapisz('01-mydlo-naoh.json', L1)

WAGA_ON = lambda: W('waga', 'włączam i taruję wagę')
DODAJ = 'dodaj|dodaję|dolej|dolew|wlej|wlew|nalej|nalew|odmierz|wprowadz|wkrapl|wsyp|dodanie'
PIPETA = 'pobier|pobrać|odpipet|pipetuj|pipet|odmierz|przenoś|przenieś|przenos'
MIESZ = 'miesz|wymiesz|zamiesz|rozpuść|rozpuszcz|wstrząs'

# ───────────────────────── 2. Ibuprofen
P = {
 'id': '02-ibuprofen', 'tytul': 'Ibuprofen w tabletce', 'zrodlo': 'CHM.04 – styczeń 2023', 'metoda': 'Alkacymetria (NaOH, fenoloftaleina)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Wykonaj oznaczenie zawartości ibuprofenu w tabletce przez miareczkowanie mianowanym roztworem NaOH.\nPo zmontowaniu zestawu do miareczkowania i napełnieniu biurety titrantem zgłoś gotowość do oceny przez podniesienie ręki.\nOblicz błąd bezwzględny i względny oznaczenia. We wniosku porównaj zawartość otrzymaną z deklarowaną przez producenta.\nMieszaniny poreakcyjne przelej do pojemnika na odpady ciekłe, resztki roztartej tabletki przesyp do pojemnika na odpady stałe.'},
  {'tytul': 'Procedura', 'tresc': 'Przygotowanie próbki\nZważyć tabletkę na wadze laboratoryjnej z dokładnością do 0,001 g. Rozetrzeć ją dokładnie w moździerzu na jednorodny proszek.\nWykonanie oznaczenia\nOdważyć próbkę proszku o masie około 0,1 g z dokładnością do 0,001 g, przenieść ilościowo do kolby stożkowej i dodać 25 cm³ etanolu 96%. Mieszać do rozpuszczenia.\nDodać trzy krople fenoloftaleiny i miareczkować roztworem NaOH o stężeniu 0,1 mol/dm³ do zmiany zabarwienia na różowe. Wykonać co najmniej dwa oznaczenia.\nObliczenia\nXi = (V · c · 206,28 · m tabletki) / m próbki\n- Xi – masa ibuprofenu [mg]\n- V – objętość NaOH [cm³]\n- c – stężenie NaOH [mmol/cm³]\n- 206,28 – masa molowa ibuprofenu [mg/mmol]\n- masy tabletki i próbki w mg\nWynik: średnia z co najmniej dwóch wyników nieróżniących się o więcej niż 20 mg, z dokładnością do całości.\nBłąd bezwzględny = |x − xi|, błąd względny = błąd bezwzględny / x · 100%.'}],
 'kroki': [
  WAGA_ON(),
  K('tabletka', 'Tabletka zważona na szkiełku zegarkowym (dokładność 0,001 g).', 'zważ|waż|odważ|ważę;tabletk', 'Zważ całą tabletkę na szkiełku zegarkowym z dokładnością do 0,001 g.', 'Masa tabletki wchodzi do wzoru; kryterium: wynik ważenia z jednostką, do 0,001 g.', 'ważę tabletkę na szkiełku zegarkowym', 'waga', 'siegnij', ['waga'], wykl='proszk|rozt'),
  K('mozdzierz', 'Tabletka roztarta w moździerzu na jednorodny proszek.', 'rozetrz|rozciera|utrzyj|ucier|rozdrobn|rozgni|utrze|rozcier;tabletk|moździerz', 'Rozetrzyj tabletkę w moździerzu na jednorodny proszek.', 'Kryterium przebiegu: dokładnie rozdrobnił tabletkę w moździerzu.', 'rozcieram tabletkę w moździerzu', 'stol', 'siegnij', ['tabletka']),
  *zestaw('NaOH 0,1 mol/dm³', biureta='biureta 10 cm³'),
  K('odwaz', 'Odważono ok. 0,1 g proszku i przeniesiono ilościowo do kolby stożkowej.', 'odważ|naważ|zważ|ważę;proszk|próbk|0.1|naważk|odważk', 'Odważ ok. 0,1 g proszku (do 0,001 g) i przenieś ilościowo do kolby stożkowej.', 'Masa próbki mp jest w mianowniku wzoru – musi być znana do 0,001 g.', 'odważam 0,1 g proszku do kolby', 'waga', 'wazenie', ['mozdzierz'], True, wykl='tabletk', stan={'kolba': 'mydlo'}),
  K('etanol', 'Dodano 25 cm³ etanolu 96% (cylinder miarowy 25 cm³).', DODAJ + ';etanol|alkohol|spirytus', 'Dodaj 25 cm³ etanolu 96% odmierzonego cylindrem.', 'Ibuprofen nie rozpuszcza się w wodzie, ale rozpuszcza się w etanolu.', 'dodaję 25 cm3 etanolu', 'kolba', 'przelewanie', ['odwaz'], True, stan={'kolba': 'bezbarwny'}),
  K('mieszaj', 'Zawartość kolby wymieszana do rozpuszczenia proszku.', MIESZ, 'Mieszaj do rozpuszczenia proszku.', 'Kryterium: rozpuścił odważkę.', 'mieszam do rozpuszczenia', 'kolba', 'mieszanie', ['etanol'], wykl='moździerz'),
  K('fenol', 'Dodano 3 krople fenoloftaleiny.', DODAJ + '|kropl;fenoloft|wskaźnik', 'Dodaj trzy krople fenoloftaleiny.', 'Fenoloftaleina zmienia barwę w pH 8,2–10 – wskaże koniec miareczkowania słabego kwasu mocną zasadą.', 'dodaję 3 krople fenoloftaleiny', 'kolba', 'pipetowanie', ['mieszaj'], True),
  W('miareczkuj', 'miareczkuję do różowej barwy', wymaga=['zglos', 'fenol'], opis='Miareczkowanie NaOH, stale mieszając, do zmiany barwy na różową.', podpowiedz='Miareczkuj roztworem NaOH do pierwszej trwałej różowej barwy.', dlaczego='Różowa barwa fenoloftaleiny oznacza punkt końcowy.', stan={'kolba': 'rozowy', 'biuretaPoziom': 0.65, 'kolbaMiejsce': 'biureta'}),
  W('odczyt', 'odczytuję objętość z biurety'),
  W('powtorz', 'powtarzam oznaczenie drugi raz', opis='Wykonano drugie oznaczenie – razem co najmniej 2.', podpowiedz='Powtórz oznaczenie – wymagane są co najmniej dwa.', stan={'kolby': 2}),
  *porzadki(['powtorz'], dodatkowe=[K('stale', 'Resztki roztartej tabletki przesypane do pojemnika na odpady stałe.', 'przesyp|wysyp|wyrzuc|wyrzuć|usuw;tabletk|proszk|resztk|stałe', 'Przesyp resztki roztartej tabletki do pojemnika na odpady stałe.', 'Kryterium porządkowania z arkusza.', 'przesypuję resztki tabletki do pojemnika na odpady stałe', 'odpady', 'siegnij', ['powtorz'])]),
 ],
 'bledy': BLEDY + [{'slowa': ['oranż'], 'komunikat': 'W tej procedurze wskaźnikiem jest fenoloftaleina, nie oranż metylowy.'}],
 'scena': {'titrant': ['NaOH', '0,1 mol/dm³'], 'wskaznik': ['fenoloftaleina', '2%'], 'masaWagi': 'm1', 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – ibuprofen', 
  'losuj': [{'id': 'xi', 'od': 385, 'do': 415}, {'id': 'mt', 'od': 0.585, 'do': 0.635, 'miejsca': 3}] + [{'id': f'm{i}', 'od': 0.096, 'do': 0.109, 'miejsca': 3} for i in (1, 2)] + [{'id': f'v{i}', 'wzor': f'xi*m{i}/(0.1*206.28*mt)', 'szum': 0.04, 'krok': 0.05, 'miejsca': 2} for i in (1, 2)],
  'odczyty': [waga('mt', 'Waga – tabletka', 3), info('Opakowanie', 'Producent deklaruje 400 mg ibuprofenu w tabletce'), waga('m1', 'Waga – próbka 1', 3), biur('v1', 'Biureta – próbka 1'), waga('m2', 'Waga – próbka 2', 3), biur('v2', 'Biureta – próbka 2')],
  'sekcje': [
   {'tytul': 'Tabela 1. Dokumentacja z wykonania badania', 'pola': [pole('mt', 'Masa tabletki m =', 'g')], 'tabela': {'wiersze': 2, 'kolumny': [{'naglowek': 'Masa próbki [g]', 'pole': 'm{i}'}, {'naglowek': 'V NaOH [cm³]', 'pole': 'v{i}'}, {'naglowek': 'Xi [mg]', 'pole': 'x{i}'}]}},
   {'tytul': 'Wynik i błędy', 'pola': [pole('xsr', 'Zawartość ibuprofenu (średnia) Xi śr =', 'mg'), pole('prod', 'Zawartość wg producenta:', 'mg'), pole('db', 'Błąd bezwzględny:', 'mg'), pole('dw', 'Błąd względny:', '%'), pole('wniosek', 'Wniosek:', szer='max')]}],
  'brudnopis': ['Stężenie NaOH: 0,1 mol/dm³ = 0,1 mmol/cm³. Masa molowa ibuprofenu: 206,28 mg/mmol. Ibuprofen i NaOH reagują 1 : 1.',
                '~1 cm³ NaOH — 0,1 mmol | V cm³ — n mmol', '~1 mmol ibuprofenu — 206,28 mg | n mmol — a mg (tyle jest w próbce)', '~m próbki — a mg | m tabletki — Xi mg',
                'Błąd bezwzględny = |400 − Xi śr|. Błąd względny:', '~400 mg — 100% | błąd bezwzględny — x%'],
  'kryteria': [
   kr('Masa tabletki z dokładnością do 0,001 g, zgodna z odczytem', 'Przepisz masę tabletki z wagi – trzy miejsca po przecinku.', liczba('mt', 'mt', 0.0005), miejsca('mt', 3)),
   kr('Masy dwóch próbek (ok. 0,1 g), zgodne z odczytem', 'Przepisz masy próbek z wagi.', liczba('m1', 'm1', 0.0005), liczba('m2', 'm2', 0.0005)),
   kr('Masy próbek z dokładnością do 0,001 g', 'Trzy miejsca po przecinku.', miejsca('m1', 3), miejsca('m2', 3)),
   kr('Dwie objętości NaOH zgodne z odczytem z biurety', 'Odczytaj na dolnym menisku, ±0,05 cm³.', liczba('v1', 'v1', 0.05), liczba('v2', 'v2', 0.05)),
   kr('Obliczone zawartości ibuprofenu dla dwóch naważek', 'Sprawdź obliczenia. Próbka 1:', liczba('x1', '$v1*0.1*206.28*$mt/$m1', 1.5), liczba('x2', '$v2*0.1*206.28*$mt/$m2', 1.5), pokaz=('$v1*0.1*206.28*$mt/$m1', 0, ' mg')),
   kr('Średnia z wyników nieróżniących się o więcej niż 20 mg', 'Policz średnią z Xi1 i Xi2.', {'typ': 'rozrzut', 'pola': ['x1', 'x2'], 'max': 20}, liczba('xsr', 'sr($x1,$x2)', 1), pokaz=('sr($x1,$x2)', 0, ' mg')),
   kr('Wynik podany z dokładnością do całości', 'Zaokrąglij średnią do całych mg.', miejsca('xsr', 0)),
   kr('Poprawnie obliczony błąd bezwzględny', 'Błąd bezwzględny = |400 − Xi śr|.', liczba('prod', '400', 0.1), liczba('db', 'abs(400-$xsr)', 1), pokaz=('abs(400-$xsr)', 0, ' mg')),
   kr('Poprawnie obliczony błąd względny', 'Błąd względny = błąd bezwzględny / 400 · 100%.', liczba('dw', '$db/400*100', 0.15), pokaz=('$db/400*100', 1, '%')),
   kr('Wniosek porównujący wynik z deklaracją producenta', 'Napisz, czy zawartość jest zgodna, większa czy mniejsza od deklarowanej.', tekst('wniosek', 'zgod', 'potwierdz', 'mniejsz', 'wieksz', 'maly', 'duzy', 'niezgod')),
  ]},
}
zapisz('02-ibuprofen.json', P)
print('ok 1-2')

# ───────────────────────── 3. Wodorowęglan sodu
P = {
 'id': '03-wodoroweglan', 'tytul': 'Wodorowęglan sodu', 'zrodlo': 'CHM.04 – czerwiec 2025', 'metoda': 'Alkacymetria (HCl, oranż metylowy) + pH-metr', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Na podstawie fragmentu monografii substancji Wodorowęglan sodu dokonaj oceny właściwości, wykonaj badanie tożsamości i oznaczenie zawartości procentowej (m/m) NaHCO₃.\nWykonaj pomiar pH roztworu za pomocą pH-metru (jest wykalibrowany).\nZmontuj zestaw do miareczkowania, napełnij biuretę titrantem i zgłoś gotowość do oceny przez podniesienie ręki.\nUporządkuj stanowisko: rozmontuj zestaw, mieszaniny poreakcyjne przelej do pojemnika na odpady ciekłe.'},
  {'tytul': 'Fragment monografii', 'tresc': '1. Pomiar pH roztworu\nRozpuścić 3,0 g substancji w 37 cm³ wody destylowanej. Do zlewki 25 cm³ odmierzyć 20 cm³ roztworu i zmierzyć pH pH-metrem. Elektrodę przed pomiarem i po nim przemyć wodą destylowaną i osuszyć bibułą. Po pracy odłączyć pH-metr od zasilania.\n2. Badanie tożsamości\nPozostałą część roztworu przenieść do kolby miarowej 100 cm³, uzupełnić wodą do kreski, zamknąć korkiem i wymieszać. Odmierzyć do probówki 5 cm³ roztworu, dodać 2–3 krople fenoloftaleiny. Roztwór zmienia barwę na różową.\n3. Oznaczanie zawartości\nOdważyć około 1,5 g substancji z dokładnością do 0,01 g, przenieść ilościowo do kolby stożkowej, rozpuścić w 50 cm³ wody i dodać 2–3 krople oranżu metylowego. Miareczkować kwasem solnym 1 mol/dm³ do pierwszej trwałej zmiany zabarwienia na czerwone. Oznaczenie wykonać trzy razy.\n1 cm³ HCl 1 mol/dm³ odpowiada 84,0 mg NaHCO₃.\nWymagana zawartość: od 99,00% do 101,00% (m/m).'}],
 'kroki': [
  WAGA_ON(),
  K('roztwor', 'Rozpuszczono 3,0 g substancji w 37 cm³ wody; 20 cm³ roztworu odmierzono do zlewki.', 'rozpuść|rozpuszcz|sporządz|przygotow|odważ;3 g|3.0|37|roztw', 'Rozpuść 3,0 g substancji w 37 cm³ wody i odmierz 20 cm³ roztworu do zlewki.', 'To roztwór do pomiaru pH i badania tożsamości.', 'rozpuszczam 3,0 g substancji w 37 cm3 wody', 'zlewka', 'przelewanie', ['waga'], True, wykl='1.5|kolb|50', stan={'zlewka': 'roztwor'}),
  K('elektroda1', 'Elektroda przemyta wodą destylowaną i osuszona bibułą.', 'przemy|opłucz|płucz|spłucz|umyj|osusz;elektrod', 'Przemyj elektrodę wodą destylowaną i osusz ją bibułą.', 'Dwa kryteria przebiegu: przemył elektrodę i osuszył ją przed pomiarem.', 'przemywam elektrodę wodą destylowaną i osuszam bibułą', 'zlewka', 'siegnij', ['roztwor'], wykl='po pomiar|odłącz|ponown'),
  K('ph', 'Elektroda zanurzona w roztworze – odczytano pH.', 'zmierz|mierz|pomiar|zanurz|odczyt|sprawdz;ph|elektrod|pehametr', 'Zanurz elektrodę w roztworze i odczytaj pH z dokładnością do 0,1.', 'Kryterium: zanurzył elektrodę w roztworze; wynik zapisujesz w tabeli 1.', 'zanurzam elektrodę i mierzę pH', 'zlewka', 'siegnij', ['elektroda1'], wykl='przemy|opłucz|osusz|biuret'),
  K('elektroda2', 'Po pomiarze elektroda przemyta, pH-metr odłączony od zasilania.', 'przemy|opłucz|płucz|odłącz|wyłącz;elektrod|pehametr|ph-metr|ph metr|phmetr', 'Po pomiarze przemyj elektrodę i odłącz pH-metr od zasilania.', 'Dwa kryteria: przemył elektrodę po pomiarach, odłączył pH-metr.', 'po pomiarze przemywam elektrodę i odłączam pehametr', 'zlewka', 'siegnij', ['ph']),
  K('miarowa', 'Resztę roztworu przeniesiono do kolby miarowej 100 cm³, uzupełniono do kreski, zamknięto i wymieszano.', 'przenoś|przenieś|przelew|przelej|uzupełn|dopełn;miarow', 'Przenieś resztę roztworu do kolby miarowej 100 cm³, uzupełnij wodą do kreski, zamknij i wymieszaj.', 'Kryterium: sporządził roztwór w kolbie miarowej.', 'przenoszę roztwór do kolby miarowej i uzupełniam do kreski', 'stol', 'przelewanie', ['ph']),
  K('probowka', 'Do probówki odmierzono 5 cm³ roztworu i dodano fenoloftaleinę – barwa różowa.', 'probówk', 'Odmierz 5 cm³ roztworu do probówki i dodaj 2–3 krople fenoloftaleiny.', 'Różowe zabarwienie potwierdza odczyn zasadowy – to badanie tożsamości.', 'do probówki odmierzam 5 cm3 roztworu i dodaję fenoloftaleinę', 'stol', 'pipetowanie', ['miarowa'], True),
  K('odwaz', 'Odważono ok. 1,5 g substancji i przeniesiono ilościowo do kolby stożkowej.', 'odważ|naważ|zważ|ważę;1.5|substancj|próbk|wodorowęglan|naważk|odważk', 'Odważ ok. 1,5 g substancji (do 0,01 g) i przenieś ilościowo do kolby stożkowej.', 'Kryteria: odważył zgodnie z zasadami, przeniósł odważkę ilościowo.', 'odważam 1,5 g substancji do kolby stożkowej', 'waga', 'wazenie', ['waga'], True, wykl='3 g|3.0|37|zlewk', stan={'kolba': 'mydlo'}),
  K('woda', 'Dodano 50 cm³ wody destylowanej i 2–3 krople oranżu metylowego – roztwór żółty.', DODAJ + '|rozpuść|rozpuszcz;oranż|wskaźnik', 'Rozpuść odważkę w 50 cm³ wody i dodaj 2–3 krople oranżu metylowego.', 'Kryterium: dodał wodę destylowaną oraz roztwór oranżu metylowego.', 'dodaję 50 cm3 wody i 3 krople oranżu metylowego', 'kolba', 'pipetowanie', ['odwaz'], True, wykl='probówk', stan={'kolba': 'zolty'}),
  W('montaz', 'montuję zestaw do miareczkowania', wymaga=[]),
  K('plucz', 'Biureta przepłukana roztworem titranta.', 'przepłuk|przepłucz|płucz|opłucz;biuret', 'Przepłucz biuretę niewielką ilością titranta.', 'Osobne kryterium w tym arkuszu: przepłukał biuretę roztworem titranta – woda w biurecie rozcieńczyłaby HCl.', 'przepłukuję biuretę titrantem', 'statyw', 'przelewanie', ['montaz'], True, wykl='wodą po|myj'),
  W('napelnij', 'napełniam biuretę kwasem solnym przez lejek', wymaga=['plucz'], opis='Biureta napełniona titrantem – HCl 1 mol/dm³.', podpowiedz='Napełnij biuretę kwasem solnym 1 mol/dm³.', wykl='przepłuk|przepłucz|płucz'),
  W('lejek', 'zdejmuję lejek z biurety'), W('pecherz', 'usuwam pęcherzyk powietrza z kranika'), W('zero', 'ustawiam menisk na zero'), W('zglos', 'zgłaszam gotowość do oceny'),
  W('miareczkuj', 'miareczkuję do czerwonej barwy', wymaga=['zglos', 'woda'], opis='Miareczkowanie HCl, mieszając, do pierwszej trwałej barwy czerwonej.', podpowiedz='Miareczkuj kwasem solnym do pierwszej trwałej zmiany barwy na czerwoną.', dlaczego='Oranż metylowy w środowisku kwasowym jest czerwony – to punkt końcowy.', stan={'kolba': 'czerwony', 'biuretaPoziom': 0.6, 'kolbaMiejsce': 'biureta'}),
  W('odczyt', 'odczytuję objętość z biurety'),
  W('powtorz', 'powtarzam oznaczenie jeszcze dwa razy'),
  *porzadki(['powtorz', 'probowka', 'elektroda2']),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['HCl', '1 mol/dm³'], 'wskaznik': ['oranż', 'metylowy 0,5%'], 'masaWagi': 'm1', 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – wodorowęglan sodu',
  'losuj': [{'id': 'pr', 'od': 98.7, 'do': 101.2}, {'id': 'ph', 'od': 8.1, 'do': 8.6, 'miejsca': 1}] + [{'id': f'm{i}', 'od': 1.46, 'do': 1.56, 'miejsca': 2} for i in (1, 2, 3)] + [{'id': f'v{i}', 'wzor': f'pr/100*m{i}*1000/84', 'szum': 0.04, 'krok': 0.05, 'miejsca': 2} for i in (1, 2, 3)],
  'odczyty': [wysw('ph', 'pH-metr', 1, 'pH')] + [x for i in (1, 2, 3) for x in (waga(f'm{i}', f'Waga – próbka {i}'), biur(f'v{i}', f'Biureta – próbka {i}'))],
  'sekcje': [
   {'tytul': 'Tabela 1. Właściwości i tożsamość', 'pola': [pole('wyglad', 'Wygląd:', szer='max'), pole('ph', 'pH:', szer='kr'), pole('tozsamosc', 'Tożsamość (obserwacja po dodaniu fenoloftaleiny):', szer='max')]},
   {'tytul': 'Tabela 2. Oznaczenie zawartości NaHCO₃', 'tabela': {'wiersze': 3, 'kolumny': [{'naglowek': 'Masa substancji [g]', 'pole': 'm{i}'}, {'naglowek': 'V HCl [cm³]', 'pole': 'v{i}'}, {'naglowek': 'Zawartość [% m/m]', 'pole': 'x{i}'}]},
    'pola': [pole('xsr', 'Zawartość NaHCO₃ w substancji (średnia):', '% (m/m)'), pole('wniosek', 'Badana substancja (spełnia wymagania / nie spełnia wymagań):', szer='dl')]},
   {'tytul': 'Tabela 3. Sprzęt miarowy', 'opis': 'Podaj nazwę i pojemność.', 'pola': [pole('sprzet1', '1.', szer='dl'), pole('sprzet2', '2.', szer='dl')]}],
  'brudnopis': ['1 cm³ HCl 1 mol/dm³ odpowiada 84,0 mg NaHCO₃.', '~1 cm³ HCl — 84,0 mg NaHCO₃ | V cm³ — a mg', 'Zamień mg na g (1000 mg = 1 g), potem:', '~m próbki [g] — 100% | a [g] — X%'],
  'kryteria': [
   kr('Wygląd: biały, krystaliczny proszek', 'Opisz barwę i postać, np. „biały krystaliczny proszek”.', tekst('wyglad', 'bial'), tekst('wyglad', 'prosz', 'kryszt', 'stal')),
   kr('pH zapisane z dokładnością do pierwszego miejsca po przecinku', 'Przepisz pH z wyświetlacza pH-metru.', liczba('ph', 'ph', 0.05), miejsca('ph', 1)),
   kr('Tożsamość: różowe zabarwienie i/lub odczyn zasadowy', 'Zapisz obserwację: roztwór zabarwił się na różowo.', tekst('tozsamosc', 'roz', 'malin', 'zasad')),
   kr('Trzy masy odważonej substancji', 'Przepisz masy z wagi.', *[liczba(f'm{i}', f'm{i}', 0.005) for i in (1, 2, 3)]),
   kr('Trzy objętości kwasu solnego', 'Odczytaj na dolnym menisku, ±0,05 cm³.', *[liczba(f'v{i}', f'v{i}', 0.05) for i in (1, 2, 3)]),
   kr('Obliczone zawartości NaHCO₃ adekwatne do wyników miareczkowania', '1 cm³ HCl odpowiada 84 mg NaHCO₃. Próbka 1:', *[liczba(f'x{i}', f'$v{i}*0.084/$m{i}*100', 0.02) for i in (1, 2, 3)], pokaz=('$v1*0.084/$m1*100', 2, '%')),
   kr('Średnia zawartość z próbek 1–3', 'Średnia arytmetyczna trzech wyników.', liczba('xsr', 'sr($x1,$x2,$x3)', 0.011), pokaz=('sr($x1,$x2,$x3)', 2, '%')),
   kr('Wniosek spójny z wynikiem (wymaganie 99,00–101,00%)', 'Porównaj swoją średnią z przedziałem 99,00–101,00%.', {'typ': 'wybor', 'pole': 'wniosek', 'wzor': 'min($xsr-99,101-$xsr)+0.000001', 'tak': ['spelnia'], 'nie': ['nie spelnia']}),
   kr('Wyniki ważenia i zawartości z dokładnością do drugiego miejsca po przecinku', 'Dwa miejsca po przecinku w masach i zawartościach.', *[miejsca(p, 2) for p in ('m1', 'm2', 'm3', 'x1', 'x2', 'x3', 'xsr')]),
   kr('Sprzęt miarowy: cylinder miarowy 50 cm³', 'Do odmierzenia 50 cm³ wody służy cylinder miarowy 50 cm³.', {'typ': 'tekstRazem', 'pola': ['sprzet1', 'sprzet2'], 'zawiera': ['cylind'], 'oraz': ['50']}),
   kr('Sprzęt miarowy: biureta 25 cm³', 'Miareczkujesz z biurety 25 cm³.', {'typ': 'tekstRazem', 'pola': ['sprzet1', 'sprzet2'], 'zawiera': ['biuret'], 'oraz': ['25']}),
  ]},
}
zapisz('03-wodoroweglan.json', P)

# ───────────────────────── 4. Tlenek cynku
P = {
 'id': '04-tlenek-cynku', 'tytul': 'Tlenek cynku w paście cynkowej', 'zrodlo': 'CHM.04 – czerwiec 2026', 'metoda': 'Kompleksometria (EDTA, czerń eriochromowa T)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Przygotuj stanowisko pracy i wykonaj oznaczenie zawartości tlenku cynku w paście cynkowej.\nZ magazynu pobierz i wyłóż na stanowisko tylko sprzęt i odczynniki niezbędne do przygotowania próbki (część A). Zgłoś gotowość do oceny stanowiska.\nPrzygotuj próbkę, opisz ją „Próbka do badań” i oznacz numerem stanowiska. Zgłoś gotowość do oceny próbki.\nNastępnie wykonaj oznaczenie (część B). Mieszaniny poreakcyjne i pozostałość próbki przelej do pojemnika na odpady ciekłe.'},
  {'tytul': 'Procedura', 'tresc': 'A. Przygotowanie próbki\nW zlewce 100 cm³ odważyć około 1 g pasty (z dokładnością do 0,001 g). Dodać 20 cm³ kwasu solnego 2 mol/dm³ i, ciągle mieszając, ogrzewać kilka minut do roztworzenia tlenku cynku.\nRoztwór przesączyć i przenieść do kolby miarowej 100 cm³. Pozostałość w zlewce przemyć dwukrotnie porcjami po 3 cm³ HCl, a następnie trzykrotnie porcjami po 5 cm³ wody; roztwór z przemycia przesączyć przez ten sam sączek do kolby.\nUzupełnić wodą do kreski, zamknąć korkiem i wymieszać. Kolbę opisać „Próbka do badań” i numerem stanowiska.\nB. Wykonanie oznaczenia\nDo kolby stożkowej odmierzyć pipetą jednomiarową 25 cm³ roztworu, dodać 10 cm³ buforu amonowego pH 10 (pod dygestorium), 15 cm³ wody i szczyptę czerni eriochromowej T – roztwór fioletowy. Miareczkować EDTA 0,05 mol/dm³ do zmiany barwy na niebieską. Wykonać co najmniej dwa razy.\nObliczenia\nm ZnO = V · C · M · W\n- V – objętość EDTA [dm³], średnia z wyników różniących się najwyżej o 0,2 cm³\n- C – stężenie EDTA [mol/dm³]\n- M – masa molowa ZnO, 81,37 g/mol\n- W – współmierność kolby miarowej i pipety\nObliczyć zawartość procentową ZnO w paście i porównać z etykietą.'}],
 'kroki': [
  K('stanowisko', 'Na stanowisko wyłożono tylko sprzęt i odczynniki do przygotowania próbki (część A).', 'wyłóż|wykład|pobier|pobierz|przygotow|przynos|przynieś|ustaw;sprzęt|odczynnik|stanowisk|magazyn', 'Pobierz z magazynu i wyłóż na stanowisko tylko sprzęt i odczynniki do części A.', 'Rezultat 1: stanowisko – m.in. kryterium „wyłącznie niezbędne sprzęty i odczynniki”.', 'pobieram z magazynu sprzęt i odczynniki do części A', 'stol', 'siegnij', wykl='uporządk|sprząt|wytrz'),
  K('zglos1', 'Zgłoszono gotowość do oceny stanowiska pracy.', 'zgłoś|zgłasz|podnieś|podnos|gotowoś;stanowisk', 'Zgłoś gotowość do oceny przygotowanego stanowiska.', 'Stanowisko ocenia się bezpośrednio po podniesieniu ręki.', 'zgłaszam gotowość do oceny stanowiska', 'stol', 'reka', ['stanowisko'], wykl='próbk'),
  WAGA_ON(),
  K('odwaz', 'W zlewce 100 cm³ odważono ok. 1 g pasty (dokładność 0,001 g).', 'odważ|naważ|zważ|ważę;past|1 g|próbk', 'Odważ w zlewce ok. 1 g pasty z dokładnością do 0,001 g.', 'Kryterium: odważył w zlewce pastę zgodnie z zasadami ważenia.', 'odważam 1 g pasty w zlewce', 'waga', 'siegnij', ['waga', 'zglos1'], True, stan={'zlewka': 'roztwor'}),
  K('hcl', 'Dodano 20 cm³ kwasu solnego 2 mol/dm³ (cylinder lub pipeta).', DODAJ + ';hcl|kwas|solnego|20', 'Dodaj do zlewki 20 cm³ kwasu solnego 2 mol/dm³.', 'Tlenek cynku roztwarza się w kwasie: ZnO + 2HCl → ZnCl₂ + H₂O.', 'dodaję 20 cm3 kwasu solnego do zlewki', 'zlewka', 'przelewanie', ['odwaz'], True, wykl='przemy|płucz|3 cm'),
  K('ogrzej', 'Mieszaninę ogrzewano, ciągle mieszając, do roztworzenia tlenku cynku.', 'ogrzew|ogrzej|podgrzew|podgrzej|grzej|grzeję', 'Ogrzewaj mieszaninę na płycie grzewczej, ciągle mieszając bagietką.', 'Kryterium: ogrzewał mieszaninę, ciągle mieszając, do roztworzenia tlenku cynku.', 'ogrzewam mieszaninę na płycie grzewczej ciągle mieszając', 'zlewka', 'siegnij', ['hcl']),
  K('sacz', 'Roztwór przesączono (po bagietce, nóżka lejka przy ściance) do kolby miarowej 100 cm³.', 'sącz|przesącz|sączen|filtr', 'Przesącz roztwór do kolby miarowej, wlewając po bagietce na sączek.', 'Kryteria: sączył po bagietce; nóżka lejka dotykała ścianki; przesącz w kolbie miarowej 100 cm³.', 'sączę roztwór po bagietce do kolby miarowej', 'stol', 'przelewanie', ['ogrzej'], wykl='przemy|kosz|wyrzuc|wyrzuć'),
  K('przemyj', 'Pozostałość w zlewce przemyto 2×3 cm³ HCl i 3×5 cm³ wody – przez ten sam sączek do kolby.', 'przemy|przepłuk|opłucz|płucz;zlewk|pozostał|osad|sączek', 'Przemyj zlewkę dwa razy po 3 cm³ HCl i trzy razy po 5 cm³ wody, sącząc do tej samej kolby.', 'Przeniesienie ilościowe – bez przemycia część cynku zostałaby w zlewce.', 'przemywam pozostałość w zlewce kwasem i wodą przez ten sam sączek', 'zlewka', 'przelewanie', ['sacz'], True),
  K('kreska', 'Kolbę miarową uzupełniono wodą do kreski, zamknięto korkiem i wymieszano.', 'uzupełn|dopełn|dolew|dolej;kresk|miarow', 'Uzupełnij kolbę miarową wodą do kreski (menisk dolny), zamknij korkiem i wymieszaj.', 'Rezultat 2: kolba wypełniona do kreski, zamknięta, roztwór klarowny.', 'uzupełniam kolbę miarową wodą do kreski i mieszam', 'stol', 'przelewanie', ['przemyj'], stan={'zlewka': 'pusta'}),
  K('opisz', 'Kolbę opisano: „Próbka do badań” i numer stanowiska.', 'opisuj|opisz|opisać|podpis|oznacz|etykiet', 'Opisz kolbę: „Próbka do badań” oraz numer stanowiska.', 'Kryterium rezultatu 2 – łatwo o nim zapomnieć.', 'opisuję kolbę próbka do badań i numer stanowiska', 'stol', 'siegnij', ['kreska']),
  K('zglos2', 'Zgłoszono gotowość do oceny przygotowanej próbki.', 'zgłoś|zgłasz|podnieś|podnos|gotowoś;próbk', 'Zgłoś gotowość do oceny przygotowanej próbki.', 'Próbkę ocenia się bezpośrednio po podniesieniu ręki.', 'zgłaszam gotowość do oceny próbki', 'stol', 'reka', ['opisz']),
  K('pipeta', 'Do kolby stożkowej odpipetowano 25 cm³ roztworu pipetą jednomiarową.', PIPETA + ';25|próbk|roztw', 'Odmierz pipetą jednomiarową 25 cm³ roztworu z „próbki do badań” do kolby stożkowej.', 'Z 100 cm³ bierzesz 25 cm³ – stąd współmierność W = 4.', 'pipetuję 25 cm3 roztworu do kolby stożkowej', 'kolba', 'pipetowanie', ['zglos2'], True, wykl='bufor|wod|15', stan={'kolba': 'bezbarwny'}),
  K('bufor', 'Dodano 10 cm³ buforu amonowego pH 10 – pod włączonym dygestorium.', 'bufor|amonow', 'Dodaj 10 cm³ buforu amonowego – pod dygestorium.', 'Osobne kryterium: bufor amonowy dodawał pod włączonym dygestorium (drażniące opary amoniaku).', 'dodaję 10 cm3 buforu amonowego pod dygestorium', 'kolba', 'przelewanie', ['pipeta'], True),
  K('woda', 'Dodano 15 cm³ wody destylowanej (cylinder miarowy).', DODAJ + ';wod', 'Dodaj 15 cm³ wody destylowanej odmierzonej cylindrem.', 'Kryterium: dodał za pomocą cylindra miarowego wodę destylowaną.', 'dodaję 15 cm3 wody destylowanej do kolby', 'kolba', 'przelewanie', ['bufor'], wykl='kresk|miarow|przemy|zlewk'),
  K('czern', 'Dodano szczyptę czerni eriochromowej T – roztwór fioletowy.', 'czerń|czerni|eriochrom|wskaźnik', 'Dodaj łyżeczką szczyptę czerni eriochromowej T.', 'Wskaźnik tworzy z cynkiem fioletowy kompleks; EDTA wypiera go i barwa zmienia się na niebieską.', 'dodaję szczyptę czerni eriochromowej', 'kolba', 'pipetowanie', ['woda'], True, stan={'kolba': 'fioletowy'}),
  *zestaw('EDTA 0,05 mol/dm³', po=['zglos2'], zglos=False),
  W('miareczkuj', 'miareczkuję do niebieskiej barwy', wymaga=['zero', 'lejek', 'pecherz', 'czern'], opis='Miareczkowanie EDTA do zmiany barwy z fioletowej na niebieską.', podpowiedz='Miareczkuj roztworem EDTA do zmiany barwy na niebieską.', dlaczego='Niebieska barwa wolnego wskaźnika oznacza, że cały cynk związał się z EDTA.', stan={'kolba': 'niebieski', 'biuretaPoziom': 0.65, 'kolbaMiejsce': 'biureta'}),
  W('odczyt', 'odczytuję objętość z biurety'),
  W('powtorz', 'powtarzam oznaczenie drugi raz', opis='Wykonano drugie miareczkowanie.', podpowiedz='Powtórz miareczkowanie – wymagane są co najmniej dwa.', stan={'kolby': 2}),
  *porzadki(['powtorz'], dodatkowe=[K('saczek', 'Zużyty sączek wyrzucono do kosza na odpady.', 'sączek|sączk;kosz|wyrzuc|wyrzuć|odpad', 'Wyrzuć zużyty sączek do kosza na odpady.', 'Kryterium przebiegu 1 (zaliczane także podczas porządkowania).', 'wyrzucam zużyty sączek do kosza', 'odpady', 'siegnij', ['powtorz'], wykl='przemy|ten sam')]),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['EDTA', '0,05 mol/dm³'], 'wskaznik': ['czerń', 'eriochromowa T'], 'masaWagi': 'm', 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – tlenek cynku',
  'losuj': [{'id': 'zaw', 'od': 23.6, 'do': 26.4}, {'id': 'm', 'od': 0.985, 'do': 1.045, 'miejsca': 3}] + [{'id': f'v{i}', 'wzor': 'zaw/100*m/(0.05*81.37*4)*1000', 'szum': 0.06, 'krok': 0.1, 'miejsca': 1} for i in (1, 2)],
  'odczyty': [waga('m', 'Waga – pasta', 3), info('Etykieta pasty', 'Zawartość tlenku cynku: 25%'), biur('v1', 'Biureta – miareczkowanie 1'), biur('v2', 'Biureta – miareczkowanie 2')],
  'sekcje': [
   {'tytul': 'Wyniki miareczkowania', 'opis': 'cm³ – jedno miejsce po przecinku, dm³ – cztery miejsca.', 'tabela': {'wiersze': 2, 'kolumny': [{'naglowek': 'V EDTA [cm³]', 'pole': 'v{i}'}, {'naglowek': 'V EDTA [dm³]', 'pole': 'vd{i}'}]}},
   {'tytul': 'Dane do obliczeń', 'pola': [pole('vsr', 'V EDTA (średnia) =', 'dm³'), pole('c', 'C EDTA =', 'mol/dm³', 'kr'), pole('mm', 'M ZnO =', 'g/mol', 'kr'), pole('w', 'W =', None, 'kr'), pole('m', 'Masa odważki pasty m =', 'g')]},
   {'tytul': 'Obliczenia i ocena', 'pola': [pole('mzno', 'Zawartość ZnO w próbce do badań:', 'g'), pole('proc', 'Zawartość procentowa ZnO w paście:', '%', 'kr'), pole('ocena', 'Zawartość ZnO (jest zgodna / nie jest zgodna) z etykietą:', szer='dl')]}],
  'brudnopis': ['EDTA reaguje z cynkiem 1 : 1. Stężenie EDTA 0,05 mol/dm³, M ZnO = 81,37 g/mol.', '~1 dm³ EDTA — 0,05 mol | V dm³ — n mol (tyle ZnO jest w 25 cm³)', '~25 cm³ — n mol | 100 cm³ — 4 · n mol (współmierność W = 4)', '~1 mol ZnO — 81,37 g | 4n mol — a g', '~m pasty [g] — 100% | a [g] — X%'],
  'kryteria': [
   kr('Dwie objętości EDTA [cm³] zgodne z odczytem', 'Odczytaj na dolnym menisku, ±0,1 cm³.', liczba('v1', 'v1', 0.1), liczba('v2', 'v2', 0.1)),
   kr('Dwie objętości EDTA [dm³]', 'cm³ dzielisz przez 1000.', liczba('vd1', '$v1/1000', 0.000051), liczba('vd2', '$v2/1000', 0.000051)),
   kr('cm³ z dokładnością do 1 miejsca, dm³ do 4 miejsc po przecinku', 'Np. 15,4 cm³ = 0,0154 dm³.', miejsca('v1', 1), miejsca('v2', 1), miejsca('vd1', 4), miejsca('vd2', 4)),
   kr('Średnia objętość EDTA [dm³] z wyników różniących się najwyżej o 0,2 cm³', 'Średnia z V₁ i V₂ w dm³.', {'typ': 'rozrzut', 'pola': ['v1', 'v2'], 'max': 0.2}, liczba('vsr', 'sr($vd1,$vd2)', 0.000051), pokaz=('sr($vd1,$vd2)', 5, ' dm³')),
   kr('Współmierność kolby miarowej i pipety W = 4', 'Kolba 100 cm³, pipeta 25 cm³: 100 / 25 = 4.', liczba('w', '4', 0.001)),
   kr('Masa odważki pasty z dokładnością do 0,001 g', 'Przepisz masę z wagi – trzy miejsca po przecinku.', liczba('m', 'm', 0.0005), miejsca('m', 3)),
   kr('Obliczona zawartość ZnO w próbce do badań [g]', 'm ZnO = V · C · M · W, z V w dm³.', liczba('c', '0.05', 0.0001), liczba('mm', '81.37', 0.01), liczba('mzno', '$vsr*0.05*81.37*4', 0.0015), pokaz=('$vsr*0.05*81.37*4', 3, ' g')),
   kr('Obliczona zawartość procentowa ZnO w paście', 'm pasty — 100%, m ZnO — x%.', liczba('proc', '$mzno/$m*100', 0.6), pokaz=('$mzno/$m*100', 0, '%')),
   kr('m ZnO do trzeciego miejsca po przecinku, zawartość procentowa do całości', 'Zaokrąglij: gramy do 0,001, procenty do całości.', miejsca('mzno', 3), miejsca('proc', 0)),
   kr('Ocena adekwatna do wyniku i etykiety (25%)', 'Porównaj swój wynik (zaokrąglony do całości) z 25%.', {'typ': 'wybor', 'pole': 'ocena', 'wzor': '0.5-abs($proc-25)', 'tak': ['jest zgodna', 'zgodna'], 'nie': ['nie jest zgodna', 'niezgodna', 'nie zgodna']}),
  ]},
}
zapisz('04-tlenek-cynku.json', P)
print('ok 3-4')

# ───────────────────────── 5. NaCl – metoda Mohra
P = {
 'id': '05-nacl-mohr', 'tytul': 'Sól w marynacie do papryki', 'zrodlo': 'CHM.04 – styczeń 2025', 'metoda': 'Precypitometria – argentometria (metoda Mohra)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Przygotuj próbkę i wykonaj oznaczenie zawartości soli NaCl w marynacie do papryki.\nZmontuj zestaw do sączenia oraz zestaw do miareczkowania. Napełnij biuretę titrantem. Zgłoś gotowość do oceny obu zestawów przez podniesienie ręki.\nMieszaniny poreakcyjne przelej do pojemnika na odpady ciekłe. Niezużyte roztwory i próbkę pozostaw na stanowisku.'},
  {'tytul': 'Procedura', 'tresc': '1. Przygotowanie próbki\nPrzygotować sączek karbowany i przesączyć zalewę znad papryki. Odmierzyć pipetą 25 cm³ przesączu do kolby miarowej 100 cm³, dopełnić wodą do kreski i opisać (rodzaj próbki i produktu). Zawartość delikatnie wymieszać – energiczne mieszanie powoduje pienienie.\n2. Wykonanie oznaczenia\nDo czterech kolb stożkowych odmierzyć po 10 cm³ roztworu (odpowiada to 2,5 cm³ lub 2,5 g marynaty).\nW jednej próbce ustalić liczbę kropli NaOH 1% potrzebną do zobojętnienia: dodać 2 krople fenoloftaleiny i wkraplać NaOH do jasnoróżowego zabarwienia. Pozostałe próbki zobojętnić tą samą liczbą kropli, bez fenoloftaleiny.\nDodać po 1 cm³ chromianu(VI) potasu 10% i miareczkować azotanem(V) srebra(I) 0,1 mol/dm³ do trwałej ceglastopomarańczowej barwy.\n3. Obliczenia\nx = (a · n · 0,05845 · 100) / b\n- x – zawartość NaCl [% wagowe]\n- a – objętość AgNO₃ [cm³]\n- n – stężenie AgNO₃ [mol/dm³]\n- b – ilość marynaty w roztworze miareczkowanym [g lub cm³]\nWynik: średnia z co najmniej dwóch oznaczeń nieróżniących się o więcej niż 0,2; z dokładnością do 0,1%. Przeliczyć na gramy w 1 kg produktu.'}],
 'kroki': [
  K('saczenie_zestaw', 'Zestaw do sączenia zmontowany: sączek karbowany w lejku, lejek w pierścieniu, nóżka lejka przy ściance zlewki.', 'zmont|montuj|montaż|złóż|składa|przygotow|ustaw;sącz', 'Zmontuj zestaw do sączenia z sączkiem karbowanym.', 'Rezultat 1: sączek nie wystaje poza lejek, lejek w pierścieniu, pod nim zlewka, nóżka dotyka ścianki.', 'montuję zestaw do sączenia z sączkiem karbowanym', 'zlewka', 'siegnij', wykl='rozmont|demont|miareczk'),
  *[dict(k, wykluczajace=k['wykluczajace'] + ['sącz']) if k['id'] == 'montaz' else k for k in zestaw('AgNO₃ 0,1 mol/dm³')],
  K('przesacz', 'Zalewę znad papryki przesączono przez sączek karbowany.', 'przesącz|sączę|sącz|przefiltr;zalew|marynat|próbk', 'Przesącz zalewę znad papryki.', 'Kryterium przebiegu: przygotowując próbkę, przesączył zalewę.', 'przesączam zalewę znad papryki', 'zlewka', 'przelewanie', ['saczenie_zestaw', 'zglos'], wykl='zestaw|montuj|zmont|rozmont', stan={'zlewka': 'roztwor'}),
  K('pipeta25', 'Pipetą jednomiarową odmierzono 25 cm³ przesączu do kolby miarowej 100 cm³.', PIPETA + ';25|przesącz|miarow', 'Odmierz pipetą 25 cm³ przesączu do kolby miarowej 100 cm³.', 'Kryterium: pobrał pipetą jednomiarową zalewę i przeniósł ilościowo do kolby miarowej.', 'pipetuję 25 cm3 przesączu do kolby miarowej', 'stol', 'pipetowanie', ['przesacz'], True, wykl='10 cm|stożkow|kresk'),
  K('kreska', 'Kolbę miarową dopełniono wodą do kreski, opisano i delikatnie wymieszano.', 'dopełn|uzupełn|dolew|dolej;kresk|miarow|wod', 'Dopełnij kolbę wodą do kreski, opisz ją i delikatnie wymieszaj.', 'Kryterium: dopełnił kolbę do kreski, zamknął korkiem i wymieszał. Delikatnie – roztwór się pieni.', 'dopełniam kolbę miarową wodą do kreski i delikatnie mieszam', 'stol', 'przelewanie', ['pipeta25']),
  K('porcje', 'Do czterech kolb stożkowych odmierzono po 10 cm³ roztworu.', PIPETA + ';10|stożkow|czter|4 kolb', 'Odmierz pipetą po 10 cm³ roztworu do czterech kolb stożkowych.', '10 cm³ roztworu odpowiada 2,5 cm³ marynaty – to „b” we wzorze.', 'odmierzam pipetą po 10 cm3 roztworu do czterech kolb stożkowych', 'kolba', 'pipetowanie', ['kreska'], True, wykl='25|miarow', stan={'kolba': 'bezbarwny'}),
  K('zobojetnij1', 'W pierwszej próbce: 2 krople fenoloftaleiny i NaOH 1% do jasnoróżowej barwy – policzono krople.', 'fenoloft|policz|licz|ustal|pierwsz;zoboj|naoh|kropl|wodorotlen', 'W jednej próbce dodaj 2 krople fenoloftaleiny i wkraplaj NaOH 1% do jasnoróżowej barwy, licząc krople.', 'Metoda Mohra wymaga odczynu obojętnego; liczbę kropli wpisujesz do karty.', 'w pierwszej próbce dodaję fenoloftaleinę i wkraplam NaOH licząc krople', 'kolba', 'pipetowanie', ['porcje'], True, wykl='pozostał|bez fenol|resztę|tą samą'),
  K('zobojetnij2', 'Pozostałe próbki zobojętniono tą samą liczbą kropli NaOH – bez fenoloftaleiny.', 'pozostał|reszt|kolejn|tą samą|tyle samo|bez fenol;zoboj|naoh|kropl|próbk', 'Pozostałe próbki zobojętnij tą samą liczbą kropli NaOH, bez fenoloftaleiny.', 'Fenoloftaleina utrudniłaby zauważenie ceglastej barwy w punkcie końcowym.', 'pozostałe próbki zobojętniam tą samą liczbą kropli NaOH bez fenoloftaleiny', 'kolba', 'pipetowanie', ['zobojetnij1'], True),
  K('chromian', 'Dodano po 1 cm³ chromianu(VI) potasu 10% – roztwór żółty.', 'chromian|k2cro4|wskaźnik', 'Dodaj po 1 cm³ roztworu chromianu(VI) potasu.', 'Chromian jest wskaźnikiem: po strąceniu chlorków powstaje ceglasty Ag₂CrO₄.', 'dodaję po 1 cm3 chromianu potasu', 'kolba', 'pipetowanie', ['zobojetnij2'], True, stan={'kolba': 'zolty'}),
  W('miareczkuj', 'miareczkuję do ceglastej barwy', wymaga=['zglos', 'chromian'], opis='Miareczkowanie AgNO₃ do trwałej ceglastopomarańczowej barwy.', podpowiedz='Miareczkuj roztworem AgNO₃ do trwałej ceglastopomarańczowej barwy.', dlaczego='Najpierw strąca się biały AgCl, a po wyczerpaniu chlorków – ceglasty Ag₂CrO₄.', stan={'kolba': 'ceglasty', 'biuretaPoziom': 0.65, 'kolbaMiejsce': 'biureta'}),
  W('odczyt', 'odczytuję objętość z biurety'),
  W('powtorz', 'powtarzam oznaczenie jeszcze dwa razy', opis='Wykonano kolejne oznaczenia – razem co najmniej 3.'),
  W('odpady', 'przelewam mieszaniny poreakcyjne do pojemnika na odpady ciekłe', wymaga=['powtorz']),
  K('rozmontuj_sacz', 'Zestaw do sączenia rozmontowany.', 'rozmont|zdemont|demont|rozkład|rozbier|rozłóż;sącz', 'Rozmontuj zestaw do sączenia.', 'Kryterium porządkowania: zestaw do sączenia jest rozmontowany.', 'rozmontowuję zestaw do sączenia', 'zlewka', 'siegnij', ['powtorz'], stan={'zlewka': 'pusta'}),
  W('rozmontuj', 'rozmontowuję zestaw do miareczkowania', wymaga=['powtorz'], wykl='sącz'),
  W('myj', 'myję szkło laboratoryjne'),
  W('stol', 'wycieram stół', wymaga=['myj', 'rozmontuj', 'rozmontuj_sacz']),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['AgNO₃', '0,1 mol/dm³'], 'wskaznik': ['K₂CrO₄', '10%'], 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – sól w marynacie',
  'losuj': [{'id': 'zaw', 'od': 0.9, 'do': 1.1}, {'id': 'krople', 'wybierz': [3, 4, 5, 6]}] + [{'id': f'v{i}', 'wzor': 'zaw*2.5/(0.1*0.05845*100)', 'szum': 0.04, 'krok': 0.05, 'miejsca': 2} for i in (1, 2, 3)],
  'odczyty': [wysw('krople', 'Krople NaOH do zobojętnienia', 0, 'kropli'), info('Etykieta marynaty', 'Sól: 10,0 g w 1 kg produktu'), biur('v1', 'Biureta – próbka 1'), biur('v2', 'Biureta – próbka 2'), biur('v3', 'Biureta – próbka 3')],
  'sekcje': [
   {'tytul': 'Część A', 'opis': 'Strzałkę zapisz jako -> albo =. Osad możesz oznaczyć strzałką w dół lub pominąć.', 'pola': [
     pole('r1', 'Reakcja oznaczania (cząsteczkowo):', szer='max'), pole('r2', 'Reakcja wskaźnika (cząsteczkowo):', szer='max'),
     pole('r3', 'Reakcja oznaczania (jonowo):', szer='max'), pole('r4', 'Reakcja wskaźnika (jonowo):', szer='max'),
     pole('wsk', 'Wskaźnik:', szer='dl'), pole('titrant', 'Titrant (wzór, nazwa, stężenie):', szer='max'), pole('krople', 'Liczba kropli NaOH do zobojętnienia:', szer='kr')]},
   {'tytul': 'Część B', 'tabela': {'wiersze': 3, 'kolumny': [{'naglowek': 'Marynata w roztworze [cm³]', 'pole': 'b{i}'}, {'naglowek': 'V AgNO₃ [cm³]', 'pole': 'v{i}'}, {'naglowek': 'NaCl [% m/m]', 'pole': 'x{i}'}, {'naglowek': 'NaCl [g/kg]', 'pole': 'g{i}'}]},
    'pola': [pole('xsr', 'Średnia zawartość NaCl:', '% (m/m)', 'kr'), pole('gsr', 'Średnia zawartość NaCl:', 'g/1 kg', 'kr'), pole('etyk', 'Zawartość soli na etykiecie:', 'g/kg', 'kr'), pole('wniosek', 'Zawartość soli (zgodna / niezgodna) z etykietą:', szer='dl')]}],
  'brudnopis': ['1 cm³ AgNO₃ 0,1 mol/dm³ strąca chlorki z 0,005845 g NaCl (0,1 · 0,05845).', '~1 cm³ AgNO₃ — 0,005845 g NaCl | a cm³ — y g NaCl', '~2,5 g marynaty — 100% | y g — x%', 'Przeliczenie na 1 kg:', '~100 g marynaty — x g NaCl | 1000 g — z g NaCl', 'Za zgodną z etykietą przyjmij zawartość 10,0 ± 1,0 g/kg.'],
  'kryteria': [
   kr('Równanie: AgNO₃ + NaCl → AgCl↓ + NaNO₃', 'AgNO₃ + NaCl → AgCl↓ + NaNO₃', rown('r1', ['agno3', 'nacl'], ['agcl', 'nano3'])),
   kr('Równanie: 2AgNO₃ + K₂CrO₄ → Ag₂CrO₄↓ + 2KNO₃', '2AgNO₃ + K₂CrO₄ → Ag₂CrO₄↓ + 2KNO₃', rown('r2', ['2agno3', 'k2cro4'], ['ag2cro4', '2kno3'])),
   kr('Równanie jonowe: Ag⁺ + Cl⁻ → AgCl', 'Ag⁺ + Cl⁻ → AgCl↓', rown('r3', ['ag', 'cl'], ['agcl'])),
   kr('Równanie jonowe: 2Ag⁺ + CrO₄²⁻ → Ag₂CrO₄', '2Ag⁺ + CrO₄²⁻ → Ag₂CrO₄↓', rown('r4', ['2ag', 'cro42'], ['ag2cro4'])),
   kr('Wskaźnik: chromian(VI) potasu', 'Wskaźnikiem jest chromian(VI) potasu, K₂CrO₄.', tekst('wsk', 'chromian', 'k2cro4')),
   kr('Titrant: AgNO₃, azotan(V) srebra(I), 0,1 mol/dm³', 'Podaj wzór, nazwę i stężenie.', tekst('titrant', 'agno3', 'azotan'), tekst('titrant', '0,1', '0.1')),
   kr('Liczba kropli NaOH zgodna ze stanem faktycznym', 'Przepisz liczbę kropli z odczytu.', liczba('krople', 'krople', 0.1)),
   kr('Objętość marynaty w roztworze miareczkowanym: 2,5 cm³', '10 cm³ roztworu odpowiada 2,5 cm³ marynaty.', *[liczba(f'b{i}', '2.5', 0.01) for i in (1, 2, 3)]),
   kr('Trzy objętości AgNO₃ zgodne z odczytem', 'Odczytaj na dolnym menisku, ±0,05 cm³.', *[liczba(f'v{i}', f'v{i}', 0.05) for i in (1, 2, 3)]),
   kr('Zawartość NaCl w % wagowych dla trzech próbek', 'x = a · 0,1 · 0,05845 · 100 / 2,5. Próbka 1:', *[liczba(f'x{i}', f'$v{i}*0.1*0.05845*100/2.5', 0.06) for i in (1, 2, 3)], pokaz=('$v1*0.1*0.05845*100/2.5', 1, '%')),
   kr('Zawartość NaCl w g/1 kg dla trzech próbek', '1% to 10 g w 1 kg.', *[liczba(f'g{i}', f'$x{i}*10', 0.06) for i in (1, 2, 3)]),
   kr('Średnie: w % wagowych i w g/1 kg', 'Średnia z trzech wyników.', liczba('xsr', 'sr($x1,$x2,$x3)', 0.06), liczba('gsr', '$xsr*10', 0.06)),
   kr('Zawartość procentowa z dokładnością do jednego miejsca po przecinku', 'Zaokrąglij procenty do 0,1.', *[miejsca(p, 1) for p in ('x1', 'x2', 'x3', 'xsr')]),
   kr('Zawartość NaCl podana na etykiecie', 'Na etykiecie: 10,0 g/kg.', liczba('etyk', '10', 0.01)),
   kr('Wniosek adekwatny do wyników i etykiety', 'Porównaj średnią w g/kg z 10,0 g/kg (tu: zgodna, jeśli różnica nie przekracza 1,0 g/kg).', {'typ': 'wybor', 'pole': 'wniosek', 'wzor': '1.0-abs($gsr-10)+0.000001', 'tak': ['zgodna'], 'nie': ['niezgodna', 'nie zgodna', 'nie jest zgodna']}),
  ]},
}
zapisz('05-nacl-mohr.json', P)

# ───────────────────────── 6. Tlen rozpuszczony – Winkler
SKOK = lambda a: f'min(1,max(0,($x-{a})*1000000+1))'
P = {
 'id': '06-tlen-winkler', 'tytul': 'Tlen rozpuszczony w wodzie', 'zrodlo': 'CHM.04 – czerwiec 2023', 'metoda': 'Redoksymetria – jodometria (metoda Winklera) + pH-metr', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Wykonaj oznaczenie zawartości tlenu rozpuszczonego w badanej wodzie metodą Winklera oraz zmierz pH badanej wody.\nOceń wodę, porównując wyniki z wartościami granicznymi dla klas jakości wód powierzchniowych.\nMieszaniny poreakcyjne przelej do pojemnika na odpady ciekłe.'},
  {'tytul': 'Procedura – tlen metodą Winklera', 'tresc': 'Do butelki z badaną wodą dodać możliwie najgłębiej pod powierzchnię 2 cm³ roztworu MnSO₄ i 4 cm³ zasadowego roztworu KI. Zamknąć szczelnie korkiem bez pęcherzyka powietrza, dokładnie wymieszać i pozostawić w ciemnym miejscu do opadnięcia osadu (około 10 minut).\nPod powierzchnię wprowadzić 2 cm³ H₂SO₄ 95%, zamknąć i mieszać do całkowitego rozpuszczenia osadu. Pozostawić w ciemnym miejscu na 5 minut.\nDo kolby stożkowej odmierzyć pipetą 100 cm³ roztworu i miareczkować Na₂S₂O₃ 0,0250 mol/dm³ do słomkowego zabarwienia. Dodać około 2 cm³ skrobi i szybko miareczkować do odbarwienia.\nObliczenia\nX = (0,2 · V śr · 1000) / V\n- X – zawartość tlenu [mg O₂/dm³]\n- 0,2 – mg tlenu odpowiadające 1 cm³ Na₂S₂O₃\n- V śr – średnia objętość Na₂S₂O₃ [cm³] z wyników różniących się najwyżej o 0,2 cm³\n- V – objętość próbki wody [cm³]\nXn = X · 100 / Xt\n- Xn – stopień nasycenia [%]\n- Xt – rozpuszczalność tlenu w danej temperaturze (tabela A)\nWyniki z dokładnością do 0,1.'},
  {'tytul': 'Tabela A – rozpuszczalność tlenu [mg O₂/dm³]', 'tresc': '- 16 °C – 9,84\n- 17 °C – 9,66\n- 18 °C – 9,46\n- 19 °C – 9,27\n- 20 °C – 9,08\n- 21 °C – 8,90\n- 22 °C – 8,73\n- 23 °C – 8,57\n- 24 °C – 8,41'},
  {'tytul': 'Tabela B – klasy jakości wód', 'tresc': 'Tlen rozpuszczony [mg O₂/dm³]\n- klasa I: 7 i powyżej\n- klasa II: 6 i powyżej\n- klasa III: 5 i powyżej\n- klasa IV: 4 i powyżej\n- klasa V: poniżej 4\nWartość pH\n- klasa I: 6,6–8,5\n- klasa II: 6,0–8,5\n- klasa III: 6,0–9,0\n- klasa IV: 5,5–9,0\n- klasa V: poniżej 5,5 lub powyżej 9,0'},
  {'tytul': 'Procedura – pomiar pH', 'tresc': 'Uruchomić pehametr. Elektrodę spłukać wodą destylowaną i osuszyć bibułą. Do zlewki odmierzyć 50 cm³ badanej wody i wykonać pomiar pH z dokładnością do 0,1.'}],
 'kroki': [
  K('utrwal', 'Pod powierzchnię wody dodano 2 cm³ MnSO₄ i 4 cm³ zasadowego KI.', 'mnso4|mangan|jodek|ki ', 'Dodaj pod powierzchnię wody 2 cm³ MnSO₄ i 4 cm³ zasadowego roztworu KI.', 'Tlen utlenia mangan(II) w środowisku zasadowym – tak „utrwala się” tlen w próbce.', 'dodaję pod powierzchnię wody MnSO4 i zasadowy jodek potasu', 'kolba', 'pipetowanie', [], True, stan={'kolba': 'bezbarwny'}),
  K('zamknij1', 'Butelkę zamknięto bez pęcherzyka powietrza, wymieszano i odstawiono w ciemne miejsce do opadnięcia osadu.', 'zamyk|zamkn|zakork|korkiem|odstaw|ciemn', 'Zamknij butelkę korkiem bez pęcherzyka powietrza, wymieszaj i odstaw w ciemne miejsce na ok. 10 minut.', 'Pęcherzyk powietrza dostarczyłby dodatkowy tlen i zawyżył wynik.', 'zamykam butelkę korkiem, mieszam i odstawiam w ciemne miejsce', 'kolba', 'mieszanie', ['utrwal'], wykl='kwas|h2so4', stan={'kolba': 'brunatny'}),
  K('kwas', 'Pod powierzchnię wprowadzono 2 cm³ H₂SO₄ 95%, zamknięto, wymieszano do rozpuszczenia osadu i odstawiono na 5 minut.', 'h2so4|kwas|siarkow', 'Wprowadź pod powierzchnię 2 cm³ stężonego H₂SO₄, zamknij, wymieszaj do rozpuszczenia osadu i odstaw na 5 minut.', 'W środowisku kwasowym wydziela się jod w ilości równoważnej tlenowi.', 'dodaję pod powierzchnię 2 cm3 kwasu siarkowego, zamykam i mieszam', 'kolba', 'pipetowanie', ['zamknij1'], True, stan={'kolba': 'zolty'}),
  *zestaw('Na₂S₂O₃ 0,0250 mol/dm³', zglos=False, biureta='biureta 10 cm³'),
  K('pipeta100', 'Pipetą jednomiarową odmierzono 100 cm³ roztworu do kolby stożkowej.', PIPETA + ';100|stożkow|roztw', 'Odmierz pipetą jednomiarową 100 cm³ roztworu do kolby stożkowej.', 'Kryterium: odmierzył pipetą jednomiarową 100 cm³; V = 100 cm³ we wzorze.', 'pipetuję 100 cm3 roztworu do kolby stożkowej', 'kolba', 'pipetowanie', ['kwas'], True, wykl='50|zlewk'),
  W('miareczkuj', 'miareczkuję do słomkowej barwy', wymaga=['zero', 'lejek', 'pecherz', 'pipeta100'], opis='Miareczkowanie Na₂S₂O₃ do słomkowego zabarwienia.', podpowiedz='Miareczkuj tiosiarczanem do słomkowego (jasnożółtego) zabarwienia.', dlaczego='Skrobię dodaje się dopiero przy słomkowej barwie – przy dużym stężeniu jodu kompleks ze skrobią trudno się rozkłada.', wykl='zestaw|powtórz|drug|trzec|kolejn|jeszcze|ponown|odbarw|bezbarw|skrobi', stan={'kolba': 'slomkowy', 'biuretaPoziom': 0.8, 'kolbaMiejsce': 'biureta'}),
  K('skrobia', 'Dodano ok. 2 cm³ roztworu skrobi – roztwór granatowy.', DODAJ + ';skrobi', 'Dodaj wkraplaczem około 2 cm³ roztworu skrobi.', 'Skrobia z jodem daje granatowe zabarwienie – wyraźnie widać koniec miareczkowania.', 'dodaję 2 cm3 skrobi', 'kolba', 'pipetowanie', ['miareczkuj'], wykl='miareczk', stan={'kolba': 'granatowy'}),
  K('odbarw', 'Miareczkowanie dokończono do odbarwienia próbki.', 'miareczk|dokańcz|dokończ;odbarw|bezbarw|zanik|znikn|końca', 'Miareczkuj szybko do odbarwienia się próbki.', 'Odbarwienie oznacza, że cały jod przereagował z tiosiarczanem.', 'miareczkuję do odbarwienia', 'statyw', 'miareczkowanie', ['skrobia'], True, stan={'kolba': 'bezbarwny', 'biuretaPoziom': 0.6}),
  W('odczyt', 'odczytuję objętość z biurety', wymaga=['odbarw']),
  W('powtorz', 'powtarzam oznaczenie drugi raz', opis='Wykonano drugie miareczkowanie.', podpowiedz='Powtórz miareczkowanie – wymagane są co najmniej dwa.', stan={'kolby': 2}),
  K('temperatura', 'Zmierzono temperaturę badanej wody.', 'temperatur|termometr', 'Zmierz temperaturę badanej wody termometrem.', 'Temperatura jest potrzebna, żeby odczytać rozpuszczalność tlenu Xt z tabeli A.', 'mierzę temperaturę wody termometrem', 'zlewka', 'siegnij'),
  K('elektroda1', 'Elektroda opłukana wodą destylowaną i osuszona bibułą.', 'opłucz|spłucz|przemy|płucz|osusz;elektrod', 'Opłucz elektrodę wodą destylowaną i osusz bibułą.', 'Kryterium przebiegu 2.', 'opłukuję elektrodę wodą destylowaną i osuszam bibułą', 'zlewka', 'siegnij', wykl='po pomiar|ponown'),
  K('ph', 'Do zlewki odmierzono 50 cm³ badanej wody i zmierzono pH.', 'zmierz|mierz|pomiar|odczyt|zanurz;ph|pehametr', 'Odmierz do zlewki 50 cm³ badanej wody i zmierz pH z dokładnością do 0,1.', 'Kryterium: pobrał do zlewki około 50 cm³ wody i wykonał pomiar pH.', 'odmierzam 50 cm3 wody do zlewki i mierzę pH', 'zlewka', 'siegnij', ['elektroda1'], wykl='biuret|temperatur', stan={'zlewka': 'roztwor'}),
  K('elektroda2', 'Po pomiarze elektrodę ponownie opłukano i osuszono.', 'po pomiar|ponown|znów|znowu|jeszcze raz;elektrod', 'Po pomiarze ponownie opłucz i osusz elektrodę.', 'Osobne kryterium: po wykonaniu pomiaru przemył elektrodę.', 'po pomiarze ponownie opłukuję elektrodę', 'zlewka', 'siegnij', ['ph']),
  *porzadki(['powtorz', 'elektroda2', 'temperatura'], waga=False),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['Na₂S₂O₃', '0,0250 mol/dm³'], 'wskaznik': ['skrobia', '0,5%'], 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – tlen rozpuszczony',
  'losuj': [{'id': 'x', 'od': 5.2, 'do': 9.4}, {'id': 't', 'wybierz': [18, 19, 20, 21, 22]}, {'id': 'xt', 'wzor': '9.46-0.1825*(t-18)'}, {'id': 'ph', 'od': 6.8, 'do': 8.3, 'miejsca': 1}] + [{'id': f'v{i}', 'wzor': 'x/2', 'szum': 0.04, 'krok': 0.05, 'miejsca': 2} for i in (1, 2)],
  'odczyty': [biur('v1', 'Biureta – miareczkowanie 1'), biur('v2', 'Biureta – miareczkowanie 2'), wysw('t', 'Termometr', 0, '°C'), wysw('ph', 'Pehametr', 1, 'pH')],
  'sekcje': [
   {'tytul': 'Tabela 3. Dokumentacja z badań', 'pola': [pole('vp', 'Objętość próbki wody użytej do miareczkowania V =', 'cm³', 'kr'), pole('v1', 'V₁ =', 'cm³', 'kr'), pole('v2', 'V₂ =', 'cm³', 'kr'), pole('vsr', 'V śr =', 'cm³', 'kr'),
     pole('x', 'Zawartość tlenu rozpuszczonego X =', 'mg O₂/dm³', 'kr'), pole('t', 'Temperatura badanej wody:', '°C', 'kr'), pole('xt', 'Rozpuszczalność tlenu Xt (tabela A):', 'mg O₂/dm³', 'kr'), pole('xn', 'Stopień nasycenia wody tlenem Xn =', '%', 'kr'), pole('ph', 'pH badanej wody:', szer='kr')]},
   {'tytul': 'Tabela 4. Ocena wody', 'opis': 'Klasę wpisz cyfrą od 1 do 5.', 'pola': [pole('kt', 'Klasa czystości – tlen rozpuszczony:', szer='kr'), pole('kph', 'Klasa czystości – pH:', szer='kr'), pole('ocena', 'Ocena wody – klasa czystości (wg gorszego wskaźnika):', szer='kr')]}],
  'brudnopis': ['1 cm³ Na₂S₂O₃ 0,0250 mol/dm³ odpowiada 0,2 mg tlenu.', '~1 cm³ Na₂S₂O₃ — 0,2 mg O₂ | V śr cm³ — a mg O₂ (w 100 cm³ wody)', '~100 cm³ wody — a mg O₂ | 1000 cm³ — X mg O₂', 'Stopień nasycenia:', '~Xt (z tabeli A) — 100% | X — Xn%'],
  'kryteria': [
   kr('Objętość próbki wody pobranej do analizy – 100 cm³', 'Do miareczkowania odmierzasz 100 cm³.', liczba('vp', '100', 0.1)),
   kr('Dwa wyniki miareczkowania w cm³', 'Odczytaj na dolnym menisku, ±0,05 cm³.', liczba('v1', 'v1', 0.05), liczba('v2', 'v2', 0.05)),
   kr('Średnia z wyników nieróżniących się o więcej niż 0,2 cm³', 'Średnia arytmetyczna V₁ i V₂.', {'typ': 'rozrzut', 'pola': ['v1', 'v2'], 'max': 0.2}, liczba('vsr', 'sr($v1,$v2)', 0.03), pokaz=('sr($v1,$v2)', 2, ' cm³')),
   kr('Obliczona zawartość tlenu rozpuszczonego', 'X = 0,2 · V śr · 1000 / 100.', liczba('x', '0.2*$vsr*1000/100', 0.06), pokaz=('0.2*$vsr*1000/100', 1, ' mg O₂/dm³')),
   kr('Wartość zmierzonej temperatury wody', 'Przepisz temperaturę z termometru.', liczba('t', 't', 0.1)),
   kr('Rozpuszczalność tlenu odczytana z tabeli A', 'Znajdź w tabeli A wiersz dla swojej temperatury.', liczba('xt', 'xt', 0.03)),
   kr('Obliczony stopień nasycenia wody tlenem', 'Xn = X · 100 / Xt.', liczba('xn', '$x*100/$xt', 0.6), pokaz=('$x*100/$xt', 1, '%')),
   kr('Zawartość tlenu i stopień nasycenia z dokładnością do 0,1', 'Jedno miejsce po przecinku.', miejsca('x', 1), miejsca('xn', 1)),
   kr('Wynik pomiaru pH badanej wody', 'Przepisz pH z pehametru.', liczba('ph', 'ph', 0.05)),
   kr('Klasa czystości pod względem tlenu rozpuszczonego', 'Porównaj X z tabelą B: I ≥ 7, II ≥ 6, III ≥ 5, IV ≥ 4, V < 4.', liczba('kt', f'5-{SKOK(4)}-{SKOK(5)}-{SKOK(6)}-{SKOK(7)}', 0.1)),
   kr('Klasa czystości pod względem pH', 'pH w zakresie 6,6–8,5 to klasa I.', liczba('kph', '1', 0.1)),
   kr('Ocena wody – zakwalifikowanie do klasy', 'O klasie decyduje gorszy wskaźnik (wyższy numer klasy).', liczba('ocena', 'max($kt,$kph)', 0.1)),
  ]},
}
zapisz('06-tlen-winkler.json', P)
print('ok 5-6')

# ───────────────────────── 7. Kwas octowy – miareczkowanie potencjometryczne i wobec wskaźnika
P = {
 'id': '07-ocet', 'tytul': 'Kwas octowy w occie', 'zrodlo': 'CHM.04 – styczeń 2024', 'metoda': 'Miareczkowanie potencjometryczne + alkacymetria wobec wskaźnika', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Przygotuj próbkę octu (procedura 1). Wykonaj oznaczenie kwasu octowego metodą miareczkowania potencjometrycznego (procedura 2): zapisz wyniki, sporządź krzywą pH = f(V NaOH), wyznacz graficznie punkt końcowy (PK), jego pH i objętość V PK.\nNa podstawie krzywej dobierz wskaźnik i wykonaj oznaczenie metodą miareczkowania wobec wskaźnika (procedura 3).\nPorównaj wyniki ze stężeniem deklarowanym przez producenta. Przed miareczkowaniem potencjometrycznym zgłoś gotowość do oceny zestawu.'},
  {'tytul': 'Procedury', 'tresc': 'Procedura 1. Przygotowanie próbki\nDo kolby miarowej 100 cm³ pobrać pipetą 10 cm³ octu i rozcieńczyć wodą do kreski. Gęstość octu przyjąć 1 g/cm³.\nProcedura 2. Miareczkowanie potencjometryczne\nDo zlewki 250 cm³ pobrać pipetą 20 cm³ roztworu octu i dodać 80 cm³ wody. Zlewkę umieścić na mieszadle magnetycznym, zanurzyć element mieszający i elektrodę. Biuretę z NaOH 0,250 mol/dm³ ustawić nad zlewką. Dodawać NaOH porcjami, po każdej porcji wymieszać, zatrzymać mieszadło i odczytać pH. Pehametr jest wykalibrowany.\nProcedura 3. Miareczkowanie wobec wskaźnika\nDo kolby stożkowej pobrać pipetą 20 cm³ roztworu octu, dodać 30 cm³ wody i 2 krople wskaźnika: oranż metylowy (pH 3,1–4,4) albo fenoloftaleina (pH 8,2–10,0). Miareczkować NaOH 0,250 mol/dm³ do pierwszej trwałej zmiany barwy. Wykonać co najmniej dwa razy.\nObliczenia\nX = (V · C · M · 5) / 100\n- X – zawartość kwasu octowego [%]\n- V – objętość NaOH [cm³]\n- C – 0,250 mol/dm³\n- M – 60,05 g/mol\n- 5 – współmierność kolby miarowej i pipety\nWynik z dokładnością do całości.\nProcedura 4. Porządkowanie\nOdłączyć pehametr, elektrodę przemyć wodą destylowaną i osuszyć. Rozmontować zestaw. Mieszaniny poreakcyjne przelać do pojemnika na odpady ciekłe.'}],
 'kroki': [
  K('rozciencz', 'Pipetą pobrano 10 cm³ octu do kolby miarowej 100 cm³ i rozcieńczono wodą do kreski.', PIPETA + '|rozcieńcz;10|ocet|octu|miarow', 'Pobierz pipetą 10 cm³ octu do kolby miarowej 100 cm³ i rozcieńcz wodą do kreski.', 'Kryterium wykazu sprzętu: kolba miarowa 100 cm³ i pipeta jednomiarowa 10 cm³.', 'pipetuję 10 cm3 octu do kolby miarowej i rozcieńczam do kreski', 'stol', 'pipetowanie', [], True, wykl='20|zlewk|stożkow|80|30'),
  K('zlewka20', 'Do zlewki 250 cm³ pobrano pipetą 20 cm³ roztworu octu i dodano 80 cm³ wody.', PIPETA + '|' + DODAJ + ';zlewk|80', 'Pobierz pipetą 20 cm³ roztworu do zlewki 250 cm³ i dodaj 80 cm³ wody.', 'Kryteria: pobrał roztwór pipetą z gruszką, dodał wodę destylowaną.', 'pipetuję 20 cm3 roztworu do zlewki i dodaję 80 cm3 wody', 'zlewka', 'przelewanie', ['rozciencz'], True, wykl='stożkow|30|fenoloft', stan={'zlewka': 'roztwor'}),
  K('mieszadlo', 'Zlewka stoi na mieszadle magnetycznym, w roztworze element mieszający i elektroda.', 'mieszadł|mieszadeł|dipol|elektrod;umieszcz|staw|ustaw|zanurz|wkład|włóż|włącz', 'Postaw zlewkę na mieszadle magnetycznym, włóż element mieszający i zanurz elektrodę.', 'Kryterium: zlewka na mieszadle, element mieszający zanurzony, elektroda i czujnik na statywie.', 'stawiam zlewkę na mieszadle magnetycznym i zanurzam elektrodę', 'zlewka', 'siegnij', ['zlewka20'], wykl='opłucz|przemy|osusz|odłącz'),
  *zestaw('NaOH 0,250 mol/dm³', biureta='biureta 25 cm³'),
  K('potencjo', 'Miareczkowanie potencjometryczne: NaOH dodawano porcjami, po każdej odczytano pH (19 punktów).', 'miareczk|dodaj|dodaję;porcj|potencjometr|ph', 'Dodawaj NaOH porcjami z tabeli; po każdej porcji wymieszaj, zatrzymaj mieszadło i odczytaj pH.', 'Kryterium: po każdej porcji odczytywał pH po wymieszaniu i ustabilizowaniu wskazań.', 'miareczkuję potencjometrycznie porcjami i odczytuję pH po każdej porcji', 'statyw', 'kranik', ['zglos', 'mieszadlo'], True, wykl='fenoloft|wskaźnik|różow', stan={'biuretaPoziom': 0.3}),
  K('elektroda', 'Po miareczkowaniu elektrodę opłukano wodą destylowaną i osuszono.', 'opłucz|przemy|spłucz|płucz|osusz;elektrod', 'Opłucz elektrodę wodą destylowaną i osusz bibułą.', 'Kryterium: po zakończeniu miareczkowania opłukał elektrodę i osuszył.', 'opłukuję elektrodę wodą destylowaną i osuszam', 'zlewka', 'siegnij', ['potencjo'], wykl='odłącz'),
  K('kolba20', 'Do kolby stożkowej pobrano 20 cm³ roztworu octu i dodano 30 cm³ wody.', PIPETA + '|' + DODAJ + ';stożkow|30', 'Pobierz pipetą 20 cm³ roztworu do kolby stożkowej i dodaj 30 cm³ wody.', 'Kryteria przebiegu 2: pobrał roztwór pipetą, dodał wodę.', 'pipetuję 20 cm3 roztworu do kolby stożkowej i dodaję 30 cm3 wody', 'kolba', 'przelewanie', ['potencjo'], True, wykl='zlewk|80|fenoloft', stan={'kolba': 'bezbarwny'}),
  K('fenol', 'Dodano 2 krople fenoloftaleiny (wskaźnik dobrany z krzywej).', 'fenoloft', 'Dodaj 2 krople fenoloftaleiny – jej zakres pH 8,2–10 obejmuje punkt końcowy.', 'Skok krzywej wypada powyżej pH 7, więc pasuje fenoloftaleina, a nie oranż metylowy.', 'dodaję 2 krople fenoloftaleiny', 'kolba', 'pipetowanie', ['kolba20'], True),
  K('uzupelnij', 'Biuretę ponownie napełniono NaOH i ustawiono na zero.', 'ponown|znów|znowu|jeszcze raz|uzupełn|dopełn;biuret', 'Uzupełnij biuretę NaOH i ustaw na zero przed miareczkowaniem wobec wskaźnika.', 'Każde miareczkowanie zaczynasz od zera, żeby odczyt był objętością zużytą.', 'ponownie napełniam biuretę do zera', 'statyw', 'przelewanie', ['potencjo'], True, stan={'biuretaPoziom': 1}),
  W('miareczkuj', 'miareczkuję do różowej barwy', wymaga=['fenol', 'uzupelnij'], opis='Miareczkowanie NaOH, stale mieszając, do pierwszej trwałej barwy różowej.', podpowiedz='Miareczkuj NaOH do pierwszej trwałej różowej barwy.', dlaczego='Kryterium: miareczkował stale mieszając do pierwszej zmiany barwy na różową.', wykl='zestaw|powtórz|drug|trzec|kolejn|jeszcze|ponown|porcj|potencjometr', stan={'kolba': 'rozowy', 'biuretaPoziom': 0.45, 'kolbaMiejsce': 'biureta'}),
  W('odczyt', 'odczytuję objętość z biurety'),
  W('powtorz', 'powtarzam oznaczenie drugi raz', opis='Wykonano drugie miareczkowanie wobec wskaźnika.', podpowiedz='Powtórz oznaczenie – co najmniej dwa razy.', stan={'kolby': 2}),
  K('odlacz', 'Pehametr odłączony od zasilania.', '=odłącz|=wyłącz;pehametr|ph-metr|ph metr|zasilan', 'Odłącz pehametr od zasilania.', 'Procedura 4 – element uporządkowanego zestawu do pomiaru pH.', 'odłączam pehametr od zasilania', 'zlewka', 'przycisk', ['powtorz']),
  *porzadki(['powtorz'], waga=False),
 ],
 'bledy': BLEDY + [{'slowa': ['oranż'], 'komunikat': 'Oranż metylowy zmienia barwę w pH 3,1–4,4, a skok krzywej jest powyżej pH 7 – właściwym wskaźnikiem jest fenoloftaleina.'}],
 'scena': {'titrant': ['NaOH', '0,250 mol/dm³'], 'wskaznik': ['fenoloftaleina', '1%'], 'odczytBiureta': 'v1', 'kartaPo': 'potencjo'},
 'karta': {
  'tytul': 'Karta wyników – kwas octowy w occie',
  'losuj': [{'id': 'zaw', 'od': 9.5, 'do': 10.5}, {'id': 'vpk', 'wzor': 'zaw*100/(0.25*60.05*5)', 'krok': 0.1, 'miejsca': 1}] + [{'id': f'v{i}', 'wzor': 'vpk', 'szum': 0.05, 'krok': 0.05, 'miejsca': 2} for i in (1, 2)],
  'odczyty': [{'typ': 'krzywa', 'id': 'vpk', 'etykieta': 'Wyniki pomiarów pH podczas miareczkowania potencjometrycznego'}, info('Etykieta octu', 'Kwas octowy: 10%'), biur('v1', 'Biureta – wobec wskaźnika 1'), biur('v2', 'Biureta – wobec wskaźnika 2')],
  'sekcje': [
   {'tytul': 'Tabela 1. Miareczkowanie potencjometryczne', 'opis': 'Punkt końcowy wyznacz graficznie – leży w połowie skoku krzywej.', 'pola': [pole('vpk', 'Objętość NaOH w punkcie końcowym V PK =', 'cm³', 'kr'), pole('phpk', 'pH w punkcie końcowym:', szer='kr'), pole('xpot', 'Zawartość kwasu octowego X =', '%', 'kr')]},
   {'tytul': 'Tabela 2. Miareczkowanie wobec wskaźnika', 'pola': [pole('wsk', 'Zastosowany wskaźnik:', szer='dl'), pole('v1', 'V₁ =', 'cm³', 'kr'), pole('v2', 'V₂ =', 'cm³', 'kr'), pole('vsr', 'Średnia V NaOH =', 'cm³', 'kr'), pole('xwsk', 'Zawartość kwasu octowego X =', '%', 'kr')]},
   {'tytul': 'Tabela 3. Ocena badanego octu', 'pola': [pole('dekl', 'Zawartość deklarowana przez producenta:', '%', 'kr'), pole('wniosek', 'Wnioski:', szer='max')]}],
  'brudnopis': ['NaOH 0,250 mol/dm³, M kwasu octowego = 60,05 g/mol, reakcja 1 : 1.', '~1000 cm³ NaOH — 0,250 mol | V cm³ — n mol (tyle kwasu jest w 20 cm³ roztworu)', '~20 cm³ — n mol | 100 cm³ — 5 · n mol (to kwas z 10 cm³ octu)', '~1 mol kwasu — 60,05 g | 5n mol — a g', '~10 g octu (10 cm³, gęstość 1 g/cm³) — 100% | a g — X%'],
  'kryteria': [
   kr('Wartość V PK w punkcie końcowym miareczkowania', 'Punkt końcowy leży w połowie pionowego skoku krzywej; odczytaj objętość z osi poziomej (±0,5 cm³).', liczba('vpk', 'vpk', 0.5)),
   kr('Wartość pH w punkcie końcowym', 'Dla słabego kwasu i mocnej zasady punkt końcowy wypada w pH ok. 8–9.', liczba('phpk', '8.6', 1.0)),
   kr('Obliczona zawartość kwasu octowego (metoda potencjometryczna)', 'X = V PK · 0,250 · 60,05 · 5 / 100.', liczba('xpot', '$vpk*0.25*60.05*5/100', 0.6), pokaz=('$vpk*0.25*60.05*5/100', 0, '%')),
   kr('Wskaźnik zastosowany w miareczkowaniu – fenoloftaleina', 'Zakres zmiany barwy fenoloftaleiny (8,2–10) obejmuje punkt końcowy.', tekst('wsk', 'fenoloft')),
   kr('Co najmniej dwa wyniki V₁ i V₂ zgodne z odczytem', 'Odczytaj na dolnym menisku, ±0,05 cm³.', liczba('v1', 'v1', 0.05), liczba('v2', 'v2', 0.05)),
   kr('Średnia z wyników nieróżniących się o więcej niż 0,2 cm³', 'Średnia arytmetyczna V₁ i V₂.', {'typ': 'rozrzut', 'pola': ['v1', 'v2'], 'max': 0.2}, liczba('vsr', 'sr($v1,$v2)', 0.06), pokaz=('sr($v1,$v2)', 1, ' cm³')),
   kr('Obliczona zawartość kwasu octowego (wobec wskaźnika)', 'X = V · 0,250 · 60,05 · 5 / 100.', liczba('xwsk', '$vsr*0.25*60.05*5/100', 0.6), pokaz=('$vsr*0.25*60.05*5/100', 0, '%')),
   kr('Wyniki zawartości kwasu octowego z dokładnością do całości', 'Zaokrąglij procenty do całości.', miejsca('xpot', 0), miejsca('xwsk', 0)),
   kr('Zawartość deklarowana przez producenta: 10%', 'Przepisz z etykiety.', liczba('dekl', '10', 0.01)),
   kr('Wnioski – ocena badanego octu', 'Napisz, czy wyniki obu metod są zgodne z deklaracją producenta.', tekst('wniosek', 'zgod', 'potwierdz', 'mniejsz', 'wieksz', 'rown', 'odpowiada', 'niezgod')),
  ]},
}
zapisz('07-ocet.json', P)

# ───────────────────────── 8. Fosfor w nawozie
P = {
 'id': '08-fosfor', 'tytul': 'Fosfor w nawozie mineralnym', 'zrodlo': 'CHM.04 – czerwiec 2024', 'metoda': 'Alkacymetria dwustopniowa (oranż metylowy, potem fenoloftaleina)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Zadanie egzaminacyjne', 'tresc': 'Przygotuj próbkę do badań, zbadaj odczyn roztworu próbki i wykonaj oznaczenie zawartości fosforu w nawozie mineralnym metodą miareczkowania alkacymetrycznego.\nMieszaniny poreakcyjne przelej do pojemnika na odpady ciekłe. Niezużyte odczynniki, próbkę nawozu i wodę destylowaną pozostaw na stanowisku.'},
  {'tytul': 'Procedura', 'tresc': 'I. Przygotowanie próbki\nPróbkę nawozu utrzeć w moździerzu. Odważyć około 5 g i przenieść ilościowo do zlewki 400–500 cm³. Dodać 200 cm³ wody, przykryć szkiełkiem zegarkowym i mieszać około 20 minut na mieszadle magnetycznym. Przenieść do kolby miarowej 250 cm³, uzupełnić wodą do kreski, wymieszać, a po opadnięciu osadu przesączyć do suchej zlewki.\nII. Badanie odczynu\nDo małej zlewki odmierzyć 20 cm³ roztworu. Zanurzyć papierek wskaźnikowy, porównać barwę ze skalą pH.\nIII. Oznaczenie fosforu\nDo zlewki 400–500 cm³ odmierzyć 50 cm³ roztworu, dodać 150 cm³ wody i 4 krople oranżu metylowego. Miareczkować na mieszadle roztworem NaOH 0,1 mol/dm³ do barwy żółtej (30 s). Zapisać V₁.\nDo tej samej mieszaniny dodać 50 cm³ CaCl₂ 30% i 3 krople fenoloftaleiny. Miareczkować NaOH 0,5 mol/dm³ do barwy malinowej (30 s). Zapisać V₂.\nIV. Obliczenia\nX₁ = (V₁ · 0,007098 · 5 / m) · 100%\nX₂ = (V₂ · 0,017745 · 5 / m) · 100%\n- X₁ – wolny kwas fosforowy(V) jako P₂O₅\n- X₂ – łącznie kwas fosforowy(V) i diwodorofosforan(V) wapnia jako P₂O₅\n- 5 – współmierność kolby i pipety\n- m – masa odważki nawozu [g]\nWyniki do pierwszego miejsca po przecinku.'}],
 'kroki': [
  K('mozdzierz', 'Próbka nawozu utarta w moździerzu.', 'utrzyj|ucier|rozetrz|rozcier|rozdrobn|utrze;nawóz|nawoz|próbk|moździerz', 'Utrzyj próbkę nawozu w moździerzu.', 'Kryterium przebiegu 1: rozdrobnił próbkę nawozu w moździerzu.', 'ucieram nawóz w moździerzu', 'stol', 'siegnij'),
  WAGA_ON(),
  K('odwaz', 'Odważono ok. 5 g rozdrobnionego nawozu (dokładność 0,001 g).', 'odważ|naważ|zważ|ważę;nawóz|nawoz|5 g|próbk', 'Odważ około 5 g rozdrobnionego nawozu z dokładnością do 0,001 g.', 'Masa odważki m wchodzi do obu wzorów.', 'odważam 5 g nawozu', 'waga', 'siegnij', ['mozdzierz', 'waga'], True),
  K('woda200', 'Odważkę przeniesiono do zlewki i dodano 200 cm³ wody destylowanej.', 'przenoś|przenieś|przesyp|' + DODAJ + ';200|zlewk', 'Przenieś odważkę ilościowo do zlewki i dodaj 200 cm³ wody.', 'Kryterium: przeniósł odważkę nawozu do zlewki i dodał wodę destylowaną.', 'przenoszę odważkę do zlewki i dodaję 200 cm3 wody', 'zlewka', 'przelewanie', ['odwaz'], True, wykl='150|oranż|papier', stan={'zlewka': 'roztwor'}),
  K('mieszaj20', 'Zlewkę przykryto szkiełkiem zegarkowym i mieszano ok. 20 minut na mieszadle magnetycznym.', 'przykry|szkiełk|20 min|mieszadł', 'Przykryj zlewkę szkiełkiem zegarkowym i mieszaj 20 minut na mieszadle magnetycznym.', 'Kryterium: przykrył zlewkę szkiełkiem i mieszał około 20 minut.', 'przykrywam zlewkę szkiełkiem zegarkowym i mieszam 20 minut na mieszadle', 'zlewka', 'siegnij', ['woda200'], wykl='miareczk'),
  K('miarowa', 'Zawartość zlewki przeniesiono do kolby miarowej 250 cm³, uzupełniono do kreski i wymieszano.', 'miarow|kresk', 'Przenieś zawartość do kolby miarowej 250 cm³, uzupełnij wodą do kreski i wymieszaj.', 'Dwa kryteria: przeniósł do kolby miarowej; uzupełnił do kreski i wymieszał.', 'przenoszę do kolby miarowej 250 cm3 i uzupełniam do kreski', 'stol', 'przelewanie', ['mieszaj20']),
  K('sacz', 'Roztwór przesączono do suchej zlewki.', 'sącz|przesącz|filtr', 'Po opadnięciu osadu przesącz roztwór do suchej zlewki.', 'Kryterium: przesączył roztwór do zlewki.', 'przesączam roztwór do suchej zlewki', 'zlewka', 'przelewanie', ['miarowa']),
  K('papierek', 'Odmierzono 20 cm³ roztworu, zanurzono papierek wskaźnikowy i porównano ze skalą pH.', 'papier|uniwersaln|odczyn', 'Odmierz 20 cm³ roztworu do małej zlewki i zbadaj odczyn papierkiem wskaźnikowym.', 'Zapisujesz barwę papierka, przybliżone pH i odczyn – muszą być ze sobą spójne.', 'badam odczyn papierkiem wskaźnikowym', 'zlewka', 'odczyt', ['sacz'], stan={'papierek': 'czerwony'}),
  K('porcja', 'Do zlewki odmierzono 50 cm³ roztworu, dodano 150 cm³ wody i 4 krople oranżu metylowego.', 'oranż|150', 'Odmierz 50 cm³ roztworu do zlewki, dodaj 150 cm³ wody i 4 krople oranżu metylowego.', 'Kryteria: odmierzył roztwór; dodał wodę i wskaźnik – oranż metylowy.', 'odmierzam 50 cm3 roztworu, dodaję 150 cm3 wody i 4 krople oranżu metylowego', 'kolba', 'pipetowanie', ['sacz'], True, stan={'kolba': 'czerwony'}),
  *zestaw('NaOH 0,1 mol/dm³', zglos=False, biureta='biureta 25 cm³'),
  W('miareczkuj', 'miareczkuję do żółtej barwy', wymaga=['zero', 'lejek', 'pecherz', 'porcja'], opis='Miareczkowanie NaOH 0,1 mol/dm³ na mieszadle do barwy żółtej (V₁).', podpowiedz='Miareczkuj NaOH 0,1 mol/dm³ do barwy żółtej utrzymującej się 30 sekund.', dlaczego='Pierwszy punkt końcowy: zobojętnienie wolnego kwasu fosforowego(V) do H₂PO₄⁻.', wykl='zestaw|powtórz|drug|trzec|kolejn|jeszcze|ponown|malin|0.5', stan={'kolba': 'zolty', 'biuretaPoziom': 0.85, 'kolbaMiejsce': 'biureta'}),
  W('odczyt', 'odczytuję objętość V1 z biurety', opis='Odczytano i zapisano objętość V₁.'),
  K('cacl2', 'Do mieszaniny dodano 50 cm³ CaCl₂ 30% i 3 krople fenoloftaleiny.', 'cacl2|chlorek|wapni|fenoloft', 'Dodaj 50 cm³ roztworu CaCl₂ 30% i 3 krople fenoloftaleiny.', 'Kryterium: dodał do mieszaniny po pierwszym miareczkowaniu CaCl₂ i fenoloftaleinę.', 'dodaję 50 cm3 chlorku wapnia i 3 krople fenoloftaleiny', 'statyw', 'siegnij', ['odczyt'], True),
  K('oproznij', 'Biuretę opróżniono po pierwszym miareczkowaniu.', 'opróżn|wylew|wylej|spuść|spuszcz|zlew;biuret|titrant', 'Opróżnij biuretę z NaOH 0,1 mol/dm³.', 'Osobne kryterium: opróżnił biuretę po pierwszym miareczkowaniu. Bez tego V₂ nie jest zaliczane.', 'opróżniam biuretę po pierwszym miareczkowaniu', 'statyw', 'kranik', ['odczyt'], stan={'biuretaPoziom': 0}),
  K('napelnij2', 'Biuretę napełniono NaOH 0,5 mol/dm³ i ustawiono na zero.', 'napełn|nalew|nalej|wlew|wlej;0.5|drug|mocniejsz|nowym', 'Napełnij biuretę roztworem NaOH 0,5 mol/dm³.', 'Osobne kryterium: napełnił biuretę titrantem NaOH 0,5 mol/dm³.', 'napełniam biuretę roztworem NaOH 0,5 mol/dm3', 'statyw', 'przelewanie', ['oproznij'], True, stan={'biuretaPoziom': 1}),
  K('miareczkuj2', 'Miareczkowanie NaOH 0,5 mol/dm³ do barwy malinowej (V₂).', 'miareczk;malin|drug|ponown|0.5|różow', 'Miareczkuj NaOH 0,5 mol/dm³ do barwy malinowej utrzymującej się 30 sekund.', 'Drugi punkt końcowy – suma kwasu fosforowego(V) i diwodorofosforanu(V) wapnia.', 'miareczkuję drugi raz do malinowej barwy', 'statyw', 'miareczkowanie', ['napelnij2', 'cacl2'], True, stan={'kolba': 'malinowy', 'biuretaPoziom': 0.15}),
  K('odczyt2', 'Odczytano i zapisano objętość V₂.', 'odczyt|zapis|notuj;v2|drug|objętoś|biuret', 'Odczytaj z biurety objętość V₂.', 'V₂ wchodzi do wzoru na łączną zawartość fosforu.', 'odczytuję objętość V2 z biurety', 'statyw', 'odczyt', ['miareczkuj2'], wykl='v1'),
  *porzadki(['odczyt2', 'papierek']),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['NaOH', '0,1 mol/dm³'], 'wskaznik': ['oranż', 'metylowy'], 'masaWagi': 'm', 'odczytBiureta': 'v1', 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – fosfor w nawozie',
  'losuj': [{'id': 'z1', 'od': 1.6, 'do': 3.0}, {'id': 'z2', 'od': 38, 'do': 46}, {'id': 'm', 'od': 4.95, 'do': 5.1, 'miejsca': 3}, {'id': 'ph', 'wybierz': [2, 3]},
            {'id': 'v1', 'wzor': 'z1*m/(0.007098*5*100)', 'krok': 0.05, 'miejsca': 2}, {'id': 'v2', 'wzor': 'z2*m/(0.017745*5*100)', 'krok': 0.05, 'miejsca': 2}],
  'odczyty': [waga('m', 'Waga – odważka nawozu', 3), {'typ': 'papierek', 'id': 'ph', 'etykieta': 'Papierek wskaźnikowy i skala barw'}, biur('v1', 'Biureta – V₁ (NaOH 0,1 mol/dm³)'), biur('v2', 'Biureta – V₂ (NaOH 0,5 mol/dm³)')],
  'sekcje': [
   {'tytul': 'Tabela 2. Dokumentacja z badań', 'pola': [pole('m', 'Masa odważki nawozu m =', 'g'), pole('barwa', 'Barwa papierka wskaźnikowego:', szer='dl'), pole('ph', 'Przybliżona wartość pH:', szer='kr'), pole('odczyn', 'Odczyn (kwasowy, obojętny, zasadowy):', szer='dl'), pole('v1', 'V₁ (NaOH 0,1 mol/dm³, wobec oranżu) =', 'cm³', 'kr'), pole('v2', 'V₂ (NaOH 0,5 mol/dm³, wobec fenoloftaleiny) =', 'cm³', 'kr')]},
   {'tytul': 'Tabela 3. Obliczenia zawartości fosforu', 'pola': [pole('x1', 'Wolny kwas fosforowy(V) jako P₂O₅: X₁ =', '%', 'kr'), pole('x2', 'Łącznie kwas fosforowy(V) i Ca(H₂PO₄)₂ jako P₂O₅: X₂ =', '%', 'kr')]}],
  'brudnopis': ['1 cm³ NaOH 0,1 mol/dm³ odpowiada 0,007098 g P₂O₅; 1 cm³ NaOH 0,5 mol/dm³ odpowiada 0,017745 g P₂O₅.', '~1 cm³ NaOH — 0,007098 g P₂O₅ | V₁ cm³ — a g (w 50 cm³ roztworu)', '~50 cm³ — a g | 250 cm³ — 5 · a g (w całej odważce)', '~m odważki [g] — 100% | 5a [g] — X₁%', 'Dla X₂ tak samo, z V₂ i 0,017745.'],
  'kryteria': [
   kr('Masa odważki nawozu – około 5 g, zgodna z odczytem', 'Przepisz masę z wagi.', liczba('m', 'm', 0.0005)),
   kr('Masa odważki z dokładnością do 0,001 g', 'Trzy miejsca po przecinku.', miejsca('m', 3)),
   kr('Zapisana barwa papierka wskaźnikowego', 'W odczynie kwasowym papierek uniwersalny jest czerwony / pomarańczowy.', tekst('barwa', 'czerw', 'pomar', 'roz')),
   kr('Przybliżona wartość pH spójna z barwą papierka', 'Porównaj papierek ze skalą barw.', liczba('ph', 'ph', 1)),
   kr('Odczyn spójny z wartością pH', 'pH poniżej 7 oznacza odczyn kwasowy.', tekst('odczyn', 'kwas')),
   kr('Objętość V₁ zgodna z odczytem', 'Odczytaj na dolnym menisku, ±0,05 cm³.', liczba('v1', 'v1', 0.05)),
   kr('Objętość V₂ zgodna z odczytem', 'Odczytaj na dolnym menisku, ±0,05 cm³.', liczba('v2', 'v2', 0.05)),
   kr('Obliczenie X₁ z wartości zgodnych z wynikami analizy', 'X₁ = V₁ · 0,007098 · 5 / m · 100%.', liczba('x1', '$v1*0.007098*5/$m*100', 0.06), pokaz=('$v1*0.007098*5/$m*100', 1, '%')),
   kr('Obliczenie X₂ z wartości zgodnych z wynikami analizy', 'X₂ = V₂ · 0,017745 · 5 / m · 100%.', liczba('x2', '$v2*0.017745*5/$m*100', 0.06), pokaz=('$v2*0.017745*5/$m*100', 1, '%')),
   kr('Wyniki w procentach, do pierwszego miejsca po przecinku', 'Jedno miejsce po przecinku.', miejsca('x1', 1), miejsca('x2', 1)),
  ]},
}
zapisz('08-fosfor.json', P)
print('ok 7-8')

# ═════════════════════════ Poziomy przewidywane – metody z podstawy programowej, których nie było w arkuszach.
# Procedury typowe (nie z arkuszy CKE); liczby przykładowe.
UWAGA = 'To poziom przewidywany: takiego zadania nie było jeszcze w arkuszach CHM.04, ale metoda jest w podstawie programowej 2019, a przyrząd jest na liście wyposażenia stanowiska CKE. Procedura jest typowa, a nie przepisana z arkusza.'

def aparat_porzadki(po):
    return [W('odpady', 'przelewam roztwory do pojemnika na odpady ciekłe', wymaga=po), W('myj', 'myję szkło laboratoryjne'), W('stol', 'wycieram stół', wymaga=['myj'])]

# ───────────────────────── 9. Refraktometria
P = {
 'id': '09-refraktometria', 'tytul': 'Ekstrakt w soku – refraktometr', 'zrodlo': 'Poziom przewidywany – podstawa programowa 2019', 'metoda': 'Refraktometria (refraktometr Abbego, skala Brix)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Uwaga', 'tresc': UWAGA},
  {'tytul': 'Zadanie', 'tresc': 'Oznacz zawartość ekstraktu (cukrów) w soku owocowym refraktometrem Abbego w skali Brix. Wykonaj trzy pomiary, oblicz średnią i oceń, czy sok spełnia wymaganie producenta: co najmniej 11,2% Brix.\nSporządź roztwór wzorcowy sacharozy 10% i sprawdź na nim wskazanie przyrządu.'},
  {'tytul': 'Procedura', 'tresc': '1. Sprawdzenie refraktometru\nPryzmat przemyć wodą destylowaną i osuszyć miękką bibułą. Nanieść 2–3 krople wody destylowanej, zamknąć pryzmat i odczytać wskazanie: n = 1,3330, 0,0% Brix (20 °C).\n2. Roztwór wzorcowy\nOdważyć 10,00 g sacharozy, rozpuścić w wodzie w zlewce i uzupełnić wodą do masy 100,00 g. Zmierzyć – wskazanie powinno wynosić 10,0% Brix.\n3. Pomiar próbki\nPryzmat osuszyć. Nanieść bagietką 2–3 krople soku (nie dotykać pryzmatu szkłem), zamknąć pryzmat. Ustawić ostrą granicę światła i cienia na przecięciu nici, usunąć zabarwienie kompensatorem. Odczytać % Brix i temperaturę. Pomiar wykonać trzy razy, każdorazowo nanosząc nową porcję soku.\n4. Zakończenie\nPryzmat umyć wodą destylowaną i osuszyć.\nObliczenia\nWynik to średnia arytmetyczna trzech odczytów nieróżniących się o więcej niż 0,2% Brix, z dokładnością do 0,1.\nPoprawka temperaturowa: +0,07% Brix na każdy 1 °C powyżej 20 °C (poniżej 20 °C – odjąć).'}],
 'kroki': [
  K('pryzmat1', 'Pryzmat refraktometru przemyty wodą destylowaną i osuszony miękką bibułą.', 'przemy|umyj|myję|opłucz|osusz|wytrz|czyszcz|czyść;pryzmat', 'Przemyj pryzmat wodą destylowaną i osusz miękką bibułą.', 'Resztki poprzedniej próbki zmieniają współczynnik załamania.', 'przemywam pryzmat wodą destylowaną i osuszam bibułą', 'stol', 'siegnij', wykl='koniec|zakończ|po pomiar'),
  K('zero', 'Sprawdzono wskazanie na wodzie destylowanej: n = 1,3330, 0,0% Brix.', 'sprawdz|kalibr|zeruj|wzorc|nanoś|nanieś|naniesi;wod', 'Nanieś 2–3 krople wody destylowanej i sprawdź, czy przyrząd wskazuje 1,3330 (0,0% Brix).', 'Bez sprawdzenia na wodzie nie wiesz, czy przyrząd nie ma błędu systematycznego.', 'nanoszę wodę destylowaną i sprawdzam wskazanie refraktometru', 'stol', 'pipetowanie', ['pryzmat1'], wykl='sok|sacharoz|pryzmat wod'),
  WAGA_ON(),
  K('wzorzec', 'Sporządzono roztwór wzorcowy: 10,00 g sacharozy uzupełnione wodą do 100,00 g.', 'odważ|sporządz|przygotow|rozpuść|rozpuszcz;sacharoz|cukr|wzorc', 'Odważ 10,00 g sacharozy, rozpuść w wodzie i uzupełnij wodą do masy 100,00 g.', '10 g cukru w 100 g roztworu to dokładnie 10% (m/m), czyli 10,0% Brix.', 'odważam 10 g sacharozy i sporządzam roztwór wzorcowy', 'waga', 'siegnij', ['waga'], True, wykl='pomiar|mierz|nanoś', stan={'zlewka': 'roztwor'}),
  K('pomiar_wz', 'Zmierzono roztwór wzorcowy – wskazanie 10,0% Brix.', 'mierz|zmierz|pomiar|nanoś|nanieś|odczyt;wzorc|sacharoz', 'Nanieś roztwór wzorcowy na pryzmat i odczytaj wskazanie.', 'Potwierdzasz, że przyrząd mierzy poprawnie także w zakresie próbki.', 'mierzę roztwór wzorcowy sacharozy na refraktometrze', 'stol', 'pipetowanie', ['wzorzec', 'zero'], wykl='odważ|sporządz'),
  K('sok', 'Na osuszony pryzmat naniesiono bagietką 2–3 krople soku i zamknięto pryzmat.', 'nanoś|nanieś|naniesi|nakład|nakrapl|kropl;sok|próbk', 'Osusz pryzmat i nanieś bagietką 2–3 krople soku; zamknij pryzmat.', 'Szklaną pipetą łatwo zarysować pryzmat – próbkę nanosi się bagietką, nie dotykając szkła.', 'nanoszę bagietką 3 krople soku na pryzmat', 'stol', 'pipetowanie', ['pomiar_wz'], True),
  K('granica', 'Ustawiono ostrą granicę światła i cienia na przecięciu nici, usunięto zabarwienie kompensatorem.', 'granic|ostroś|nici|krzyż|kompensat|pokrętł', 'Ustaw ostrą granicę jasnego i ciemnego pola na przecięciu nici krzyża; zabarwienie usuń kompensatorem.', 'Rozmyta lub kolorowa granica daje błędny odczyt.', 'ustawiam ostrą granicę na przecięciu nici', 'stol', 'siegnij', ['sok']),
  K('odczyt', 'Odczytano % Brix i temperaturę.', 'odczyt|zapis|notuj;brix|skal|wynik|temperatur|wskazan', 'Odczytaj ze skali % Brix oraz temperaturę.', 'Wskazanie zależy od temperatury – bez niej nie zrobisz poprawki.', 'odczytuję Brix i temperaturę', 'stol', 'siegnij', ['granica'], wykl='wod|wzorc'),
  W('powtorz', 'powtarzam pomiar jeszcze dwa razy', wymaga=['odczyt'], sprzet='stol', animacja='pipetowanie', opis='Wykonano kolejne pomiary – razem trzy, każdy z nową porcją soku.', podpowiedz='Powtórz pomiar jeszcze dwa razy, nanosząc nową porcję soku.', dlaczego='Wynik to średnia z trzech zgodnych odczytów.', stan={}),
  K('pryzmat2', 'Po pomiarach pryzmat umyto wodą destylowaną i osuszono.', 'koniec|zakończ|po pomiar|na koniec|ponown;pryzmat', 'Po zakończeniu pomiarów umyj pryzmat wodą destylowaną i osusz.', 'Zaschnięty sok niszczy pryzmat i fałszuje kolejne pomiary.', 'po pomiarach myję i osuszam pryzmat', 'stol', 'siegnij', ['powtorz']),
  *aparat_porzadki(['pryzmat2']),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['sok', 'próbka'], 'wskaznik': ['sacharoza', 'wzorzec 10%'], 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – refraktometria',
  'losuj': [{'id': 'bx', 'od': 10.4, 'do': 12.4}, {'id': 't', 'wybierz': [20, 21, 22, 23]}] + [{'id': f'b{i}', 'wzor': 'bx', 'szum': 0.08, 'miejsca': 1} for i in (1, 2, 3)],
  'odczyty': [wysw('b1', 'Refraktometr – pomiar 1', 1, '% Brix'), wysw('b2', 'Refraktometr – pomiar 2', 1, '% Brix'), wysw('b3', 'Refraktometr – pomiar 3', 1, '% Brix'), wysw('t', 'Temperatura', 0, '°C'), info('Wymaganie producenta', 'co najmniej 11,2% Brix')],
  'sekcje': [{'tytul': 'Dokumentacja z pomiarów', 'pola': [pole('b1', 'Odczyt 1:', '% Brix', 'kr'), pole('b2', 'Odczyt 2:', '% Brix', 'kr'), pole('b3', 'Odczyt 3:', '% Brix', 'kr'), pole('t', 'Temperatura pomiaru:', '°C', 'kr'), pole('bsr', 'Średnia:', '% Brix', 'kr'), pole('popr', 'Poprawka temperaturowa:', '% Brix', 'kr'), pole('wynik', 'Wynik po poprawce:', '% Brix', 'kr'), pole('wniosek', 'Sok (spełnia / nie spełnia) wymaganie:', szer='dl')]}],
  'brudnopis': ['Poprawka: +0,07% Brix na każdy stopień powyżej 20 °C.', '~1 °C — 0,07% Brix | (t − 20) °C — poprawka', 'Wynik po poprawce = średnia + poprawka.'],
  'kryteria': [
   kr('Trzy odczyty zgodne ze wskazaniami przyrządu', 'Przepisz odczyty z refraktometru.', *[liczba(f'b{i}', f'b{i}', 0.05) for i in (1, 2, 3)]),
   kr('Zapisana temperatura pomiaru', 'Przepisz temperaturę.', liczba('t', 't', 0.1)),
   kr('Średnia z trzech odczytów nieróżniących się o więcej niż 0,2', 'Średnia arytmetyczna.', {'typ': 'rozrzut', 'pola': ['b1', 'b2', 'b3'], 'max': 0.2}, liczba('bsr', 'sr($b1,$b2,$b3)', 0.06), pokaz=('sr($b1,$b2,$b3)', 1, '% Brix')),
   kr('Poprawka temperaturowa', '0,07% Brix na każdy stopień powyżej 20 °C.', liczba('popr', '($t-20)*0.07', 0.011), pokaz=('($t-20)*0.07', 2, '% Brix')),
   kr('Wynik po poprawce z dokładnością do 0,1', 'Średnia + poprawka, jedno miejsce po przecinku.', liczba('wynik', '$bsr+$popr', 0.06), miejsca('wynik', 1), pokaz=('$bsr+$popr', 1, '% Brix')),
   kr('Wniosek spójny z wynikiem (wymaganie: co najmniej 11,2% Brix)', 'Porównaj wynik po poprawce z 11,2% Brix.', {'typ': 'wybor', 'pole': 'wniosek', 'wzor': '$wynik-11.2+0.000001', 'tak': ['spelnia'], 'nie': ['nie spelnia']}),
  ]},
}
zapisz('09-refraktometria.json', P)

# ───────────────────────── 10. Polarymetria
P = {
 'id': '10-polarymetria', 'tytul': 'Stężenie sacharozy – polarymetr', 'zrodlo': 'Poziom przewidywany – podstawa programowa 2019', 'metoda': 'Polarymetria (rurka 2 dm)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Uwaga', 'tresc': UWAGA},
  {'tytul': 'Zadanie', 'tresc': 'Oznacz stężenie sacharozy w syropie metodą polarymetryczną. Przygotuj rozcieńczenie próbki, wykonaj trzy odczyty kąta skręcenia, oblicz stężenie i porównaj z deklaracją producenta.'},
  {'tytul': 'Procedura', 'tresc': '1. Przygotowanie próbki\nPobrać pipetą 25 cm³ syropu do kolby miarowej 100 cm³, uzupełnić wodą do kreski i wymieszać.\n2. Zerowanie polarymetru\nWłączyć lampę sodową i odczekać 5 minut. Rurkę polarymetryczną (2 dm) napełnić wodą destylowaną bez pęcherzyka powietrza, wytrzeć okienka, włożyć do przyrządu i ustawić zero – równe zaciemnienie obu pól.\n3. Pomiar\nRurkę przepłukać badanym roztworem, napełnić bez pęcherzyka powietrza, wytrzeć okienka. Obracać analizator do zrównania zaciemnienia pól i odczytać kąt z noniusza. Wykonać trzy odczyty.\n4. Zakończenie\nRurkę umyć wodą destylowaną.\nObliczenia\nc = (100 · α) / ([α] · l)\n- c – stężenie [g/100 cm³]\n- α – średni kąt skręcenia [°]\n- [α] – skręcalność właściwa sacharozy, +66,5\n- l – długość rurki [dm]\nStężenie w syropie = c · 4 (rozcieńczenie 25 → 100 cm³). Wyniki z dokładnością do 0,1.'}],
 'kroki': [
  K('rozciencz', 'Pipetą pobrano 25 cm³ syropu do kolby miarowej 100 cm³, uzupełniono do kreski i wymieszano.', PIPETA + '|rozcieńcz;syrop|25|miarow', 'Pobierz pipetą 25 cm³ syropu do kolby miarowej 100 cm³ i uzupełnij wodą do kreski.', 'Syrop jest zbyt stężony i lepki – mierzy się rozcieńczenie 1 : 4.', 'pipetuję 25 cm3 syropu do kolby miarowej i rozcieńczam do kreski', 'kolba', 'pipetowanie', [], True, stan={'kolba': 'slomkowy'}),
  K('lampa', 'Włączono lampę sodową polarymetru i odczekano 5 minut.', 'włącz|uruchom|zapal;lamp|polarymetr', 'Włącz lampę sodową i odczekaj 5 minut.', 'Lampa sodowa musi się nagrzać, żeby świeciła stabilnym światłem o długości fali 589 nm.', 'włączam lampę sodową polarymetru', 'stol', 'przycisk', wykl='=wyłącz'),
  K('rurka_woda', 'Rurkę napełniono wodą destylowaną bez pęcherzyka powietrza i wytarto okienka.', 'napełn|nalew|wlew|wlej;rurk;wod', 'Napełnij rurkę polarymetryczną wodą destylowaną bez pęcherzyka powietrza i wytrzyj okienka.', 'Pęcherzyk powietrza na drodze światła uniemożliwia poprawny odczyt.', 'napełniam rurkę wodą destylowaną bez pęcherzyka powietrza', 'stol', 'przelewanie', ['lampa']),
  K('zero', 'Polarymetr wyzerowano na wodzie – równe zaciemnienie obu pól.', 'zeruj|wyzer|zero|ustaw;polarymetr|zero|pól|pola|wod', 'Włóż rurkę z wodą do polarymetru i ustaw zero – równe zaciemnienie obu pól.', 'Woda nie skręca płaszczyzny polaryzacji; to punkt odniesienia dla pomiaru.', 'zeruję polarymetr na wodzie destylowanej', 'stol', 'siegnij', ['rurka_woda'], wykl='napełn'),
  K('rurka_proba', 'Rurkę przepłukano badanym roztworem i napełniono bez pęcherzyka powietrza.', 'przepłuk|przepłucz|napełn|nalew|wlew|wlej;rurk;roztw|próbk|syrop|badan', 'Przepłucz rurkę badanym roztworem, napełnij ją bez pęcherzyka i wytrzyj okienka.', 'Resztki wody rozcieńczyłyby próbkę i zaniżyły kąt skręcenia.', 'przepłukuję i napełniam rurkę badanym roztworem', 'stol', 'przelewanie', ['zero', 'rozciencz'], True),
  K('odczyt', 'Obrócono analizator do zrównania pól i odczytano kąt skręcenia z noniusza.', 'odczyt|zmierz|mierz|pomiar;kąt|skręc|nonius|analizator|polarymetr', 'Obracaj analizator do zrównania zaciemnienia pól i odczytaj kąt z noniusza.', 'Kąt skręcenia jest proporcjonalny do stężenia sacharozy i długości rurki.', 'odczytuję kąt skręcenia z noniusza', 'stol', 'siegnij', ['rurka_proba']),
  W('powtorz', 'powtarzam odczyt jeszcze dwa razy', wymaga=['odczyt'], sprzet='stol', animacja='siegnij', opis='Wykonano kolejne odczyty – razem trzy.', podpowiedz='Wykonaj jeszcze dwa odczyty kąta.', dlaczego='Wynik to średnia z trzech odczytów.', stan={}),
  K('rurka_myj', 'Rurkę polarymetryczną umyto wodą destylowaną, lampę wyłączono.', 'umyj|myję|wypłucz|opłucz|płucz;rurk', 'Umyj rurkę wodą destylowaną i wyłącz lampę.', 'Zaschnięty cukier zabrudzi okienka rurki.', 'myję rurkę polarymetryczną wodą destylowaną', 'zlew', 'mycie', ['powtorz'], wykl='przepłuk|napełn'),
  *aparat_porzadki(['rurka_myj']),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['syrop', 'próbka'], 'wskaznik': ['sacharoza', '[α] = +66,5'], 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – polarymetria',
  'losuj': [{'id': 'c', 'od': 14.0, 'do': 16.6}] + [{'id': f'a{i}', 'wzor': 'c*66.5*2/100', 'szum': 0.04, 'miejsca': 2} for i in (1, 2, 3)],
  'odczyty': [wysw('a1', 'Polarymetr – odczyt 1', 2, '°'), wysw('a2', 'Polarymetr – odczyt 2', 2, '°'), wysw('a3', 'Polarymetr – odczyt 3', 2, '°'), info('Dane', 'rurka l = 2 dm, [α] = +66,5'), info('Etykieta syropu', 'sacharoza: 60 g w 100 cm³')],
  'sekcje': [{'tytul': 'Dokumentacja z pomiarów', 'pola': [pole('a1', 'α₁ =', '°', 'kr'), pole('a2', 'α₂ =', '°', 'kr'), pole('a3', 'α₃ =', '°', 'kr'), pole('asr', 'α średnie =', '°', 'kr'), pole('c', 'Stężenie w roztworze mierzonym c =', 'g/100 cm³', 'kr'), pole('cs', 'Stężenie w syropie =', 'g/100 cm³', 'kr'), pole('wniosek', 'Wynik (zgodny / niezgodny) z etykietą (±2 g/100 cm³):', szer='dl')]}],
  'brudnopis': ['Roztwór 1 g/100 cm³ w rurce 1 dm skręca o 0,665°. W rurce 2 dm – dwa razy więcej.', '~1,33° — 1 g/100 cm³ (rurka 2 dm) | α° — c g/100 cm³', 'Rozcieńczenie 25 cm³ → 100 cm³, czyli 4 razy:', '~25 cm³ syropu — w 100 cm³ roztworu | stężenie syropu = 4 · c'],
  'kryteria': [
   kr('Trzy odczyty kąta zgodne ze wskazaniami', 'Przepisz odczyty z polarymetru.', *[liczba(f'a{i}', f'a{i}', 0.005) for i in (1, 2, 3)]),
   kr('Średni kąt skręcenia', 'Średnia arytmetyczna trzech odczytów.', liczba('asr', 'sr($a1,$a2,$a3)', 0.011), pokaz=('sr($a1,$a2,$a3)', 2, '°')),
   kr('Stężenie w roztworze mierzonym', 'c = 100 · α / (66,5 · 2).', liczba('c', '100*$asr/(66.5*2)', 0.06), pokaz=('100*$asr/(66.5*2)', 1, ' g/100 cm³')),
   kr('Stężenie w syropie z uwzględnieniem rozcieńczenia', 'Pomnóż przez 4 (25 cm³ → 100 cm³).', liczba('cs', '$c*4', 0.25), pokaz=('$c*4', 1, ' g/100 cm³')),
   kr('Wyniki stężeń z dokładnością do 0,1', 'Jedno miejsce po przecinku.', miejsca('c', 1), miejsca('cs', 1)),
   kr('Wniosek spójny z wynikiem (etykieta: 60 ± 2 g/100 cm³)', 'Porównaj stężenie w syropie z 60 g/100 cm³.', {'typ': 'wybor', 'pole': 'wniosek', 'wzor': '2-abs($cs-60)+0.000001', 'tak': ['zgodny', 'zgodna'], 'nie': ['niezgodny', 'niezgodna', 'nie zgodny', 'nie jest']}),
  ]},
}
zapisz('10-polarymetria.json', P)

# ───────────────────────── 11. Spektrofotometria UV-Vis
P = {
 'id': '11-spektrofotometria', 'tytul': 'Żelazo w wodzie – spektrofotometr', 'zrodlo': 'Poziom przewidywany – podstawa programowa 2019', 'metoda': 'Spektrofotometria UV-Vis (krzywa wzorcowa, metoda rodankowa)', 'czasMinut': 180,
 'protokol': [
  {'tytul': 'Uwaga', 'tresc': UWAGA},
  {'tytul': 'Zadanie', 'tresc': 'Oznacz stężenie żelaza(III) w próbce wody metodą spektrofotometryczną z rodankiem potasu. Przygotuj roztwory wzorcowe, zmierz absorbancję, wyznacz krzywą wzorcową i odczytaj stężenie żelaza w próbce. Oceń, czy woda spełnia normę dla wody do picia: najwyżej 0,2 mg Fe/dm³ (próbka była zatężona 10-krotnie).'},
  {'tytul': 'Procedura', 'tresc': '1. Roztwory wzorcowe\nDo kolb miarowych 50 cm³ odmierzyć pipetą kolejno 1, 2, 3, 4 i 5 cm³ roztworu podstawowego żelaza(III) o stężeniu 50 mg/dm³. Do szóstej kolby – 25 cm³ badanej próbki. Siódma kolba to ślepa próba (bez żelaza).\n2. Wywołanie barwy\nDo każdej kolby dodać 2 cm³ HCl 2 mol/dm³ i 5 cm³ roztworu rodanku potasu 10%. Uzupełnić wodą do kreski i wymieszać. Powstaje czerwone zabarwienie.\n3. Pomiar\nWłączyć spektrofotometr, ustawić długość fali 480 nm. Kuwetę trzymać za matowe ścianki, przepłukać mierzonym roztworem, napełnić do ¾ i wytrzeć. Wyzerować przyrząd na ślepej próbie. Zmierzyć absorbancję wzorców od najmniejszego stężenia, na końcu próbki.\n4. Obliczenia\nStężenia wzorców w kolbach: 1, 2, 3, 4, 5 mg/dm³. Z krzywej wzorcowej A = a · c wyznaczyć współczynnik a (średnia z A/c) i obliczyć stężenie w kolbie z próbką: c = A / a. Próbkę rozcieńczono 2 razy (25 → 50 cm³). Wyniki stężeń z dokładnością do 0,01.'}],
 'kroki': [
  K('wzorce', 'Do kolb miarowych 50 cm³ odmierzono pipetą 1, 2, 3, 4 i 5 cm³ roztworu podstawowego żelaza.', PIPETA + ';wzorc|podstawow|żelaz', 'Odmierz pipetą 1, 2, 3, 4 i 5 cm³ roztworu podstawowego żelaza do kolejnych kolb miarowych 50 cm³.', 'Wzorce o znanych stężeniach tworzą krzywą wzorcową.', 'odmierzam pipetą roztwór podstawowy żelaza do pięciu kolb miarowych', 'kolba', 'pipetowanie', [], True, wykl='próbk'),
  K('probka', 'Do szóstej kolby odmierzono 25 cm³ badanej próbki; siódma kolba to ślepa próba.', PIPETA + ';próbk|25', 'Odmierz 25 cm³ badanej próbki do szóstej kolby; siódmą zostaw jako ślepą próbę.', 'Ślepa próba zawiera wszystkie odczynniki oprócz żelaza – na niej zeruje się przyrząd.', 'odmierzam pipetą 25 cm3 badanej próbki do szóstej kolby', 'kolba', 'pipetowanie', ['wzorce'], True, wykl='wzorc|podstawow'),
  K('barwa', 'Do każdej kolby dodano 2 cm³ HCl i 5 cm³ rodanku potasu – czerwone zabarwienie.', 'rodan|kscn|hcl|kwas', 'Dodaj do każdej kolby 2 cm³ HCl 2 mol/dm³ i 5 cm³ rodanku potasu 10%.', 'Żelazo(III) z rodankiem daje czerwony kompleks; środowisko kwasowe zapobiega hydrolizie.', 'dodaję do każdej kolby kwas solny i rodanek potasu', 'kolba', 'pipetowanie', ['probka'], True, stan={'kolba': 'czerwony'}),
  K('kreska', 'Kolby uzupełniono wodą do kreski i wymieszano.', 'uzupełn|dopełn|dolew|dolej;kresk|wod', 'Uzupełnij kolby wodą destylowaną do kreski i wymieszaj.', 'Objętość musi być dokładnie 50 cm³, bo od niej zależy stężenie wzorców.', 'uzupełniam kolby wodą do kreski i mieszam', 'kolba', 'przelewanie', ['barwa']),
  K('fala', 'Włączono spektrofotometr i ustawiono długość fali 480 nm.', 'włącz|ustaw|nastaw;spektrofot|fal|480', 'Włącz spektrofotometr i ustaw długość fali 480 nm.', 'Przy 480 nm kompleks rodankowy żelaza pochłania najsilniej – pomiar jest najczulszy.', 'włączam spektrofotometr i ustawiam długość fali 480 nm', 'stol', 'przycisk', wykl='=wyłącz'),
  K('kuweta', 'Kuwetę (trzymaną za matowe ścianki) przepłukano, napełniono do ¾ i wytarto.', 'kuwet', 'Przepłucz kuwetę mierzonym roztworem, napełnij do ¾ i wytrzyj; trzymaj za matowe ścianki.', 'Odciski palców i krople na przezroczystych ściankach zawyżają absorbancję.', 'przepłukuję kuwetę, napełniam do trzech czwartych i wycieram', 'stol', 'przelewanie', ['kreska', 'fala'], True, wykl='ślep|zer'),
  K('slepa', 'Przyrząd wyzerowano na ślepej próbie.', 'zeruj|wyzer|zero|ślep', 'Wyzeruj spektrofotometr na ślepej próbie.', 'Dzięki temu absorbancja pochodzi tylko od kompleksu żelaza, a nie od odczynników.', 'zeruję spektrofotometr na ślepej próbie', 'stol', 'przycisk', ['kuweta']),
  K('pomiar_wz', 'Zmierzono absorbancję wzorców – od najmniejszego stężenia.', 'mierz|zmierz|pomiar|odczyt;wzorc', 'Zmierz absorbancję wzorców, zaczynając od najmniejszego stężenia.', 'Kolejność od najmniejszego stężenia ogranicza błąd przenoszenia między pomiarami.', 'mierzę absorbancję wzorców od najmniejszego stężenia', 'stol', 'siegnij', ['slepa'], wykl='próbk'),
  K('odczyt', 'Zmierzono absorbancję próbki.', 'mierz|zmierz|pomiar|odczyt;próbk', 'Na końcu zmierz absorbancję badanej próbki.', 'Absorbancję próbki porównujesz z krzywą wzorcową.', 'mierzę absorbancję próbki', 'stol', 'siegnij', ['pomiar_wz'], wykl='wzorc'),
  *aparat_porzadki(['odczyt']),
 ],
 'bledy': BLEDY,
 'scena': {'titrant': ['Fe³⁺', '50 mg/dm³'], 'wskaznik': ['KSCN', '10%'], 'kartaPo': 'odczyt'},
 'karta': {
  'tytul': 'Karta wyników – spektrofotometria',
  'losuj': [{'id': 'a', 'od': 0.118, 'do': 0.132}, {'id': 'cx', 'od': 0.7, 'do': 1.3}] + [{'id': f'A{i}', 'wzor': f'a*{i}', 'szum': 0.003, 'miejsca': 3} for i in (1, 2, 3, 4, 5)] + [{'id': 'Ax', 'wzor': 'a*cx', 'szum': 0.002, 'miejsca': 3}],
  'odczyty': [wysw(f'A{i}', f'Wzorzec {i} mg/dm³', 3, 'A') for i in (1, 2, 3, 4, 5)] + [wysw('Ax', 'Próbka', 3, 'A')],
  'sekcje': [
   {'tytul': 'Krzywa wzorcowa', 'opis': 'Stężenia wzorców w kolbach: 1, 2, 3, 4, 5 mg/dm³.', 'tabela': {'wiersze': 5, 'kolumny': [{'naglowek': 'Absorbancja A', 'pole': 'A{i}'}, {'naglowek': 'A / c', 'pole': 'k{i}'}]}, 'pola': [pole('a', 'Współczynnik a (średnia z A/c) =', None, 'kr')]},
   {'tytul': 'Próbka', 'pola': [pole('Ax', 'Absorbancja próbki:', None, 'kr'), pole('ck', 'Stężenie Fe w kolbie c =', 'mg/dm³', 'kr'), pole('cp', 'Stężenie Fe w próbce (zatężonej) =', 'mg/dm³', 'kr'), pole('cw', 'Stężenie Fe w wodzie =', 'mg/dm³', 'kr'), pole('wniosek', 'Woda (spełnia / nie spełnia) normę 0,2 mg/dm³:', szer='dl')]}],
  'brudnopis': ['Prawo Lamberta-Beera: absorbancja jest proporcjonalna do stężenia.', '~a (absorbancja dla 1 mg/dm³) — 1 mg/dm³ | A próbki — c mg/dm³', 'Próbkę rozcieńczono 2 razy (25 cm³ → 50 cm³): stężenie w próbce = 2 · c.', 'Próbka była zatężona 10 razy: stężenie w wodzie = stężenie w próbce / 10.'],
  'kryteria': [
   kr('Absorbancje pięciu wzorców zgodne ze wskazaniami', 'Przepisz absorbancje z wyświetlacza.', *[liczba(f'A{i}', f'A{i}', 0.0005) for i in (1, 2, 3, 4, 5)]),
   kr('Ilorazy A/c dla wzorców', 'Podziel absorbancję przez stężenie wzorca (1, 2, 3, 4, 5 mg/dm³).', *[liczba(f'k{i}', f'$A{i}/{i}', 0.0011) for i in (1, 2, 3, 4, 5)]),
   kr('Współczynnik a krzywej wzorcowej', 'Średnia z pięciu ilorazów A/c.', liczba('a', 'sr($k1,$k2,$k3,$k4,$k5)', 0.0011), pokaz=('sr($k1,$k2,$k3,$k4,$k5)', 3, '')),
   kr('Absorbancja próbki zgodna ze wskazaniem', 'Przepisz absorbancję próbki.', liczba('Ax', 'Ax', 0.0005)),
   kr('Stężenie żelaza w kolbie z próbką', 'c = A próbki / a.', liczba('ck', '$Ax/$a', 0.011), pokaz=('$Ax/$a', 2, ' mg/dm³')),
   kr('Stężenie w próbce z uwzględnieniem rozcieńczenia', 'Pomnóż przez 2 (25 cm³ → 50 cm³).', liczba('cp', '$ck*2', 0.021), pokaz=('$ck*2', 2, ' mg/dm³')),
   kr('Stężenie w wodzie z uwzględnieniem zatężenia', 'Podziel przez 10.', liczba('cw', '$cp/10', 0.006), pokaz=('$cp/10', 2, ' mg/dm³')),
   kr('Stężenia z dokładnością do 0,01', 'Dwa miejsca po przecinku.', miejsca('ck', 2), miejsca('cp', 2), miejsca('cw', 2)),
   kr('Wniosek spójny z wynikiem (norma: najwyżej 0,2 mg/dm³)', 'Porównaj stężenie w wodzie z 0,2 mg/dm³.', {'typ': 'wybor', 'pole': 'wniosek', 'wzor': '0.2-$cw+0.000001', 'tak': ['spelnia'], 'nie': ['nie spelnia']}),
  ]},
}
zapisz('11-spektrofotometria.json', P)
print('ok 9-11')
