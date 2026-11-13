// Każdy poziom musi dać się przejść wpisami z pól "przyklad", a jego karta – wypełnić poprawnie.
import { describe, expect, it } from 'vitest';
import { losujPomiary, ocenKarte } from './karta';
import { nowyStan, ocenWpis, poziomUkonczony } from './gra';
import type { Poziom } from './typy';

const pliki = import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true });
const poziomy = Object.values(pliki).map((m) => m.default);

describe.each(poziomy.map((p) => [p.id, p] as const))('poziom %s', (_, poziom) => {
  it('przechodzi się wpisami przykładowymi, każdy zalicza dokładnie swój krok', () => {
    let stan = ocenWpis(poziom, nowyStan(poziom.id), 'zakładam fartuch, rękawice i gogle', true).stan;
    for (const krok of poziom.kroki) {
      expect(krok.przyklad, `brak przykładu w kroku ${krok.id}`).toBeTruthy();
      const w = ocenWpis(poziom, stan, krok.przyklad!, true);
      const odp = w.stan.dziennik.at(-1);
      expect(w.przyjete.map((k) => k.id), `„${krok.przyklad}” → ${odp?.rodzaj}: ${odp?.komunikat} ${odp?.wyjasnienie ?? ''}`).toEqual([krok.id]);
      stan = w.stan;
    }
    expect(poziomUkonczony(poziom, stan)).toBe(true);
  });

  it('kroki odwołują się do istniejących kroków i stanowisk', () => {
    const ids = new Set(poziom.kroki.map((k) => k.id));
    expect(ids.size).toBe(poziom.kroki.length);
    for (const k of poziom.kroki) {
      for (const w of k.wymaga ?? []) expect(ids.has(w), `${k.id} wymaga nieistniejącego ${w}`).toBe(true);
      expect(['zlew', 'waga', 'kolba', 'statyw', 'zlewka', 'odpady', 'stol', undefined]).toContain(k.sprzet);
    }
  });

  it('karta: losowanie działa, pusta karta nie zalicza kryteriów liczbowych, wzory się liczą', () => {
    if (!poziom.karta) return;
    for (let i = 0; i < 50; i++) {
      const p = losujPomiary(poziom.karta);
      for (const l of poziom.karta.losuj) expect(Number.isFinite(p[l.id]), `${l.id}`).toBe(true);
      const k = ocenKarte(poziom.karta, p, {});
      expect(k.filter((x) => x.ok).length).toBe(0);
    }
  });
});

// Automatyczne „idealne wypełnienie” karty: wartości liczymy ze wzorów kryteriów, zaokrąglamy tak,
// jak wymaga karta, i oczekujemy kompletu punktów. Wyłapuje zbyt ciasne tolerancje i błędy we wzorach.
import { liczba } from './karta';
import { oblicz } from './wyrazenia';

function idealne(poziom: Poziom, p: Record<string, number>): Record<string, string> {
  const o: Record<string, string> = {};
  const spr = poziom.karta!.kryteria.flatMap((k) => k.sprawdz);
  const miejsc: Record<string, number> = {};
  for (const s of spr) if (s.typ === 'miejsca') miejsc[s.pole] = s.ile;
  const z = (n: string) => (n.startsWith('$') ? liczba(o[n.slice(1)]) : p[n]);
  for (let runda = 0; runda < 8; runda++) {
    for (const s of spr) {
      if (s.typ === 'liczba') {
        const w = oblicz(s.wzor, z);
        if (Number.isFinite(w)) o[s.pole] = w.toFixed(miejsc[s.pole] ?? 6).replace('.', ',');
      } else if (s.typ === 'tekst') o[s.pole] = [o[s.pole] ?? '', s.zawiera[0]].join(' ');
      else if (s.typ === 'rownanie') o[s.pole] = `${s.lewa.join(' + ')} -> ${s.prawa.join(' + ')}`;
      else if (s.typ === 'wybor') {
        const w = oblicz(s.wzor, z);
        if (Number.isFinite(w)) o[s.pole] = w > 0 ? s.tak[0] : s.nie[0];
      } else if (s.typ === 'tekstRazem') {
        const wolne = s.pola.find((id) => !o[id] || o[id].includes(s.zawiera[0]))!;
        o[wolne] = `${s.zawiera[0]} ${s.oraz.join(' ')}`;
      }
    }
  }
  return o;
}

describe.each(poziomy.filter((p) => p.karta).map((p) => [p.id, p] as const))('karta %s', (_, poziom) => {
  it('poprawnie wypełniona karta dostaje komplet punktów (200 losowań)', () => {
    for (let i = 0; i < 200; i++) {
      const p = losujPomiary(poziom.karta!);
      const k = ocenKarte(poziom.karta!, p, idealne(poziom, p));
      expect(k.filter((x) => !x.ok).map((x) => x.opis), JSON.stringify(p)).toEqual([]);
    }
  });
});
