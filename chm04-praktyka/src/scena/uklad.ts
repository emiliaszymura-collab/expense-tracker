// Rozmieszczenie sprzętu na stole-wyspie. Id muszą odpowiadać polu "sprzet" w krokach procedur.
// Laborant stoi ZA stołem (ujemne z), twarzą do kamery – widać jego ręce i sprzęt.

export const BLAT = 0.9;
/** Gdzie stoi laborant (oś z). */
export const Z_LABORANTA = -0.55;
/** Wyspa: zakres x i z blatu. */
export const WYSPA = { x0: -2.15, x1: 1.95, z0: -0.3, z1: 0.48 };

export const POZYCJE: Record<string, [number, number, number]> = {
  zlew: [-1.75, BLAT, 0.08],
  waga: [-1.05, BLAT, 0.05],
  kolba: [-0.4, BLAT, 0.06],
  statyw: [0.3, BLAT, 0.02],
  zlewka: [0.95, BLAT, 0.06],
  odpady: [1.55, BLAT, 0.04],
  stol: [0.62, BLAT, 0.1],
};

export const NAZWY_SPRZETU: Record<string, string> = {
  zlew: 'zlew',
  waga: 'waga',
  kolba: 'kolba stożkowa',
  statyw: 'biureta',
  zlewka: 'zlewka',
  odpady: 'odpady ciekłe',
};

/** Biureta: wysokość końcówki nad blatem i długość rurki. */
export const BIURETA = { dol: 0.25, dlugosc: 0.5 };
export const BIURETA_GORA = BLAT + BIURETA.dol + 0.07 + BIURETA.dlugosc;

/** Barwy roztworów w kolbie / zlewce. */
export const BARWY: Record<string, string> = {
  bezbarwny: '#b9dcee',
  zolty: '#f2bd1d',
  pomaranczowy: '#ee7c52',
  roztwor: '#dfe9ec',
  niebieskozielony: '#2aa58f',
  titrant: '#a9d3ea',
};

export const gladko = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
