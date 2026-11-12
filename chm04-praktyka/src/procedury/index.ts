// Automatycznie wczytuje wszystkie pliki *.json z tego folderu.
// Nowy poziom = nowy plik JSON (np. 02-ibuprofen.json) – bez zmian w kodzie.
import type { Poziom } from '../silnik/typy';

const pliki = import.meta.glob<{ default: Poziom }>('./*.json', { eager: true });

export const POZIOMY: Poziom[] = Object.entries(pliki)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, modul]) => modul.default);
