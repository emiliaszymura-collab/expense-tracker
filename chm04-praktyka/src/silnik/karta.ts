// Karta wyników sterowana danymi z pliku poziomu: losowanie pomiarów i sprawdzanie wpisów
// według kryteriów z zasad oceniania CKE.
import type { KartaSpec, Sprawdzenie } from './typy';
import { oblicz } from './wyrazenia';

export type Odpowiedzi = Record<string, string>;
export type Pomiary = Record<string, number>;

export interface Kryterium {
  opis: string;
  ok: boolean;
  /** Co poprawić (gdy niespełnione). */
  uwaga?: string;
}

export function liczba(s: string | undefined): number {
  if (!s) return NaN;
  const t = s.trim().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-eE]/g, '');
  return t === '' ? NaN : Number(t);
}

const miejsca = (s: string | undefined) => {
  const m = (s ?? '').trim().match(/[.,](\d+)/);
  return m ? m[1].length : 0;
};
const fmt = (x: number, n: number) => x.toFixed(n).replace('.', ',');
const bezZnakow = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

export function losujPomiary(spec: KartaSpec, los: () => number = Math.random): Pomiary {
  const p: Pomiary = {};
  for (const l of spec.losuj) {
    let w: number;
    if (l.wybierz) w = l.wybierz[Math.floor(los() * l.wybierz.length)];
    else if (l.wzor) w = oblicz(l.wzor, (n) => p[n]);
    else w = (l.od ?? 0) + los() * ((l.do ?? 0) - (l.od ?? 0));
    if (l.szum) w += (los() - 0.5) * 2 * l.szum;
    if (l.krok) w = Math.round(w / l.krok) * l.krok;
    if (l.miejsca !== undefined) w = Number(w.toFixed(l.miejsca));
    p[l.id] = w;
  }
  return p;
}

/** Strona równania bez ładunków, spacji, plusów i indeksów – same symbole, np. "naohhcl". */
function symbole(strona: string): string {
  return strona
    .toLowerCase()
    .replace(/[₀-₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
    .replace(/[^a-z0-9]/g, '');
}

function permutacje(t: string[]): string[] {
  if (t.length <= 1) return [t.join('')];
  return t.flatMap((x, i) => permutacje([...t.slice(0, i), ...t.slice(i + 1)]).map((r) => x + r));
}

/** Równanie pasuje, jeśli po obu stronach są właściwe cząstki – w dowolnej kolejności i zapisie ładunków. */
export function rownaniePasuje(wpis: string | undefined, lewa: string[], prawa: string[]): boolean {
  const strony = (wpis ?? '').split(/→|->|⟶|=>|=|>/).filter((x) => x.trim() !== '');
  if (strony.length !== 2) return false;
  return permutacje(lewa).includes(symbole(strony[0])) && permutacje(prawa).includes(symbole(strony[1]));
}

function zmienne(p: Pomiary, o: Odpowiedzi) {
  return (nazwa: string) => (nazwa.startsWith('$') ? liczba(o[nazwa.slice(1)]) : p[nazwa] ?? NaN);
}

function sprawdz(s: Sprawdzenie, p: Pomiary, o: Odpowiedzi): boolean {
  const z = zmienne(p, o);
  switch (s.typ) {
    case 'liczba': {
      const wpis = liczba(o[s.pole]);
      const cel = oblicz(s.wzor, z);
      return Number.isFinite(wpis) && Number.isFinite(cel) && Math.abs(wpis - cel) <= s.tol + 1e-9;
    }
    case 'miejsca':
      return Number.isFinite(liczba(o[s.pole])) && miejsca(o[s.pole]) === s.ile;
    case 'tekst': {
      const t = bezZnakow(o[s.pole] ?? '');
      return s.zawiera.some((x) => t.includes(bezZnakow(x)));
    }
    case 'rownanie':
      return rownaniePasuje(o[s.pole], s.lewa, s.prawa);
    case 'rozrzut': {
      const w = s.pola.map((id) => liczba(o[id])).filter(Number.isFinite);
      return w.length >= 2 && Math.max(...w) - Math.min(...w) <= s.max + 1e-9;
    }
    case 'wybor': {
      // Wniosek zależny od wyniku: wzór > 0 → odpowiedź „tak”, inaczej „nie” (frazy „nie” sprawdzamy pierwsze).
      const t = bezZnakow(o[s.pole] ?? '');
      const w = oblicz(s.wzor, z);
      if (!Number.isFinite(w) || t.trim() === '') return false;
      const mowiNie = s.nie.some((x) => t.includes(bezZnakow(x)));
      const mowiTak = !mowiNie && s.tak.some((x) => t.includes(bezZnakow(x)));
      return w > 0 ? mowiTak : mowiNie;
    }
    case 'tekstRazem': {
      // Któreś z pól zawiera jednocześnie słowo z „zawiera” i słowo z „oraz” (np. „cylinder” i „50”).
      return s.pola.some((id) => {
        const t = bezZnakow(o[id] ?? '');
        return s.zawiera.some((x) => t.includes(bezZnakow(x))) && s.oraz.every((x) => t.includes(bezZnakow(x)));
      });
    }
    case 'niepuste':
      return (o[s.pole] ?? '').trim().length > 0;
  }
}

export function ocenKarte(spec: KartaSpec, p: Pomiary, o: Odpowiedzi): Kryterium[] {
  return spec.kryteria.map((k) => {
    const ok = k.sprawdz.every((s) => sprawdz(s, p, o));
    let uwaga = k.uwaga;
    if (!ok && k.pokaz) {
      const w = oblicz(k.pokaz.wzor, zmienne(p, o));
      if (Number.isFinite(w)) uwaga = `${uwaga ?? ''} Z Twoich danych wychodzi ${fmt(w, k.pokaz.miejsca)}${k.pokaz.jednostka ?? ''}.`.trim();
    }
    return { opis: k.opis, ok, uwaga: ok ? undefined : uwaga };
  });
}
