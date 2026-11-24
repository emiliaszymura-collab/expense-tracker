// Każdy poziom musi dać się przejść wpisami z pól "przyklad", a jego karta – wypełnić poprawnie.
import { CZAS } from '../scena/animacje';
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
      const stanowiska = ['zlew', 'waga', 'kolba', 'zlewka', 'odpady', 'stol', undefined];
      // statyw z biuretą albo przyrząd – na stanowisku stoi jedno z nich
      if (poziom.scena?.przyrzad) stanowiska.push('przyrzad', 'rurka');
      else stanowiska.push('statyw');
      expect(stanowiska, `${k.id}: stanowisko ${k.sprzet} nie istnieje na tym poziomie`).toContain(k.sprzet);
      expect(Object.keys(CZAS), `${k.id}: nieznana animacja ${k.animacja}`).toContain(k.animacja ?? 'siegnij');
    }
  });

  it('metoda instrumentalna ma przyrząd w scenie 3D', () => {
    const m = poziom.metoda.toLowerCase();
    if (m.includes('refrakt')) expect(poziom.scena?.przyrzad).toBe('refraktometr');
    if (m.includes('polarym')) expect(poziom.scena?.przyrzad).toBe('polarymetr');
    if (m.includes('spektrofot')) expect(poziom.scena?.przyrzad).toBe('spektrofotometr');
    if (m.includes('ph-metr')) expect(poziom.scena?.phmetr).toBe(true);
    if (poziom.scena?.przyrzad) expect(poziom.kroki.filter((k) => k.sprzet === 'przyrzad').length).toBeGreaterThan(2);
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
import { wzorcoweWypelnienie } from './karta';

const idealne = (poziom: Poziom, p: Record<string, number>) => wzorcoweWypelnienie(poziom.karta!, p);

describe.each(poziomy.filter((p) => p.karta).map((p) => [p.id, p] as const))('karta %s', (_, poziom) => {
  it('poprawnie wypełniona karta dostaje komplet punktów (200 losowań)', () => {
    for (let i = 0; i < 200; i++) {
      const p = losujPomiary(poziom.karta!);
      const k = ocenKarte(poziom.karta!, p, idealne(poziom, p));
      expect(k.filter((x) => !x.ok).map((x) => x.opis), JSON.stringify(p)).toEqual([]);
    }
  });
});
