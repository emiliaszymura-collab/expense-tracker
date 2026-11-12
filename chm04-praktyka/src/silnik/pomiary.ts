// Wyniki pomiarów losowane dla każdego podejścia – jak na egzaminie, każdy ma inne liczby.
export interface Pomiary {
  /** Masy trzech próbek mydła [g], dokładność 0,01 g. */
  m: number[];
  /** Objętości titranta odczytane z biurety [cm³], dokładność 0,05 cm³. */
  v: number[];
  /** Przybliżone pH roztworu mydła (papierek wskaźnikowy). */
  ph: number;
}

export const C_HCL = 0.01; // mol/dm³
export const M_NAOH = 40; // g/mol

const zaokr = (x: number, krok: number) => Math.round(x / krok) * krok;

export function losujPomiary(los: () => number = Math.random): Pomiary {
  const x = 0.03 + los() * 0.05; // prawdziwa zawartość NaOH [%]
  const m = [0, 1, 2].map(() => Number((1.95 + los() * 0.12).toFixed(2)));
  const v = m.map((mi) => {
    const idealna = ((x / 100) * mi) / (C_HCL * M_NAOH) * 1000; // cm³
    return Number(zaokr(idealna + (los() - 0.5) * 0.1, 0.05).toFixed(2));
  });
  return { m, v, ph: los() < 0.5 ? 9 : 10 };
}

/** X = (V[dm³] · C · 40 / m) · 100% */
export function zawartoscNaOH(vCm3: number, m: number): number {
  return ((vCm3 / 1000) * C_HCL * M_NAOH) / m * 100;
}
