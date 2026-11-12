import { describe, expect, it } from 'vitest';
import { liczba, ocenKarte, rownaniePasuje } from './karta';
import { losujPomiary, zawartoscNaOH } from './pomiary';

const p = { m: [2.01, 1.98, 2.04], v: [2.55, 2.5, 2.6], ph: 10 };
const f = (x: number, n: number) => x.toFixed(n).replace('.', ',');
const dobre = () => {
  const o: Record<string, string> = { barwa: 'zielononiebieska', ph: '10', odczyn: 'zasadowy', r1: 'NaOH + HCl → NaCl + H2O', r2: 'Na+ + OH- + H+ + Cl- -> Na+ + Cl- + H2O', r3: 'H⁺ + OH⁻ = H₂O' };
  const xs = p.m.map((m, i) => zawartoscNaOH(p.v[i], m));
  p.m.forEach((m, i) => {
    o[`m${i + 1}`] = f(m, 2);
    o[`v${i + 1}`] = f(p.v[i], 2);
    o[`vd${i + 1}`] = f(p.v[i] / 1000, 5);
    o[`x${i + 1}`] = f(xs[i], 2);
  });
  o.xsr = f(xs.reduce((a, b) => a + b) / 3, 2);
  return o;
};

describe('karta wyników', () => {
  it('liczby z przecinkiem i jednostką', () => {
    expect(liczba('2,55 cm3'.replace('cm3', ''))).toBe(2.55);
    expect(liczba(' 0,00255')).toBe(0.00255);
    expect(liczba('')).toBeNaN();
  });
  it('poprawna karta: komplet punktów', () => {
    const k = ocenKarte(p, dobre());
    expect(k.filter((x) => !x.ok).map((x) => x.id)).toEqual([]);
    expect(k.length).toBe(13);
  });
  it('objętość w cm³ zamiast dm³ – wyłapane', () => {
    const o = dobre();
    o.vd1 = o.v1;
    expect(ocenKarte(p, o).find((x) => x.id === 'R3.4')!.ok).toBe(false);
  });
  it('wynik bez dwóch miejsc po przecinku – wyłapane', () => {
    const o = dobre();
    o.x1 = '0,1';
    expect(ocenKarte(p, o).find((x) => x.id === 'R3.7')!.ok).toBe(false);
  });
  it('zły odczyt z biurety – X liczone z danych gracza nadal zaliczone', () => {
    const o = dobre();
    o.v1 = '3,00';
    o.vd1 = '0,00300';
    o.x1 = f(zawartoscNaOH(3.0, p.m[0]), 2);
    const k = ocenKarte(p, o);
    expect(k.find((x) => x.id === 'R3.3')!.ok).toBe(false);
    expect(k.find((x) => x.id === 'R3.5')!.ok).toBe(true);
  });
  it('równania: kolejność i zapis dowolne, treść musi się zgadzać', () => {
    expect(rownaniePasuje('HCl+NaOH->H2O+NaCl', ['naoh', 'hcl'], ['nacl', 'h2o'])).toBe(true);
    expect(rownaniePasuje('NaOH + HCl → NaCl', ['naoh', 'hcl'], ['nacl', 'h2o'])).toBe(false);
    expect(rownaniePasuje('OH- + H+ → H2O', ['h', 'oh'], ['h2o'])).toBe(true);
  });
  it('losowane pomiary są realistyczne', () => {
    for (let i = 0; i < 200; i++) {
      const q = losujPomiary();
      q.m.forEach((m) => expect(m).toBeGreaterThan(1.9));
      q.v.forEach((v) => {
        expect(v).toBeGreaterThan(1);
        expect(v).toBeLessThan(5);
      });
      const xs = q.m.map((m, j) => zawartoscNaOH(q.v[j], m));
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.05);
    }
  });
});
