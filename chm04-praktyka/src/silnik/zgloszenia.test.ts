// Wpisy zgłoszone przez gracza, które były źle oceniane – pilnujemy, żeby błąd nie wrócił.
import { describe, expect, it } from 'vitest';
import { nowyStan, ocenWpis, prosiOPomoc } from './gra';
import type { Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);
const poziom = (id: string) => poziomy.find((p) => p.id === id)!;

function graj(p: Poziom, wpisy: [string, string][]) {
  let stan = { ...nowyStan(p.id), bhp: ['fartuch', 'rekawice', 'okulary'] as ('fartuch' | 'rekawice' | 'okulary')[] };
  for (const [w, oczekiwany] of wpisy) {
    const r = ocenWpis(p, stan, w, false);
    const ost = r.stan.dziennik.at(-1)!;
    if (oczekiwany === 'juz') expect(ost.rodzaj).toBe('juz-zrobione');
    else expect(r.przyjete.map((k) => k.id), `„${w}” → ${ost.rodzaj}: ${ost.komunikat}`).toContain(oczekiwany);
    stan = r.stan;
  }
  expect(stan.bledy).toBe(0);
}

describe('żelazo – spektrofotometria (zgłoszenie)', () => {
  it('przygotowanie wzorców, próbki i ślepej próby', () =>
    graj(poziom('11-spektrofotometria'), [
      ['do kolb miarowych odmierzyć podane ilości roztworu', 'wzorce'],
      ['do szóstej kolby 25cm badanej próbki', 'probka'],
      ['siódma kolba to ślepa próbka', 'juz'],
    ]));
  it('ślepa próba przygotowana razem z próbką', () =>
    graj(poziom('11-spektrofotometria'), [
      ['odmierzam do kolb roztwór podstawowy żelaza', 'wzorce'],
      ['siódma kolba to ślepa próba', 'probka'],
    ]));
});

describe('prośba o podpowiedź z literówką', () => {
  for (const t of ['podpoiedz', 'podpowiedz', 'podpowiedź', 'pomocy', 'co teraz'])
    it(t, () => expect(prosiOPomoc(t)).toBe(true));
});

describe('żelazo – kuweta po wywołaniu barwy (zgłoszenie)', () => {
  it('kuweta bez osobnego „uzupełniam do kreski”', () =>
    graj(poziom('11-spektrofotometria'), [
      ['odmierzam do kolb roztwór podstawowy żelaza', 'wzorce'],
      ['do szóstej kolby 25 cm3 badanej próbki', 'probka'],
      ['dodaję do każdej kolby HCl i rodanek potasu', 'barwa'],
      ['włączam spektrofotometr i ustawiam 480 nm', 'fala'],
      ['kuwetę trzymać za matowe ścianki', 'kuweta'],
    ]));
  it('„za wcześnie” nie odbiera punktów', () => {
    const p = poziom('11-spektrofotometria');
    const r = ocenWpis(p, { ...nowyStan(p.id), bhp: ['fartuch', 'rekawice', 'okulary'] }, 'zeruję spektrofotometr na ślepej próbie', false);
    expect(r.stan.dziennik.at(-1)!.rodzaj).toBe('za-wczesnie');
    expect(r.stan.bledy).toBe(0);
  });
});
