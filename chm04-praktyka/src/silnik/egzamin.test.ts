import { describe, expect, it } from 'vitest';
import poziomJson from '../procedury/01-mydlo-naoh.json';
import { formatCzasu, ocenEgzamin, pozostaloMs } from './egzamin';
import { nowyStan } from './gra';
import type { Poziom } from './typy';

const poziom = poziomJson as unknown as Poziom;

describe('egzamin', () => {
  it('pusta praca: 0%, niezdane', () => {
    const w = ocenEgzamin(poziom, { ...nowyStan(poziom.id), pomiary: {} });
    expect(w.procent).toBe(0);
    expect(w.zdany).toBe(false);
  });
  it('wszystkie kroki i BHP bez karty: przebieg pełny, błędy odejmują punkty', () => {
    const stan = { ...nowyStan(poziom.id), wykonane: poziom.kroki.map((k) => k.id), bhp: ['fartuch', 'rekawice', 'okulary'] as const, bledy: 2 };
    const w = ocenEgzamin(poziom, { ...stan, bhp: [...stan.bhp] });
    expect(w.przebieg.pkt).toBe(poziom.kroki.length - 2);
    expect(w.bhp.pkt).toBe(3);
  });
  it('odliczanie czasu', () => {
    const s = { ...nowyStan(poziom.id), start: 1_000_000 };
    expect(pozostaloMs(poziom, s, 1_000_000 + 60_000)).toBe(179 * 60_000);
    expect(pozostaloMs(poziom, s, 1_000_000 + 999 * 60_000)).toBe(0);
    expect(formatCzasu(179 * 60_000 + 5_000)).toBe('2:59:05');
  });
});

import { prosiOPomoc } from './gra';
describe('podpowiedzi w egzaminie', () => {
  it('rozpoznaje prośby o pomoc, nie myli z czynnościami', () => {
    for (const t of ['nie wiem pomóż mi', 'pomocy', 'podpowiedź', 'co teraz?', 'co dalej', 'nie wiem co robić']) expect(prosiOPomoc(t), t).toBe(true);
    for (const t of ['odważam mydło', 'napełniam biuretę', 'zgłaszam gotowość', 'wiem']) expect(prosiOPomoc(t), t).toBe(false);
  });
  it('podpowiedź odejmuje punkt', () => {
    const baza = { ...nowyStan(poziom.id), wykonane: poziom.kroki.slice(0, 5).map((k) => k.id), bhp: ['fartuch', 'rekawice', 'okulary'] as ('fartuch' | 'rekawice' | 'okulary')[] };
    expect(ocenEgzamin(poziom, { ...baza, podpowiedzi: 2 }).przebieg.pkt).toBe(3);
  });
});
