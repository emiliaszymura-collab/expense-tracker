import { describe, it, expect } from 'vitest';
import { POZIOMY } from '../procedury';
import { nowyStan, ocenWpis } from './gra';

describe('za wcześnie – wskazuje brakujący krok z łańcucha', () => {
  it('zdjęcie lejka przed montażem odsyła do montażu, nie do pH', () => {
    const p = POZIOMY.find((x) => x.id === '03-wodoroweglan')!;
    let stan = nowyStan(p.id);
    stan = ocenWpis(p, stan, 'zakładam fartuch, rękawice i okulary', true).stan;
    const w = ocenWpis(p, stan, 'zdejmuję lejek z biurety', true).stan.dziennik.at(-1)!;
    expect(w.rodzaj).toBe('za-wczesnie');
    expect(w.wyjasnienie).toMatch(/zestaw/i);
  });
});
