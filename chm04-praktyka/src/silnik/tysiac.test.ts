// Duży test sformułowań: każdy krok każdego zadania opisany na wiele sposobów, tak jak piszą uczniowie.
// Wynik egzaminu ma zależeć od tego, CO zrobiłaś, a nie od formy gramatycznej.
import { describe, expect, it } from 'vitest';
import { FORMY } from './dopasowanie';
import { nowyStan, ocenWpis, wymaganiaKroku } from './gra';
import type { Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);
const BEZ_PL: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const bezPl = (t: string) => t.replace(/[ąćęłńóśźż]/g, (z) => BEZ_PL[z]);

function stanDla(poziom: Poziom, id: string) {
  const potrzebne = new Set<string>();
  const dodaj = (k: string) => {
    for (const w of wymaganiaKroku(poziom, poziom.kroki.find((x) => x.id === k)!)) if (!potrzebne.has(w)) (potrzebne.add(w), dodaj(w));
  };
  dodaj(id);
  return { ...nowyStan(poziom.id), wykonane: [...potrzebne], bhp: ['fartuch', 'rekawice', 'okulary'] as ('fartuch' | 'rekawice' | 'okulary')[] };
}

/** Warianty przykładu: inne formy pierwszego czasownika, bez polskich znaków, z wielkiej litery. */
function warianty(przyklad: string): string[] {
  const [pierwsze, ...reszta] = przyklad.split(' ');
  const w = new Set<string>([bezPl(przyklad), przyklad[0].toUpperCase() + przyklad.slice(1) + '.']);
  const rodzina = FORMY.find((f) => f.includes(pierwsze.toLowerCase()));
  if (rodzina) for (const f of rodzina) w.add([f, ...reszta].join(' '));
  return [...w];
}

for (const poziom of poziomy)
  describe(`sformułowania – ${poziom.id}`, () => {
    for (const krok of poziom.kroki) {
      const stan = stanDla(poziom, krok.id);
      for (const wpis of warianty(krok.przyklad ?? krok.id))
        it(`${krok.id}: „${wpis}”`, () => {
          const r = ocenWpis(poziom, stan, wpis, false);
          const ost = r.stan.dziennik.at(-1);
          expect(r.przyjete.map((k) => k.id), `${ost?.rodzaj}: ${ost?.komunikat}`).toContain(krok.id);
          expect(r.stan.bledy, 'wpis nie może odbierać punktów').toBe(0);
        });
    }
    // dwie kolejne czynności w jednym zdaniu
    for (let i = 0; i + 1 < poziom.kroki.length; i++) {
      const a = poziom.kroki[i];
      const b = poziom.kroki[i + 1];
      if (!wymaganiaKroku(poziom, b).every((w) => w === a.id || stanDla(poziom, a.id).wykonane.includes(w))) continue;
      const wpis = `${a.przyklad} i ${b.przyklad}`;
      it(`razem: „${wpis}”`, () => {
        const r = ocenWpis(poziom, stanDla(poziom, a.id), wpis, false);
        const ost = r.stan.dziennik.at(-1);
        expect(r.przyjete.map((k) => k.id), `${ost?.rodzaj}: ${ost?.komunikat}`).toEqual(expect.arrayContaining([a.id, b.id]));
        expect(r.stan.bledy).toBe(0);
      });
    }
  });
