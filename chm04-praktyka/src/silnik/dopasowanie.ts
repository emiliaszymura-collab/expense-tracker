// Dopasowanie wpisów gracza do słów kluczowych – offline, bez zewnętrznego API.
// Zasada: słowo kluczowe to zwykle RDZEŃ (np. "odwaz"), więc pasuje do "odważam", "odważyć", "odważkę".
// Literówki są tolerowane odległością Damerau-Levenshteina, zależnie od długości słowa.

const ZNAKI_PL: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

/** Małe litery, bez polskich znaków, bez interpunkcji ("cm³" → "cm3"). */
export function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (z) => ZNAKI_PL[z])
    .replace(/[₀-₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
    .replace(/³/g, '3')
    .replace(/²/g, '2')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokeny(tekst: string): string[] {
  const n = normalizuj(tekst);
  return n ? n.split(' ') : [];
}

/** Odległość Damerau-Levenshteina (z przestawieniem sąsiednich liter). */
export function odleglosc(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const koszt = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + koszt);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function dozwolonyBlad(dlugosc: number): number {
  if (dlugosc <= 3) return 0;
  if (dlugosc <= 6) return 1;
  return 2;
}

/** Czy pojedyncze słowo wpisu (token) pasuje do rdzenia słowa kluczowego. */
export function slowoPasuje(rdzen: string, token: string, rozmyte = true): boolean {
  // liczby całe: „10” nie pasuje do „100”, ale pasuje do „10cm”
  if (/^\d/.test(rdzen)) return token.startsWith(rdzen) && !/\d/.test(token.charAt(rdzen.length));
  if (token.startsWith(rdzen)) return true;
  if (!rozmyte) return false;
  // Krótkich rdzeni (np. "hcl", "wag") nie rozmywamy – za dużo fałszywych trafień.
  const limit = dozwolonyBlad(rdzen.length);
  if (limit === 0) return false;
  // Literówki rzadko trafiają w pierwszą literę, a ten warunek odcina fałszywe trafienia
  // (np. „analitycznej” ≠ „kanaliz…”).
  if (token[0] !== rdzen[0]) return false;
  // Porównujemy rdzeń z początkiem tokenu o podobnej długości (końcówki fleksyjne są ignorowane).
  for (let dl = rdzen.length - 1; dl <= rdzen.length + 1; dl++) {
    if (dl < 1 || dl > token.length) continue;
    if (odleglosc(rdzen, token.slice(0, dl)) <= limit) return true;
  }
  return false;
}

/**
 * Fraza (jedno lub kilka słów) pasuje, jeśli jej słowa występują we wpisie po kolei, obok siebie.
 * Fraza zaczynająca się od "=" jest dopasowywana bez tolerancji literówek (np. "=wyłącz", żeby nie mylić z "włącz").
 */
export function frazaPasuje(fraza: string, wpis: string[], rozmyte = true): boolean {
  if (fraza.startsWith('=')) {
    rozmyte = false;
    fraza = fraza.slice(1);
  }
  const slowa = tokeny(fraza);
  if (slowa.length === 0) return false;
  for (let start = 0; start + slowa.length <= wpis.length; start++) {
    if (slowa.every((s, i) => slowoPasuje(s, wpis[start + i], rozmyte))) return true;
  }
  return false;
}

/**
 * Rodziny słów znaczących w laboratorium to samo. Jeśli krok wymaga któregoś z nich, pasuje każde z rodziny –
 * „umyj blat”, „wytrzyj stół”, „osusz powierzchnię roboczą” to ta sama czynność.
 * Rozróżnienie kroków zapewnia druga grupa (przedmiot) albo słowa wykluczające.
 */
const RODZINY: string[][] = [
  // sprzątanie powierzchni
  ['wytrz', 'wycier', 'wytar', 'przetrz', 'przetar', 'przecier', 'ścier', 'umyj', 'umyc', 'umyw', 'myj', 'myję', 'myci', 'zmyj', 'czyść', 'czyszcz', 'wyczyść', 'oczyść', 'osusz', 'wysusz', 'susz', 'sprząt', 'posprząt', 'uporządk', 'porządk', 'ogarn'],
  // stół roboczy
  ['stół', 'stol', 'blat', 'stanowisk', 'powierzchni', 'miejsce pracy', 'ławk'],
  // włączanie
  ['włącz', 'uruchom', 'zapal', 'odpal', 'startuj', 'załącz'],
  // nanoszenie próbki
  ['nanoś', 'nanieś', 'naniesi', 'nakrapl', 'nakropl', 'nałóż', 'nakład', 'umieść', 'kropl', 'zakrapl', 'wkrop'],
  // pomiar
  ['mierz', 'zmierz', 'pomiar', 'zmierzeni', 'zbadaj', 'badam', 'wykonaj pomiar'],
  // odczyt
  ['odczyt', 'odczytaj', 'odczytuj', 'zapis', 'zanotuj', 'notuj', 'spisz', 'spisuj'],
  // napełnianie
  ['napełn', 'nalew', 'nalej', 'wlew', 'wlej', 'wypełn', 'zalej', 'zalew'],
  // zerowanie
  ['zeruj', 'wyzer', 'zerow', 'kalibr', 'wzorcuj'],
  // odczekanie
  ['odczek', 'poczek', 'czekam', 'zaczek', 'nagrz', 'rozgrz'],
];

const RODZINA_SLOWA = new Map<string, string[]>();
for (const r of RODZINY) for (const w of r) RODZINA_SLOWA.set(normalizuj(w), r);

/** Fraza wraz z jej rodziną (dla fraz dokładnych "=" rodziny nie używamy). */
function warianty(fraza: string): string[] {
  if (fraza.startsWith('=')) return [fraza];
  return RODZINA_SLOWA.get(normalizuj(fraza)) ?? [fraza];
}

export function grupaPasuje(grupa: string[], wpis: string[]): boolean {
  return grupa.some((fraza) => warianty(fraza).some((w) => frazaPasuje(w, wpis)));
}

/**
 * Formy czasowników: tryb rozkazujący, bezokolicznik i rzeczownik odczasownikowy sprowadzamy do formy
 * „robię” z przykładów („umyj”, „umyć”, „umycie” → „myję”). Pierwsza pozycja to forma podstawowa.
 */
export const FORMY: string[][] = [
  ['myję', 'umyj', 'umyć', 'umycie', 'mycie', 'myć', 'myje', 'umyję'],
  ['dodaję', 'dodaj', 'dodać', 'dodanie', 'dodaje', 'dodam'],
  ['przelewam', 'przelej', 'przelać', 'przelanie', 'przelewa', 'przeleję'],
  ['wycieram', 'wytrzyj', 'wytrzeć', 'wytarcie', 'wyciera', 'wytrę'],
  ['odczytuję', 'odczytaj', 'odczytać', 'odczytanie', 'odczyt', 'odczytuje', 'odczytam'],
  ['włączam', 'włącz', 'włączyć', 'włączenie', 'włącza', 'włączę'],
  ['powtarzam', 'powtórz', 'powtórzyć', 'powtórzenie', 'powtarza', 'powtórzę'],
  ['napełniam', 'napełnij', 'napełnić', 'napełnienie', 'napełnia', 'napełnię'],
  ['ustawiam', 'ustaw', 'ustawić', 'ustawienie', 'ustawia', 'ustawię'],
  ['miareczkuję', 'miareczkuj', 'miareczkować', 'miareczkowanie', 'miareczkuje', 'zmiareczkuj'],
  ['mierzę', 'zmierz', 'zmierzyć', 'zmierzenie', 'pomiar', 'mierzyć', 'mierzy', 'zmierzę'],
  ['odmierzam', 'odmierz', 'odmierzyć', 'odmierzenie', 'odmierza', 'odmierzę'],
  ['montuję', 'zmontuj', 'zmontować', 'zmontowanie', 'montaż', 'montować', 'montuje', 'zmontuję'],
  ['rozmontowuję', 'rozmontuj', 'rozmontować', 'rozmontowanie', 'rozmontowuje', 'demontaż', 'zdemontuj', 'rozmontuję'],
  ['zdejmuję', 'zdejmij', 'zdjąć', 'zdjęcie', 'zdejmuje', 'zdejmę'],
  ['usuwam', 'usuń', 'usunąć', 'usunięcie', 'usuwa', 'usunę'],
  ['przepłukuję', 'przepłucz', 'przepłukać', 'przepłukanie', 'przepłukuje', 'przepłuczę'],
  ['zgłaszam', 'zgłoś', 'zgłosić', 'zgłoszenie', 'zgłasza', 'zgłoszę'],
  ['odważam', 'odważ', 'odważyć', 'odważenie', 'odważa', 'odważę'],
  ['pipetuję', 'pipetuj', 'pipetować', 'pipetowanie', 'odpipetuj', 'odpipetować', 'pipetuje'],
  ['zeruję', 'wyzeruj', 'wyzerować', 'zerowanie', 'wyzerowanie', 'zeruj', 'zerować', 'zeruje'],
  ['nanoszę', 'nanieś', 'nanieść', 'naniesienie', 'nanosi', 'naniosę'],
  ['wyłączam', 'wyłącz', 'wyłączyć', 'wyłączenie', 'wyłącza', 'wyłączę'],
  ['przemywam', 'przemyj', 'przemyć', 'przemycie', 'przemywa', 'przemyję'],
  ['przenoszę', 'przenieś', 'przenieść', 'przeniesienie', 'przenosi', 'przeniosę'],
  ['uzupełniam', 'uzupełnij', 'uzupełnić', 'uzupełnienie', 'uzupełnia', 'uzupełnię'],
  ['mieszam', 'wymieszaj', 'wymieszać', 'wymieszanie', 'mieszanie', 'zamieszaj', 'miesza', 'wymieszam'],
  ['zanurzam', 'zanurz', 'zanurzyć', 'zanurzenie', 'zanurza', 'zanurzę'],
  ['przesączam', 'przesącz', 'przesączyć', 'przesączenie', 'przesącza'],
  ['opłukuję', 'opłucz', 'opłukać', 'opłukanie', 'opłukuje'],
  ['rozpuszczam', 'rozpuść', 'rozpuścić', 'rozpuszczenie', 'rozpuszcza', 'rozpuszczę'],
  ['ucieram', 'utrzyj', 'utrzeć', 'utarcie', 'uciera'],
  ['przykrywam', 'przykryj', 'przykryć', 'przykrycie', 'przykrywa'],
  ['badam', 'zbadaj', 'zbadać', 'zbadanie', 'bada', 'zbadam'],
  ['opróżniam', 'opróżnij', 'opróżnić', 'opróżnienie', 'opróżnia'],
  ['pobieram', 'pobierz', 'pobrać', 'pobranie', 'pobiera', 'pobiorę'],
  ['ogrzewam', 'ogrzej', 'ogrzać', 'ogrzanie', 'ogrzewa', 'podgrzej', 'podgrzać'],
  ['sączę', 'sącz', 'sączyć', 'sączenie', 'przesącz', 'odsącz', 'odsączyć'],
  ['opisuję', 'opisz', 'opisać', 'opisanie', 'opisuje'],
  ['wyrzucam', 'wyrzuć', 'wyrzucić', 'wyrzucenie', 'wyrzuca'],
  ['dopełniam', 'dopełnij', 'dopełnić', 'dopełnienie', 'dopełnia'],
  ['ważę', 'zważ', 'zważyć', 'zważenie', 'waży', 'zważę'],
  ['rozcieram', 'rozetrzyj', 'rozetrzeć', 'roztarcie', 'rozciera'],
  ['przesypuję', 'przesyp', 'przesypać', 'przesypanie', 'przesypuje'],
  ['stawiam', 'postaw', 'postawić', 'postawienie', 'stawia', 'umieść', 'umieszczam', 'odstaw'],
  ['odłączam', 'odłącz', 'odłączyć', 'odłączenie', 'odłącza'],
  ['rozcieńczam', 'rozcieńcz', 'rozcieńczyć', 'rozcieńczenie', 'rozcieńcza'],
  ['zamykam', 'zamknij', 'zamknąć', 'zamknięcie', 'zamyka'],
  ['zakładam', 'załóż', 'założyć', 'założenie', 'zakłada', 'ubieram', 'ubierz', 'ubrać', 'nakładam', 'nałóż'],
  ['osuszam', 'osusz', 'osuszyć', 'osuszenie', 'osusza'],
  ['sprawdzam', 'sprawdź', 'sprawdzić', 'sprawdzenie', 'sprawdza'],
  ['przygotowuję', 'przygotuj', 'przygotować', 'przygotowanie', 'przygotowuje', 'sporządź', 'sporządzić', 'sporządzam', 'sporządzenie'],
  ['zapisuję', 'zapisz', 'zapisać', 'zapisanie', 'zapisuje', 'notuję', 'zanotuj'],
  ['wylewam', 'wylej', 'wylać', 'wylanie', 'wylewa'],
  ['taruję', 'wytaruj', 'tarować', 'wytarować', 'tarowanie', 'tara'],
];

const KANON = new Map<string, string>();
for (const f of FORMY) for (const w of f.slice(1)) KANON.set(normalizuj(w), normalizuj(f[0]));

/** Tokeny z formami czasowników sprowadzonymi do formy podstawowej (do drugiej próby dopasowania). */
export function kanoniczne(wpis: string[]): string[] {
  return wpis.map((t) => KANON.get(t) ?? t);
}
