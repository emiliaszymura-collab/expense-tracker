// Zapis postępu w localStorage. Każdy dostęp w try/catch – w trybie prywatnym storage może nie działać.
import type { StanGry } from './silnik/gra';

const KLUCZ = 'chm04-praktyka:postep:v1';

type Postep = Record<string, StanGry>;

function wczytajWszystko(): Postep {
  try {
    const surowe = localStorage.getItem(KLUCZ);
    return surowe ? (JSON.parse(surowe) as Postep) : {};
  } catch {
    return {};
  }
}

export function wczytajStan(poziomId: string): StanGry | undefined {
  return wczytajWszystko()[poziomId];
}

export function zapiszStan(stan: StanGry): void {
  try {
    const wszystko = wczytajWszystko();
    wszystko[stan.poziomId] = stan;
    localStorage.setItem(KLUCZ, JSON.stringify(wszystko));
  } catch {
    /* brak dostępu do storage – gra działa dalej bez zapisu */
  }
}

export function usunStan(poziomId: string): void {
  try {
    const wszystko = wczytajWszystko();
    delete wszystko[poziomId];
    localStorage.setItem(KLUCZ, JSON.stringify(wszystko));
  } catch {
    /* ignoruj */
  }
}
