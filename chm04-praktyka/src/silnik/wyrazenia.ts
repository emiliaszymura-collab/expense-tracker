// Mały kalkulator wyrażeń do plików poziomów (bez eval – strona ma to zablokowane).
// Obsługuje: liczby, zmienne (także z "$" – wpis gracza), + - * / ( ), funkcje sr, abs, min, max, zaokr.

type Zmienne = (nazwa: string) => number;

const FUNKCJE: Record<string, (a: number[]) => number> = {
  sr: (a) => a.reduce((x, y) => x + y, 0) / a.length,
  abs: (a) => Math.abs(a[0]),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  zaokr: (a) => Number(a[0].toFixed(a[1] ?? 0)),
};

export function oblicz(wzor: string, zmienne: Zmienne): number {
  const t = wzor.match(/\d+(?:\.\d+)?(?:e-?\d+)?|[$A-Za-z_][\w$]*|[-+*/(),]/g) ?? [];
  let i = 0;
  const wyrazenie = (): number => {
    let w = skladnik();
    while (t[i] === '+' || t[i] === '-') w = t[i++] === '+' ? w + skladnik() : w - skladnik();
    return w;
  };
  const skladnik = (): number => {
    let w = czynnik();
    while (t[i] === '*' || t[i] === '/') w = t[i++] === '*' ? w * czynnik() : w / czynnik();
    return w;
  };
  const czynnik = (): number => {
    const z = t[i++];
    if (z === undefined) throw new Error(`Niepełny wzór: ${wzor}`);
    if (z === '-') return -czynnik();
    if (z === '(') {
      const w = wyrazenie();
      i++; // ")"
      return w;
    }
    if (/^\d/.test(z)) return Number(z);
    if (t[i] === '(') {
      i++;
      const arg: number[] = [];
      while (t[i] !== ')' && i < t.length) {
        arg.push(wyrazenie());
        if (t[i] === ',') i++;
      }
      i++;
      const f = FUNKCJE[z];
      if (!f) throw new Error(`Nieznana funkcja "${z}" we wzorze: ${wzor}`);
      return f(arg);
    }
    return zmienne(z);
  };
  const wynik = wyrazenie();
  if (i < t.length) throw new Error(`Błąd składni we wzorze: ${wzor}`);
  return wynik;
}
