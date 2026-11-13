// Różne sposoby opisania montażu zestawu do miareczkowania – na każdym poziomie, który ma ten krok.
import { describe, expect, it } from 'vitest';
import { nowyStan, ocenWpis, wymaganiaKroku } from './gra';
import type { Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);

const WPISY = [
  'złożenie sprzętu do miareczkowania',
  'składam sprzęt do miareczkowania',
  'składam zestaw do miareczkowania',
  'montuję sprzęt do miareczkowania',
  'zmontowanie zestawu do miareczkowania',
  'zestawiam aparaturę do miareczkowania',
  'przygotowuję zestaw do miareczkowania',
  'mocuję biuretę na statywie',
  'montuje zestaw',
  'zmontuj zestaw do miareczkowania',
  'złóż zestaw do miareczkowania',
];

describe.each(poziomy.filter((p) => p.kroki.some((k) => k.id === 'montaz')).map((p) => [p.id, p] as const))('montaż – %s', (_, poziom) => {
  const krok = poziom.kroki.find((k) => k.id === 'montaz')!;
  // stan, w którym montaż jest dostępny: wszystkie jego wymagania (rekurencyjnie) wykonane
  const potrzebne = new Set<string>();
  const dodaj = (id: string) => {
    for (const w of wymaganiaKroku(poziom, poziom.kroki.find((k) => k.id === id)!)) if (!potrzebne.has(w)) (potrzebne.add(w), dodaj(w));
  };
  dodaj('montaz');
  const stan = { ...nowyStan(poziom.id), wykonane: [...potrzebne], bhp: ['fartuch', 'rekawice', 'okulary'] as ('fartuch' | 'rekawice' | 'okulary')[] };
  for (const w of WPISY)
    it(`„${w}”`, () => {
      const r = ocenWpis(poziom, stan, w, true);
      expect(r.przyjete.map((k) => k.id), `${r.stan.dziennik.at(-1)?.rodzaj}: ${r.stan.dziennik.at(-1)?.komunikat}`).toContain(krok.id);
    });
});
