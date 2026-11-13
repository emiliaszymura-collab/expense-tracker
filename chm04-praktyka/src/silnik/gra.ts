// Logika rozgrywki: ocena wpisu gracza względem procedury poziomu.
import { frazaPasuje, grupaPasuje, tokeny } from './dopasowanie';
import type { Odpowiedzi, Pomiary } from './karta';
import type { ElementBhp, Krok, Poziom } from './typy';

export interface StanGry {
  poziomId: string;
  wykonane: string[];
  bhp: ElementBhp[];
  /** Ile razy gracz próbował zrobić krok za wcześnie / bez BHP (do punktacji w etapie 5). */
  bledy: number;
  /** Ile razy gracz poprosił o podpowiedź. */
  podpowiedzi?: number;
  /** Wyniki pomiarów wylosowane dla tego podejścia. */
  pomiary?: Pomiary;
  /** Wpisy gracza w karcie wyników. */
  karta?: Odpowiedzi;
  /** Tryb rozgrywki. */
  tryb?: 'cwiczenie' | 'egzamin';
  /** Początek egzaminu (ms od 1970) – do odliczania czasu. */
  start?: number;
  /** Egzamin zakończony (oddany albo koniec czasu). */
  zakonczony?: boolean;
  dziennik: WpisDziennika[];
}

export type RodzajWpisu = 'ok' | 'bhp' | 'za-wczesnie' | 'brak-bhp' | 'blad' | 'nie-rozpoznano' | 'juz-zrobione' | 'podpowiedz';

export interface WpisDziennika {
  rodzaj: RodzajWpisu;
  tekstGracza: string;
  komunikat: string;
  wyjasnienie?: string;
  krokId?: string;
}

export interface WynikOceny {
  stan: StanGry;
  /** Kroki przyjęte w tym wpisie (w kolejności) – dla animacji. */
  przyjete: Krok[];
}

export const WSZYSTKIE_BHP: ElementBhp[] = ['fartuch', 'rekawice', 'okulary'];

const SLOWA_BHP: Record<ElementBhp, string[]> = {
  fartuch: ['fartuch', 'odziez ochronn', 'ubranie ochronn', 'kitel'],
  rekawice: ['rekawic', 'rekawiczk'],
  okulary: ['okular', 'gogle', 'gogli', 'ochrone oczu', 'ochrona oczu'],
};

const NAZWY_BHP: Record<ElementBhp, string> = {
  fartuch: 'fartuch ochronny',
  rekawice: 'rękawice ochronne',
  okulary: 'okulary ochronne (gogle)',
};

const SLOWA_ZAKLADANIA = ['zaloz', 'zakladam', 'ubier', 'nakladam', 'naloz', 'wkladam', 'wloz', 'zakladac', 'zalozyc', 'nosz', 'mam na sobie'];

export function nowyStan(poziomId: string): StanGry {
  return { poziomId, wykonane: [], bhp: [], bledy: 0, dziennik: [] };
}

/** Kroki, które muszą być wykonane przed danym krokiem. */
export function wymaganiaKroku(poziom: Poziom, krok: Krok): string[] {
  if (krok.wymaga) return krok.wymaga;
  const i = poziom.kroki.findIndex((k) => k.id === krok.id);
  return i > 0 ? [poziom.kroki[i - 1].id] : [];
}

export function krokPasuje(krok: Krok, wpis: string[]): boolean {
  if (krok.wykluczajace?.some((w) => frazaPasuje(w, wpis, false))) return false;
  return krok.wymagane.every((grupa) => grupaPasuje(grupa, wpis));
}

/** Pierwszy niewykonany krok, którego wymagania są spełnione – "co teraz?". */
export function nastepnyKrok(poziom: Poziom, wykonane: string[]): Krok | undefined {
  return poziom.kroki.find(
    (k) => !wykonane.includes(k.id) && wymaganiaKroku(poziom, k).every((w) => wykonane.includes(w)),
  );
}

function brakujaceBhp(stan: StanGry): ElementBhp[] {
  return WSZYSTKIE_BHP.filter((b) => !stan.bhp.includes(b));
}

function nazwaKroku(poziom: Poziom, id: string): Krok {
  return poziom.kroki.find((k) => k.id === id)!;
}

export function ocenWpis(poziom: Poziom, stanWejsciowy: StanGry, tekst: string, trybCwiczenia: boolean): WynikOceny {
  const wpis = tokeny(tekst);
  const stan: StanGry = { ...stanWejsciowy, wykonane: [...stanWejsciowy.wykonane], bhp: [...stanWejsciowy.bhp], dziennik: [...stanWejsciowy.dziennik] };
  const przyjete: Krok[] = [];
  const dodaj = (w: WpisDziennika) => stan.dziennik.push(w);

  if (wpis.length === 0) return { stan, przyjete };

  // 1. Typowe błędy (np. odpady do zlewu) – zawsze sygnalizowane.
  for (const b of poziom.bledy ?? []) {
    // Błędy rozpoznajemy tylko po dokładnych słowach – lepiej przepuścić błąd z literówką,
    // niż zarzucić graczowi coś, czego nie napisał.
    const rozmyte = false;
    if (b.wykluczajace?.some((s) => frazaPasuje(s, wpis, false))) continue;
    if (b.slowa.every((s) => frazaPasuje(s, wpis, rozmyte))) {
      stan.bledy++;
      dodaj({ rodzaj: 'blad', tekstGracza: tekst, komunikat: b.komunikat });
      return { stan, przyjete };
    }
  }

  // 2. Środki ochrony indywidualnej.
  const zakladanie = SLOWA_ZAKLADANIA.some((s) => frazaPasuje(s, wpis));
  const wymienioneBhp = WSZYSTKIE_BHP.filter((b) => SLOWA_BHP[b].some((s) => frazaPasuje(s, wpis)));
  const zdejmowanie = ['zdejm', 'sciag', 'bez'].some((s) => frazaPasuje(s, wpis, false));
  const bylyBhp = wymienioneBhp.length > 0 && !zdejmowanie && (zakladanie || wpis.length <= 4);
  if (bylyBhp) {
    const nowe = wymienioneBhp.filter((b) => !stan.bhp.includes(b));
    stan.bhp.push(...nowe);
    const brak = brakujaceBhp(stan);
    dodaj({
      rodzaj: 'bhp',
      tekstGracza: tekst,
      komunikat:
        nowe.length > 0
          ? `Założono: ${nowe.map((b) => NAZWY_BHP[b]).join(', ')}.` +
            (brak.length > 0 ? ` Brakuje jeszcze: ${brak.map((b) => NAZWY_BHP[b]).join(', ')}.` : ' Komplet środków ochrony.')
          : 'Te środki ochrony masz już na sobie.',
    });
  } else if (wymienioneBhp.length > 0 && zdejmowanie) {
    stan.bledy++;
    dodaj({
      rodzaj: 'blad',
      tekstGracza: tekst,
      komunikat: 'Środków ochrony nie zdejmuje się w trakcie pracy z odczynnikami – fartuch, rękawice i okulary nosisz do końca porządkowania stanowiska.',
    });
    return { stan, przyjete };
  }

  // 3. Kroki procedury. Jeden wpis może opisywać kilka czynności ("dodaję wodę i mieszam"),
  //    także razem ze środkami ochrony ("zakładam fartuch i montuję zestaw").
  const dopasowane = poziom.kroki.filter((k) => krokPasuje(k, wpis));

  if (dopasowane.length === 0 && bylyBhp) return { stan, przyjete };

  if (dopasowane.length === 0) {
    stan.bledy += trybCwiczenia ? 0 : 1;
    const nastepny = nastepnyKrok(poziom, stan.wykonane);
    dodaj({
      rodzaj: 'nie-rozpoznano',
      tekstGracza: tekst,
      komunikat: 'Nie rozpoznaję tej czynności w tej procedurze.',
      wyjasnienie: trybCwiczenia && nastepny ? `Podpowiedź: ${nastepny.podpowiedz}` : undefined,
    });
    return { stan, przyjete };
  }

  let zmiana = true;
  const doZrobienia = dopasowane.filter((k) => !stan.wykonane.includes(k.id));
  // Przyjmujemy kroki po kolei, dopóki któryś odblokowuje następny.
  while (zmiana) {
    zmiana = false;
    for (const krok of doZrobienia) {
      if (stan.wykonane.includes(krok.id)) continue;
      const wymagania = wymaganiaKroku(poziom, krok);
      if (!wymagania.every((w) => stan.wykonane.includes(w))) continue;
      if (krok.wymagaBhp && brakujaceBhp(stan).length > 0) continue;
      stan.wykonane.push(krok.id);
      przyjete.push(krok);
      dodaj({ rodzaj: 'ok', tekstGracza: tekst, komunikat: krok.opis, krokId: krok.id });
      zmiana = true;
    }
  }

  if (przyjete.length > 0) return { stan, przyjete };

  // Nic nie przyjęto – wyjaśniamy dlaczego, na podstawie pierwszego dopasowanego kroku.
  const juzZrobione = dopasowane.filter((k) => stan.wykonane.includes(k.id));
  const zablokowany = doZrobienia[0];
  if (!zablokowany) {
    dodaj({ rodzaj: 'juz-zrobione', tekstGracza: tekst, komunikat: `To już zrobione: ${juzZrobione[0].opis}` });
    return { stan, przyjete };
  }

  stan.bledy++;
  const brakKrokow = wymaganiaKroku(poziom, zablokowany).filter((w) => !stan.wykonane.includes(w));
  if (brakKrokow.length > 0) {
    const pierwszy = nastepnyKrok(poziom, stan.wykonane) ?? nazwaKroku(poziom, brakKrokow[0]);
    dodaj({
      rodzaj: 'za-wczesnie',
      tekstGracza: tekst,
      komunikat: 'Za wcześnie – pominięto wcześniejszy krok.',
      wyjasnienie: trybCwiczenia ? `Najpierw: ${pierwszy.podpowiedz} ${pierwszy.dlaczego}` : undefined,
      krokId: zablokowany.id,
    });
  } else {
    const brak = brakujaceBhp(stan);
    dodaj({
      rodzaj: 'brak-bhp',
      tekstGracza: tekst,
      komunikat: `Stop! Pracujesz z odczynnikami bez: ${brak.map((b) => NAZWY_BHP[b]).join(', ')}.`,
      wyjasnienie:
        'Na egzaminie egzaminator ocenia osobnym kryterium, czy przez cały czas pracujesz w fartuchu, rękawicach i okularach ochronnych. Najpierw je załóż.',
      krokId: zablokowany.id,
    });
  }
  return { stan, przyjete };
}

export function poziomUkonczony(poziom: Poziom, stan: StanGry): boolean {
  return poziom.kroki.every((k) => stan.wykonane.includes(k.id));
}

/** Stan sceny 3D wynikający z wykonanych kroków (pola stanSceny scalone po kolei). */
export function stanSceny(poziom: Poziom, stan: StanGry): Record<string, string | number | boolean> {
  const wynik: Record<string, string | number | boolean> = {};
  for (const id of stan.wykonane) {
    Object.assign(wynik, poziom.kroki.find((k) => k.id === id)?.stanSceny ?? {});
  }
  for (const b of stan.bhp) wynik[`bhp_${b}`] = true;
  return wynik;
}

/** Podpowiedź na żądanie (tryb ćwiczenia): co zrobić teraz i dlaczego. */
export function dodajPodpowiedz(poziom: Poziom, stan: StanGry, tekstGracza = 'Podpowiedź', egzamin = false): StanGry {
  const brak = brakujaceBhp(stan);
  const krok = nastepnyKrok(poziom, stan.wykonane);
  const wpis: WpisDziennika =
    brak.length > 0
      ? {
          rodzaj: 'podpowiedz',
          tekstGracza,
          komunikat: `Załóż środki ochrony: ${brak.map((b) => NAZWY_BHP[b]).join(', ')}.`,
          wyjasnienie: 'Środki ochrony indywidualnej są ocenianym kryterium w każdym arkuszu CHM.04.',
        }
      : krok
        ? { rodzaj: 'podpowiedz', tekstGracza, komunikat: krok.podpowiedz, wyjasnienie: krok.dlaczego }
        : { rodzaj: 'podpowiedz', tekstGracza, komunikat: 'Wszystkie kroki wykonane.' };
  if (egzamin) wpis.komunikat = `${wpis.komunikat} (podpowiedź: −1 pkt)`;
  return { ...stan, podpowiedzi: (stan.podpowiedzi ?? 0) + 1, dziennik: [...stan.dziennik, wpis] };
}

/** Czy wpis to prośba o pomoc („nie wiem”, „pomóż mi”, „podpowiedź”, „co teraz?”). */
export function prosiOPomoc(tekst: string): boolean {
  const t = tokeny(tekst).join(' ');
  return /(^| )(pomoc|pomoz|pomóz|podpowiedz|podpowiedź|podpowiedzi|help|hint)/.test(t) || /nie wiem|co (teraz|dalej|mam)|co robic|jak dalej/.test(t);
}
