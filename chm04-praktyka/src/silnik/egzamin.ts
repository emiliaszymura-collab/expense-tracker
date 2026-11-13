// Tryb egzaminu: limit czasu i punktacja końcowa jak na części praktycznej (próg 75%).
import { ocenKarte } from './karta';
import type { StanGry } from './gra';
import type { Poziom } from './typy';

export const PROG = 75;

export interface WynikEgzaminu {
  przebieg: { pkt: number; max: number };
  bhp: { pkt: number; max: number };
  karta: { pkt: number; max: number; nieSpelnione: string[] };
  procent: number;
  zdany: boolean;
}

/**
 * Przebieg: każdy wykonany krok = 1 pkt, każdy błąd (pominięty krok, praca bez BHP, błąd typowy) −1 pkt.
 * BHP: po 1 pkt za fartuch, rękawice i okulary. Karta: 1 pkt za każde spełnione kryterium z zasad oceniania.
 */
export function ocenEgzamin(poziom: Poziom, stan: StanGry): WynikEgzaminu {
  const maxP = poziom.kroki.length;
  const przebieg = { pkt: Math.max(0, stan.wykonane.length - stan.bledy), max: maxP };
  const bhp = { pkt: stan.bhp.length, max: 3 };
  const kryteria = poziom.karta && stan.pomiary ? ocenKarte(poziom.karta, stan.pomiary, stan.karta ?? {}) : [];
  const karta = { pkt: kryteria.filter((k) => k.ok).length, max: kryteria.length, nieSpelnione: kryteria.filter((k) => !k.ok).map((k) => k.opis) };
  const suma = przebieg.pkt + bhp.pkt + karta.pkt;
  const max = przebieg.max + bhp.max + karta.max;
  const procent = Math.round((suma / max) * 100);
  return { przebieg, bhp, karta, procent, zdany: procent >= PROG };
}

export function pozostaloMs(poziom: Poziom, stan: StanGry, teraz = Date.now()): number {
  if (!stan.start) return poziom.czasMinut * 60000;
  return Math.max(0, stan.start + poziom.czasMinut * 60000 - teraz);
}

export function formatCzasu(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sek).padStart(2, '0')}`;
}
