// Sprawdzanie karty wyników (tabela 2 i 3 z arkusza CHM.04 styczeń 2026) według zasad oceniania CKE.
import { zawartoscNaOH, type Pomiary } from './pomiary';

export type Odpowiedzi = Record<string, string>;

export interface Kryterium {
  id: string;
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
const blisko = (a: number, b: number, tol: number) => Number.isFinite(a) && Math.abs(a - b) <= tol + 1e-9;
const fmt = (x: number, n: number) => x.toFixed(n).replace('.', ',');

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

export function ocenKarte(p: Pomiary, o: Odpowiedzi): Kryterium[] {
  const m = [1, 2, 3].map((i) => liczba(o[`m${i}`]));
  const v = [1, 2, 3].map((i) => liczba(o[`v${i}`]));
  const vd = [1, 2, 3].map((i) => liczba(o[`vd${i}`]));
  const x = [1, 2, 3].map((i) => liczba(o[`x${i}`]));
  const xsr = liczba(o.xsr);
  const k: Kryterium[] = [];
  const dodaj = (id: string, opis: string, ok: boolean, uwaga: string) => k.push({ id, opis, ok, uwaga: ok ? undefined : uwaga });

  dodaj('R3.1', 'Zapisane trzy masy próbek [g], ok. 2 g, zgodne z odczytem z wagi', m.every((mi, i) => blisko(mi, p.m[i], 0.005)),
    'Przepisz masy dokładnie z wyświetlacza wagi.');
  dodaj('R3.2', 'Masy zapisane z dokładnością do drugiego miejsca po przecinku', [1, 2, 3].every((i) => miejsca(o[`m${i}`]) === 2),
    'Każda masa musi mieć dwa miejsca po przecinku, np. 2,00.');
  dodaj('R3.3', 'Zapisane trzy objętości titranta [cm³], zgodne z odczytem z biurety', v.every((vi, i) => blisko(vi, p.v[i], 0.05)),
    'Odczytaj objętość na dolnym menisku; dopuszczalna różnica to 0,05 cm³.');
  dodaj('R3.4', 'Zapisane trzy objętości titranta [dm³]', vd.every((vdi, i) => blisko(vdi, v[i] / 1000, 0.000011)),
    '1 dm³ = 1000 cm³, więc cm³ dzielisz przez 1000 (np. 2,55 cm³ = 0,00255 dm³).');
  const xOk = x.every((xi, i) => blisko(xi, zawartoscNaOH(v[i], m[i]), 0.006));
  dodaj('R3.5', 'Obliczona zawartość NaOH dla trzech próbek (adekwatnie do Twoich danych)', xOk,
    Number.isFinite(v[0]) && Number.isFinite(m[0])
      ? `Sprawdź obliczenia. Dla próbki 1 z Twoich danych wychodzi ${fmt(zawartoscNaOH(v[0], m[0]), 2)}%. Pamiętaj: objętość w dm³.`
      : 'Najpierw wpisz masy i objętości.');
  const zgodne = x.filter((xi) => Number.isFinite(xi));
  const rozrzut = zgodne.length ? Math.max(...zgodne) - Math.min(...zgodne) : NaN;
  const srednia = zgodne.reduce((a, b) => a + b, 0) / (zgodne.length || 1);
  dodaj('R3.6', 'Średnia z co najmniej dwóch wyników nieróżniących się o więcej niż 0,05%', zgodne.length >= 2 && rozrzut <= 0.05 + 1e-9 && blisko(xsr, srednia, 0.006),
    zgodne.length >= 2 ? `Średnia z Twoich wyników to ${fmt(srednia, 2)}%.` : 'Najpierw oblicz X₁, X₂, X₃.');
  dodaj('R3.7', 'Wyniki zawartości NaOH z dokładnością do drugiego miejsca po przecinku', ['x1', 'x2', 'x3', 'xsr'].every((id) => miejsca(o[id]) === 2),
    'Każdy wynik X zaokrąglij do dwóch miejsc po przecinku.');
  const barwa = (o.barwa ?? '').toLowerCase();
  dodaj('R3.8', 'Zapisane zabarwienie papierka wskaźnikowego', /nieb|ziel|gran|turkus|fiolet/.test(barwa),
    'W odczynie zasadowym papierek uniwersalny robi się zielononiebieski / niebieski.');
  dodaj('R3.9', 'Przybliżona wartość pH adekwatna do zabarwienia', blisko(liczba(o.ph), p.ph, 1),
    'Porównaj barwę papierka ze skalą – tu pH wynosi około ' + p.ph + '.');
  dodaj('R3.10', 'Odczyn adekwatny do wartości pH', /zasad/.test((o.odczyn ?? '').toLowerCase()),
    'pH powyżej 7 oznacza odczyn zasadowy.');
  dodaj('R4.1', 'Równanie w formie cząsteczkowej', rownaniePasuje(o.r1, ['naoh', 'hcl'], ['nacl', 'h2o']),
    'NaOH + HCl → NaCl + H₂O');
  dodaj('R4.2', 'Równanie w formie jonowej pełnej', rownaniePasuje(o.r2, ['na', 'oh', 'h', 'cl'], ['na', 'cl', 'h2o']),
    'Na⁺ + OH⁻ + H⁺ + Cl⁻ → Na⁺ + Cl⁻ + H₂O');
  dodaj('R4.3', 'Równanie w formie jonowej skróconej', rownaniePasuje(o.r3, ['h', 'oh'], ['h2o']),
    'H⁺ + OH⁻ → H₂O');
  return k;
}
