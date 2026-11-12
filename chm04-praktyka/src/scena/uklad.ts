// Rozmieszczenie sprzętu na stole. Id muszą odpowiadać polu "sprzet" w krokach procedur.
// Etap 4: tu podmienimy bryły na ładniejsze modele bez zmiany logiki gry.

export const WYSOKOSC_STOLU = 0.9;

export const POZYCJE: Record<string, [number, number, number]> = {
  zlew: [-3.3, WYSOKOSC_STOLU, -0.1],
  waga: [-2.1, WYSOKOSC_STOLU, -0.05],
  kolba: [-0.9, WYSOKOSC_STOLU, 0.05],
  statyw: [0.35, WYSOKOSC_STOLU, -0.05],
  zlewka: [1.6, WYSOKOSC_STOLU, 0.05],
  odpady: [2.8, WYSOKOSC_STOLU, -0.15],
  stol: [0, WYSOKOSC_STOLU, 0],
};

export const NAZWY_SPRZETU: Record<string, string> = {
  zlew: 'zlew',
  waga: 'waga',
  kolba: 'kolba stożkowa',
  statyw: 'biureta',
  zlewka: 'zlewka',
  odpady: 'odpady ciekłe',
};

/** Barwy roztworów w kolbie / zlewce. */
export const BARWY: Record<string, string> = {
  bezbarwny: '#dfeef5',
  mydlo: '#f3efe2',
  zolty: '#f2c230',
  pomaranczowy: '#ef7f5a',
  roztwor: '#e8eef0',
  niebieskozielony: '#2aa58f',
  titrant: '#e9f3f7',
};
