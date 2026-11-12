// Etap 3: różne sposoby opisania tej samej czynności – tak, jak uczniowie naprawdę piszą.
// Dla każdego kroku: stan z wykonanymi wszystkimi wcześniejszymi krokami + komplet BHP,
// a potem sprawdzamy, czy każdy wariant zostaje przyjęty jako ten krok.
import { describe, expect, it } from 'vitest';
import poziomJson from '../procedury/01-mydlo-naoh.json';
import { nowyStan, ocenWpis, type StanGry } from './gra';
import type { Poziom } from './typy';

const poziom = poziomJson as Poziom;

const WARIANTY: Record<string, string[]> = {
  montaz: [
    'montuję zestaw do miareczkowania',
    'zmontuj zestaw do miareczkowania',
    'składam zestaw do miareczkowania',
    'mocuję biuretę w łapie na statywie',
    'przygotowuje zestaw do miareczkowania',
    'zakładam biuretę na statyw',
    'motuje zestaw',
    'montaż zestawu do miareczkowania',
    'przykręcam łapę do statywu i wkładam biuretę',
  ],
  napelnij: [
    'napełniam biuretę kwasem solnym',
    'napelniam biurete HCl',
    'nalewam titrant do biurety przez lejek',
    'wlewam kwas solny do biurety',
    'napełnienie biurety titrantem',
    'uzupełniam biuretę roztworem HCl 0,01 mol/dm3',
    'napełnij biuretę',
  ],
  lejek: ['zdejmuję lejek z biurety', 'wyjmuję lejek', 'zdejmij lejek', 'odkładam lejek', 'usuwam lejek z biurety', 'sciagam lejek'],
  pecherz: [
    'usuwam pęcherzyk powietrza',
    'usuwam pecherz powietrza z kranika',
    'odpowietrzam biuretę',
    'spuszczam trochę titranta żeby nie było pęcherza',
    'sprawdzam czy nie ma pęcherzyków powietrza',
  ],
  zero: [
    'ustawiam poziom na zero',
    'doprowadzam menisk dolny do kreski zero',
    'zeruję biuretę',
    'ustawiam biuretę na 0',
    'wyzerowanie biurety',
    'spuszczam titrant do zera',
  ],
  zglos: [
    'zgłaszam gotowość',
    'podnoszę rękę',
    'zgłaszam gotowość do oceny zestawu',
    'zglaszam przewodniczacemu gotowosc',
    'podnieś rękę i zgłoś gotowość',
  ],
  waga: [
    'włączam wagę',
    'wlaczam wage i taruje',
    'taruję wagę',
    'wypoziomuję wagę i ją wytaruję',
    'włączenie wagi',
    'uruchamiam wagę',
    'zeruję wagę z naczynkiem',
  ],
  odwaz: [
    'odważam 2 g mydła do kolby stożkowej',
    'odwazam okolo 2g mydla',
    'naważam próbkę mydła do kolby',
    'odważ 2 g próbki',
    'ważę mydło w kolbie stożkowej',
    'odważenie próbki mydła',
    'zważyć 2,00 g mydła',
  ],
  woda: [
    'dodaję 100 cm3 wody destylowanej',
    'dolewam wodę destylowaną cylindrem',
    'odmierzam cylindrem 100 cm3 wody i wlewam do kolby',
    'dodaj 100 ml wody',
    'wlewam wodę do kolby',
    'dodaje wody destylowanej',
  ],
  mieszaj: ['mieszam', 'dokładnie mieszam zawartość kolby', 'wymieszaj', 'mieszam aż mydło się rozpuści', 'mieszanie roztworu', 'rozpuszczam mydło'],
  oranz: [
    'dodaję 3 krople oranżu metylowego',
    'dodaje oranz metylowy',
    'wkraplam wskaźnik',
    'dodaj trzy krople oranżu',
    'dodanie wskaźnika oranżu metylowego',
    'dodaję 3 krople wskaźnika',
  ],
  miareczkuj: [
    'miareczkuję do zmiany barwy na pomarańczową',
    'miareczkuje roztworem HCl',
    'miareczkuj',
    'miareczkuję mieszając do pomarańczowo-różowej barwy',
    'miaerczkuje',
    'miareczkowanie próbki kwasem solnym',
  ],
  odczyt: [
    'odczytuję objętość z biurety',
    'zapisuję zużytą objętość titranta',
    'odczyt objętości',
    'zapisuje wynik V1',
    'sprawdzam ile zużyłam titranta',
    'odczytuję wynik',
  ],
  powtorz: [
    'powtarzam oznaczenie jeszcze dwa razy',
    'robię jeszcze dwa miareczkowania',
    'powtórz oznaczenie',
    'wykonuję drugie i trzecie miareczkowanie',
    'kolejne oznaczenie',
    'trzykrotnie powtarzam',
    'następne próbki',
  ],
  odczyn_roztwor: [
    'do zlewki odważam 2 g mydła i dodaję 50 cm3 wody',
    'przygotowuję roztwór mydła w zlewce',
    'w zlewce rozpuszczam mydło w wodzie',
    'odwazam mydlo do zlewki',
    'mieszam bagietką mydło z wodą w zlewce',
  ],
  papierek: [
    'zanurzam papierek wskaźnikowy',
    'sprawdzam odczyn papierkiem',
    'mocze papierek uniwersalny w roztworze',
    'porównuję barwę papierka ze skalą',
    'badam pH papierkiem wskaźnikowym',
    'wkładam papierek do zlewki',
  ],
  odpady: [
    'przelewam mieszaniny poreakcyjne do pojemnika na odpady',
    'wylewam roztwory do pojemnika na odpady ciekłe',
    'zlewam wszystko do butelki na odpady',
    'utylizuję odpady',
    'opróżniam kolby do pojemnika na odpady',
  ],
  rozmontuj: ['rozmontowuję zestaw do miareczkowania', 'rozmontuj zestaw', 'demontuję biuretę ze statywu', 'rozkładam zestaw', 'rozbieram zestaw do miareczkowania'],
  myj: ['myję szkło', 'umyj kolby i zlewki', 'płuczę biuretę wodą destylowaną', 'myje szklo laboratoryjne', 'mycie szkła'],
  wylacz_wage: ['wyłączam wagę', 'wylaczam wage', 'wyłącz wagę', 'odłączam wagę'],
  stol: ['wycieram stół', 'sprzątam stanowisko', 'porządkuję stanowisko pracy', 'wytrzyj blat do sucha', 'osuszam stół'],
};

function stanPrzed(krokId: string): StanGry {
  const i = poziom.kroki.findIndex((k) => k.id === krokId);
  return { ...nowyStan(poziom.id), wykonane: poziom.kroki.slice(0, i).map((k) => k.id), bhp: ['fartuch', 'rekawice', 'okulary'] };
}

describe('warianty wpisów – poziom 1', () => {
  it('każdy krok ma warianty w teście', () => {
    expect(poziom.kroki.map((k) => k.id).filter((id) => !WARIANTY[id])).toEqual([]);
  });

  for (const [krokId, lista] of Object.entries(WARIANTY)) {
    for (const tekst of lista) {
      it(`${krokId}: „${tekst}”`, () => {
        const { przyjete, stan } = ocenWpis(poziom, stanPrzed(krokId), tekst, true);
        const odp = stan.dziennik.at(-1);
        expect(przyjete.map((k) => k.id), `${odp?.rodzaj}: ${odp?.komunikat}`).toContain(krokId);
      });
    }
  }
});

describe('BHP – różne zapisy', () => {
  const warianty = [
    'zakładam fartuch, rękawice i okulary ochronne',
    'zakladam fartuch rekawiczki gogle',
    'ubieram fartuch, zakładam gogle i rękawice nitrylowe',
    'fartuch, rękawice, okulary',
    'zakładam odzież ochronną, rękawice ochronne i okulary',
    'nakładam środki ochrony: fartuch, gogle, rękawice',
  ];
  for (const tekst of warianty) {
    it(`„${tekst}”`, () => {
      const { stan } = ocenWpis(poziom, nowyStan(poziom.id), tekst, true);
      expect(stan.bhp.sort()).toEqual(['fartuch', 'okulary', 'rekawice']);
    });
  }

  it('BHP po kolei, w osobnych wpisach', () => {
    let stan = nowyStan(poziom.id);
    for (const t of ['zakładam fartuch', 'zakładam rękawice', 'zakładam gogle']) stan = ocenWpis(poziom, stan, t, true).stan;
    expect(stan.bhp.length).toBe(3);
  });
});

describe('nie myli podobnych czynności', () => {
  it('zerowanie wagi to nie zerowanie biurety', () => {
    const { przyjete } = ocenWpis(poziom, stanPrzed('zero'), 'zeruję wagę', true);
    expect(przyjete.map((k) => k.id)).not.toContain('zero');
  });
  it('wyłączenie wagi to nie włączenie', () => {
    const { przyjete } = ocenWpis(poziom, stanPrzed('waga'), 'wyłączam wagę', true);
    expect(przyjete.map((k) => k.id)).not.toContain('waga');
  });
  it('rozmontowanie to nie montaż', () => {
    const { przyjete } = ocenWpis(poziom, nowyStan(poziom.id), 'rozmontowuję zestaw', true);
    expect(przyjete.map((k) => k.id)).not.toContain('montaz');
  });
  it('oranż do papierka? papierek to nie wskaźnik w kolbie', () => {
    const { przyjete } = ocenWpis(poziom, stanPrzed('oranz'), 'zanurzam papierek wskaźnikowy', true);
    expect(przyjete.map((k) => k.id)).not.toContain('oranz');
  });
});

describe('cały poziom – inne poprawne kolejności', () => {
  function graj(wpisy: string[]) {
    let stan = nowyStan(poziom.id);
    for (const w of wpisy) stan = ocenWpis(poziom, stan, w, true).stan;
    return stan;
  }

  it('odczyn najpierw, waga przed montażem, BHP razem z pierwszą czynnością', () => {
    const stan = graj([
      'zakładam fartuch, rękawice, gogle i włączam wagę',
      'do zlewki odważam 2 g mydła, dodaję 50 cm3 wody i mieszam bagietką',
      'zanurzam papierek wskaźnikowy i porównuję barwę ze skalą',
      'odważam 2 g mydła do kolby stożkowej, dodaję 100 cm3 wody i mieszam',
      'dodaję 3 krople oranżu',
      'montuję zestaw do miareczkowania',
      'napełniam biuretę HCl',
      'zdejmuję lejek, usuwam pęcherzyk powietrza i ustawiam menisk na zero',
      'zgłaszam gotowość',
      'miareczkuję do pomarańczowej barwy',
      'odczytuję objętość',
      'powtarzam jeszcze dwa razy',
      'wyłączam wagę',
      'przelewam roztwory do pojemnika na odpady',
      'rozmontowuję zestaw',
      'myję szkło',
      'wycieram stół',
    ]);
    const problemy = stan.dziennik.filter((d) => d.rodzaj !== 'ok' && d.rodzaj !== 'bhp').map((d) => `${d.tekstGracza} → ${d.komunikat}`);
    expect(problemy).toEqual([]);
    expect(stan.wykonane.length).toBe(poziom.kroki.length);
  });

  it('czynności spoza procedury nie są przyjmowane', () => {
    for (const t of ['otwieram okno', 'piję kawę', 'idę do domu', 'czytam instrukcję']) {
      expect(graj([t]).dziennik.at(-1)!.rodzaj).toBe('nie-rozpoznano');
    }
  });

  it('zdejmowanie rękawic w trakcie pracy to błąd', () => {
    const stan = graj(['zakładam fartuch, rękawice i gogle', 'zdejmuję rękawice']);
    expect(stan.dziennik.at(-1)!.rodzaj).toBe('blad');
    expect(stan.bhp).toContain('rekawice');
  });

  it('miareczkowanie bez wskaźnika – podpowiedź wskazuje brakujący krok', () => {
    const stan = graj([
      'zakładam fartuch, rękawice i gogle',
      'montuję zestaw', 'napełniam biuretę', 'zdejmuję lejek', 'usuwam pęcherzyk', 'ustawiam na zero', 'zgłaszam gotowość',
      'włączam wagę', 'odważam mydło do kolby', 'dodaję wodę', 'mieszam',
      'miareczkuję',
    ]);
    const ostatni = stan.dziennik.at(-1)!;
    expect(ostatni.rodzaj).toBe('za-wczesnie');
    expect(ostatni.wyjasnienie).toContain('oranż');
  });
});

describe('fałszywe alarmy', () => {
  it('„waga analityczna” to nie „kanalizacja”', () => {
    for (const t of ['odważyć około 2 gramy mydła na wadze analitycznej', 'odważam 2 g mydła do kolby na wadze analitycznej', 'analizuję próbkę']) {
      const { stan } = ocenWpis(poziom, stanPrzed('odwaz'), t, true);
      expect(stan.dziennik.at(-1)!.rodzaj, t).not.toBe('blad');
    }
  });
  it('odważyć około 2 gramy mydła – przyjęte', () => {
    const { przyjete } = ocenWpis(poziom, stanPrzed('odwaz'), 'odważyć około 2 gramy mydła', true);
    expect(przyjete.map((k) => k.id)).toContain('odwaz');
  });
});
