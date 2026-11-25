// Symulacja całych egzaminów: na każdym kroku gracz pisze to samo na różne sposoby.
// Żadne poprawne sformułowanie nie może dać „błędu”, „za wcześnie” ani „nie rozpoznaję”, ani odjąć punktu.
import { describe, expect, it } from 'vitest';
import { FORMY } from './dopasowanie';
import { nastepnyKrok, nowyStan, ocenWpis, type StanGry } from './gra';
import type { Krok, Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);
const BEZ_PL: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const bezPl = (t: string) => t.toLowerCase().replace(/[ąćęłńóśźż]/g, (z) => BEZ_PL[z]);
const bezKropki = (t: string) => t.replace(/[.;:]+$/, '').replace(/\s*\(.*?\)/g, '').trim();

/** Pełne sformułowania kroku: przykład, podpowiedź (tryb rozkazujący), opis (strona bierna), inne formy czasownika. */
function pelne(k: Krok): string[] {
  const przyklad = k.przyklad ?? '';
  const podp = k.podpowiedz ?? '';
  const w = new Set<string>([przyklad, bezKropki(podp), bezPl(przyklad), bezPl(bezKropki(podp))]);
  for (const zrodlo of [przyklad, bezKropki(podp)]) {
    const [p, ...r] = zrodlo.split(' ');
    const rodzina = FORMY.find((f) => f.includes(p.toLowerCase()));
    if (rodzina) for (const f of rodzina.slice(0, 4)) w.add([f, ...r].join(' '));
  }
  return [...w];
}

/** Fragmenty podpowiedzi (pierwsza część przed „i”/przecinkiem) – gracz często pisze krok w kawałkach. */
function fragmenty(k: Krok): string[] {
  const t = bezKropki(k.podpowiedz ?? '').split(/[;–]/)[0];
  const czesci = t.split(/,(?!\s*\d)| i | oraz /).map((c) => c.trim()).filter((c) => c.split(' ').length >= 2);
  return czesci.length > 1 ? [czesci[0]] : [];
}

const ZLE = ['blad', 'za-wczesnie', 'nie-rozpoznano', 'brak-bhp'];

for (const poziom of poziomy)
  describe(`symulacja egzaminu – ${poziom.id}`, () => {
    let bazowy: StanGry = { ...nowyStan(poziom.id), bhp: ['fartuch', 'rekawice', 'okulary'] };
    const kolejka: Krok[] = [];
    for (let i = 0; i < poziom.kroki.length; i++) {
      const k = nastepnyKrok(poziom, bazowy.wykonane)!;
      kolejka.push(k);
      bazowy = { ...bazowy, wykonane: [...bazowy.wykonane, k.id] };
    }
    let stan: StanGry = { ...nowyStan(poziom.id), bhp: ['fartuch', 'rekawice', 'okulary'] };
    for (const krok of kolejka) {
      const przed = stan;
      for (const wpis of fragmenty(krok))
        it(`${krok.id} – fragment: „${wpis}”`, () => {
          const r = ocenWpis(poziom, przed, wpis, false);
          const ost = r.stan.dziennik.at(-1)!;
          expect(ZLE, `${ost.rodzaj}: ${ost.komunikat}`).not.toContain(ost.rodzaj);
          expect(r.stan.bledy).toBe(0);
        });
      for (const wpis of pelne(krok))
        it(`${krok.id}: „${wpis}”`, () => {
          const r = ocenWpis(poziom, przed, wpis, false);
          const ost = r.stan.dziennik.at(-1)!;
          expect(r.przyjete.map((k) => k.id), `${ost.rodzaj}: ${ost.komunikat}`).toContain(krok.id);
          expect(r.stan.bledy, 'nie może odjąć punktu').toBe(0);
        });
      stan = { ...stan, wykonane: [...stan.wykonane, krok.id] };
    }
  });
