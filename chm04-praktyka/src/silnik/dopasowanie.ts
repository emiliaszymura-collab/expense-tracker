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
  if (token.startsWith(rdzen)) return true;
  if (!rozmyte) return false;
  // Krótkich rdzeni (np. "hcl", "wag") nie rozmywamy – za dużo fałszywych trafień.
  const limit = dozwolonyBlad(rdzen.length);
  if (limit === 0) return false;
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

export function grupaPasuje(grupa: string[], wpis: string[]): boolean {
  return grupa.some((fraza) => frazaPasuje(fraza, wpis));
}
