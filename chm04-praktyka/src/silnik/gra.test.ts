import { describe, expect, it } from 'vitest';
import poziomJson from '../procedury/01-mydlo-naoh.json';
import { odleglosc, slowoPasuje, tokeny } from './dopasowanie';
import { nowyStan, ocenWpis, poziomUkonczony, type StanGry } from './gra';
import type { Poziom } from './typy';

const poziom = poziomJson as Poziom;

function graj(wpisy: string[], cwiczenie = true): StanGry {
  let stan = nowyStan(poziom.id);
  for (const w of wpisy) stan = ocenWpis(poziom, stan, w, cwiczenie).stan;
  return stan;
}

describe('dopasowanie', () => {
  it('normalizuje polskie znaki', () => {
    expect(tokeny('Odważam 2,0 g MYDŁA!')).toEqual(['odwazam', '2.0', 'g', 'mydla']);
  });
  it('toleruje literówki', () => {
    expect(odleglosc('miareczk', 'miaerczk')).toBe(1);
    expect(slowoPasuje('miareczk', 'miaerczkuje')).toBe(true);
    expect(slowoPasuje('biuret', 'buirete')).toBe(true);
    expect(slowoPasuje('wag', 'wage')).toBe(true);
  });
});

describe('poziom: NaOH w mydle', () => {
  const pelnaRozgrywka = [
    'zakładam fartuch, rękawice i gogle',
    'montuję zestaw do miareczkowania na statywie',
    'napełniam biuretę kwasem solnym przez lejek',
    'zdejmuję lejek',
    'usuwam pęcherzyk powietrza z kranika',
    'ustawiam menisk dolny na zero',
    'podnoszę rękę i zgłaszam gotowość',
    'włączam i taruję wagę',
    'odważam 2 g mydła do kolby stożkowej',
    'dodaję 100 cm3 wody destylowanej i mieszam',
    'dodaję 3 krople oranżu metylowego',
    'miareczkuję HCl mieszając do pomarańczowej barwy',
    'odczytuję objętość z biurety',
    'powtarzam oznaczenie jeszcze dwa razy',
    'do zlewki odważam 2 g mydła, dodaję 50 cm3 wody i mieszam bagietką',
    'zanurzam papierek wskaźnikowy i porównuję ze skalą',
    'przelewam mieszaniny do pojemnika na odpady ciekłe',
    'rozmontowuję zestaw do miareczkowania',
    'myję szkło',
    'wyłączam wagę',
    'wycieram stół',
  ];

  it('poprawna rozgrywka kończy poziom', () => {
    const stan = graj(pelnaRozgrywka);
    const nieprzyjete = stan.dziennik.filter((d) => d.rodzaj !== 'ok' && d.rodzaj !== 'bhp');
    expect(nieprzyjete).toEqual([]);
    expect(poziomUkonczony(poziom, stan)).toBe(true);
  });

  it('literówki są przyjmowane', () => {
    const stan = graj(['zakladam fartuh rekawice gogle', 'motuje zestaw do miareczkowania', 'napelniam biurte']);
    expect(stan.wykonane).toEqual(['montaz', 'napelnij']);
  });

  it('pominięty krok daje podpowiedź', () => {
    const stan = graj(['zakładam fartuch, rękawice i gogle', 'miareczkuję próbkę']);
    const ostatni = stan.dziennik.at(-1)!;
    expect(ostatni.rodzaj).toBe('za-wczesnie');
    expect(ostatni.wyjasnienie).toContain('Zmontuj');
  });

  it('brak BHP blokuje pracę z odczynnikami', () => {
    const stan = graj(['montuję zestaw do miareczkowania', 'napełniam biuretę']);
    expect(stan.dziennik.at(-1)!.rodzaj).toBe('brak-bhp');
    expect(stan.wykonane).toEqual(['montaz']);
  });

  it('wylewanie do zlewu to błąd, ale mycie w zlewie nie', () => {
    expect(graj(['wylewam roztwór do zlewu']).dziennik.at(-1)!.rodzaj).toBe('blad');
    expect(graj(['myję kolbę w zlewie']).dziennik.at(-1)!.rodzaj).not.toBe('blad');
  });

  it('rozróżnia ważenie do kolby i do zlewki', () => {
    const start = ['zakładam fartuch, rękawice i gogle', 'włączam wagę'];
    expect(graj([...start, 'odważam mydło do zlewki']).wykonane).toContain('odczyn_roztwor');
    expect(graj([...start, 'odważam mydło do kolby']).wykonane).toContain('odwaz');
  });
});
