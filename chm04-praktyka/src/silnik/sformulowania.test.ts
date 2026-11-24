// Różne naturalne sformułowania tych samych czynności – drobna różnica w słowach nie może zmieniać wyniku.
import { describe, expect, it } from 'vitest';
import { nowyStan, ocenWpis, wymaganiaKroku } from './gra';
import type { Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);

const WPISY: Record<string, string[]> = {
  stol: ['umyj blat', 'myję blat', 'umycie blatu', 'wytrzyj stół', 'wycieram blat', 'osuszam blat', 'osuszenie blatu', 'przecieram stół', 'sprzątam stanowisko', 'porządkuję stanowisko pracy', 'czyszczę blat', 'wyczyść stół', 'przetarcie blatu', 'myję stanowisko'],
  myj: ['myję szkło', 'umyj szkło', 'płuczę naczynia', 'mycie szkła laboratoryjnego', 'umyj kolby', 'myję naczynia'],
  odpady: ['przelewam do odpadów', 'wylewam mieszaniny do pojemnika na odpady', 'odpady do pojemnika', 'zlewam roztwory do pojemnika na odpady ciekłe'],
  wylacz_wage: ['wyłączam wagę', 'wyłącz wagę', 'wyłączenie wagi'],
  waga: ['włączam wagę', 'włącz wagę i wytaruj', 'uruchamiam wagę', 'taruję wagę'],
  rozmontuj: ['rozmontowuję zestaw', 'demontuję zestaw do miareczkowania', 'rozkładam zestaw'],
};

/** Stan, w którym krok jest dostępny: wszystkie jego wymagania (rekurencyjnie) wykonane. */
function stanDla(poziom: Poziom, id: string) {
  const potrzebne = new Set<string>();
  const dodaj = (k: string) => {
    for (const w of wymaganiaKroku(poziom, poziom.kroki.find((x) => x.id === k)!)) if (!potrzebne.has(w)) (potrzebne.add(w), dodaj(w));
  };
  dodaj(id);
  return { ...nowyStan(poziom.id), wykonane: [...potrzebne], bhp: ['fartuch', 'rekawice', 'okulary'] as ('fartuch' | 'rekawice' | 'okulary')[] };
}

for (const [id, wpisy] of Object.entries(WPISY))
  describe.each(poziomy.filter((p) => p.kroki.some((k) => k.id === id)).map((p) => [p.id, p] as const))(`${id} – %s`, (_, poziom) => {
    const stan = stanDla(poziom, id);
    for (const w of wpisy)
      it(`„${w}”`, () => {
        const r = ocenWpis(poziom, stan, w, true);
        expect(r.przyjete.map((k) => k.id), `${r.stan.dziennik.at(-1)?.rodzaj}: ${r.stan.dziennik.at(-1)?.komunikat}`).toEqual([id]);
      });
  });

describe('nierozpoznany wpis nie odbiera punktów na egzaminie', () => {
  it('bledy bez zmian', () => {
    const p = poziomy[0];
    const r = ocenWpis(p, nowyStan(p.id), 'blablabla coś tam', false);
    expect(r.stan.bledy).toBe(0);
  });
});

// Czynności przy przyrządach – sformułowania, jakie piszą uczniowie.
const PRZYRZADY: Record<string, Record<string, string[]>> = {
  '09-refraktometria': {
    pryzmat1: ['myję pryzmat', 'przemywam pryzmaty wodą destylowaną', 'osuszam pryzmat bibułą', 'otwieram pryzmaty i przemywam je', 'czyszczę pryzmat refraktometru'],
    zero: ['nanoszę wodę destylowaną na pryzmat', 'sprawdzam refraktometr wodą destylowaną', 'mierzę nD wody'],
    pomiar_wz: ['mierzę wzorzec', 'nanoszę wzorzec na pryzmat', 'odczytuję nD wzorca'],
    sok: ['nanoszę sok na pryzmat', 'nakraplam 3 krople soku', 'nanoszę próbkę bagietką'],
    granica: ['ustawiam granicę światła i cienia', 'ustawiam granicę na przecięciu nici', 'kręcę pokrętłem kompensatora', 'patrzę w okular i ustawiam ostrość granicy'],
    odczyt: ['odczytuję współczynnik załamania', 'odczytuję nD i temperaturę', 'odczytuję wynik ze skali', 'zapisuję współczynnik refrakcji'],
    pryzmat2: ['myję pryzmaty po pomiarze', 'osuszam pryzmat bibułą', 'przemywam pryzmat wodą'],
  },
  '10-polarymetria': {
    lampa: ['włączam lampę sodową', 'włączam polarymetr', 'uruchamiam polarymetr'],
    rurka_woda: ['napełniam rurkę wodą destylowaną', 'nalewam wodę do rurki'],
    zero: ['zeruję polarymetr', 'ustawiam zero na wodzie'],
    odczyt: ['odczytuję kąt skręcenia', 'mierzę kąt skręcenia', 'odczytuję wynik z noniusza'],
  },
  '11-spektrofotometria': {
    fala: ['włączam spektrofotometr', 'ustawiam długość fali 480 nm'],
    slepa: ['zeruję na ślepej próbie', 'wyzerowanie spektrofotometru na ślepej próbie'],
    pomiar_wz: ['mierzę absorbancję wzorców', 'odczytuję absorbancję wzorców'],
    odczyt: ['mierzę absorbancję próbki', 'odczytuję absorbancję próbki'],
  },
};

for (const [pid, kroki] of Object.entries(PRZYRZADY)) {
  const poziom = poziomy.find((p) => p.id === pid)!;
  describe(`przyrząd – ${pid}`, () => {
    for (const [id, wpisy] of Object.entries(kroki)) {
      const stan = stanDla(poziom, id);
      for (const w of wpisy)
        it(`${id}: „${w}”`, () => {
          const r = ocenWpis(poziom, stan, w, true);
          expect(r.przyjete.map((k) => k.id), `${r.stan.dziennik.at(-1)?.rodzaj}: ${r.stan.dziennik.at(-1)?.komunikat}`).toContain(id);
        });
    }
  });
}
