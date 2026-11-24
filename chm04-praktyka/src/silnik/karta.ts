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
    case 'tekstWg': {
      const n = Math.round(oblicz(s.wzor, z));
      const t = bezZnakow(o[s.pole] ?? '');
      if (!(n >= 0 && n < s.opcje.length) || !t.trim()) return false;
      const inne = s.opcje.filter((_, i) => i !== n).flat();
      // pełna nazwa innej opcji w odpowiedzi = zła identyfikacja (np. „glukoza” zamiast „sacharoza”)
      return s.opcje[n].some((x) => t.includes(bezZnakow(x))) && !inne.some((x) => t.includes(bezZnakow(x)) && !s.opcje[n].some((y) => bezZnakow(y).includes(bezZnakow(x))));
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

/** Arkusz wzorcowy: każde pole policzone ze wzorów kryteriów i zaokrąglone tak, jak wymaga karta. */
export function wzorcoweWypelnienie(spec: KartaSpec, p: Pomiary): Odpowiedzi {
  const o: Odpowiedzi = {};
  const spr = spec.kryteria.flatMap((k) => k.sprawdz);
  const miejsc: Record<string, number> = {};
  for (const s of spr) if (s.typ === 'miejsca') miejsc[s.pole] = s.ile;
  const z = (n: string) => (n.startsWith('$') ? liczba(o[n.slice(1)]) : p[n]);
  for (let runda = 0; runda < 8; runda++) {
    for (const s of spr) {
      if (s.typ === 'liczba') {
        const w = oblicz(s.wzor, z);
        if (Number.isFinite(w)) {
          // bez wymogu miejsc: tyle miejsc, ile wynika z tolerancji (błąd zaokrąglenia ≤ połowa tolerancji)
          const d = miejsc[s.pole] ?? Math.min(6, Math.max(0, Math.ceil(-Math.log10(2 * (s.tol || 1e-6)))));
          o[s.pole] = w.toFixed(d).replace('.', ',');
        }
      } else if (s.typ === 'tekst') {
        if (!(o[s.pole] ?? '').includes(s.zawiera[0])) o[s.pole] = [o[s.pole] ?? '', s.zawiera[0]].join(' ').trim();
      } else if (s.typ === 'rownanie') o[s.pole] = `${s.lewa.join(' + ')} → ${s.prawa.join(' + ')}`;
      else if (s.typ === 'wybor') {
        const w = oblicz(s.wzor, z);
        if (Number.isFinite(w)) o[s.pole] = w > 0 ? s.tak[0] : s.nie[0];
      } else if (s.typ === 'tekstWg') {
        const n = Math.round(oblicz(s.wzor, z));
        if (n >= 0 && n < s.opcje.length) o[s.pole] = s.opcje[n][0];
      } else if (s.typ === 'tekstRazem') {
        if (s.pola.some((id) => (o[id] ?? '').includes(s.zawiera[0]))) continue;
        const wolne = s.pola.find((id) => !o[id]) ?? s.pola[0];
        o[wolne] = `${s.zawiera[0]} ${s.oraz.join(' ')}`;
      }
    }
  }
  return o;
}

/** Pola, których dotyczy kryterium (do zaznaczania błędów w arkuszu). */
export function polaKryterium(s: Sprawdzenie): string[] {
  const x = s as unknown as { pole?: string; pola?: string[] };
  return [...(x.pole ? [x.pole] : []), ...(x.pola ?? [])];
}

/** Wstawia liczby do linii rozwiązania: {wzór|miejsca}. */
export function wypelnijRozwiazanie(spec: KartaSpec, p: Pomiary): string[] {
  const o = wzorcoweWypelnienie(spec, p);
  const z = (n: string) => (n.startsWith('$') ? liczba(o[n.slice(1)]) : p[n]);
  return (spec.rozwiazanie ?? []).map((l) =>
    l.replace(/\{([^}|]+)(?:\|(\d+))?\}/g, (_, w: string, m?: string) => {
      if (/^\$\w+$/.test(w.trim()) && !Number.isFinite(liczba(o[w.trim().slice(1)]))) return o[w.trim().slice(1)] ?? '?';
      const v = oblicz(w, z);
      return Number.isFinite(v) ? (m !== undefined ? v.toFixed(Number(m)) : String(Number(v.toFixed(6)))).replace('.', ',') : '?';
    }),
  );
}
