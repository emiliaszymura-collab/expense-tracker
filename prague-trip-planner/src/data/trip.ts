import type { Category, ExtraCost, Location } from '../types'

export const CATEGORY_LABELS: Record<Category, string> = {
  sleep: 'Nocleg',
  shower: 'Prysznic',
  sightseeing: 'Zwiedzanie',
  club: 'Klub',
  food: 'Jedzenie',
  parking: 'Parking',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  sleep: '#3b82f6',
  shower: '#14b8a6',
  sightseeing: '#22c55e',
  club: '#a855f7',
  food: '#f97316',
  parking: '#64748b',
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  sleep: '🛏️',
  shower: '🚿',
  sightseeing: '📸',
  club: '🎶',
  food: '🍽️',
  parking: '🅿️',
}

// Realne dane z researchu. Kolejność w tablicy = kolejność zwiedzania w danym dniu.
export const LOCATIONS: Location[] = [
  // ---------- DZIEŃ 1 ----------
  {
    id: 'pr-holesovice',
    name: 'P+R Holešovice (parking)',
    category: 'parking',
    lat: 50.1089,
    lng: 14.4412,
    cost: { amount: 100, currency: 'CZK', note: '100 CZK/doba + 20 CZK/h' },
    openHours: '24/7',
    time: '08:00',
    notes:
      'Parking Park & Ride przy stacji metra C Nádraží Holešovice (~100 m). Monitoring, całodobowy. Zostawiamy auto tutaj na całą wycieczkę.',
    day: 1,
  },
  {
    id: 'john-reed',
    name: 'JOHN REED Fitness (prysznic)',
    category: 'shower',
    lat: 50.0755,
    lng: 14.4183,
    cost: { amount: 350, currency: 'CZK', note: '350 CZK / dzień (day pass)' },
    openHours: '07:00–21:00',
    time: '08:45',
    notes:
      'Prysznic i odświeżenie po nocy w aucie. Tańsza alternatywa: YMCA przy Nám. Republiky ~150–200 CZK.',
    day: 1,
  },
  {
    id: 'old-town-square',
    name: 'Rynek Starego Miasta',
    category: 'sightseeing',
    lat: 50.0875,
    lng: 14.4208,
    cost: { amount: 0, currency: 'CZK', note: 'Wstęp wolny' },
    openHours: '24/7',
    time: '10:00',
    notes:
      'Orloj (zegar astronomiczny) — pełna godzina = pokaz apostołów. Kościół Marii Panny przed Týnem.',
    day: 1,
  },
  {
    id: 'charles-bridge',
    name: 'Most Karola',
    category: 'sightseeing',
    lat: 50.0865,
    lng: 14.4114,
    cost: { amount: 0, currency: 'CZK', note: 'Wstęp wolny' },
    openHours: '24/7',
    time: '11:30',
    notes: 'Najlepiej rano, mniej tłumów. Widok na Hradczany. Figura św. Jana Nepomucena.',
    day: 1,
  },
  {
    id: 'prague-castle',
    name: 'Zamek Praski (Hradczany)',
    category: 'sightseeing',
    lat: 50.0911,
    lng: 14.4016,
    cost: { amount: 250, currency: 'CZK', note: 'Trasa zwiedzania od ~250 CZK' },
    openHours: '09:00–17:00',
    time: '13:00',
    notes: 'Katedra św. Wita, Złota Uliczka. Zmiana warty co godzinę.',
    day: 1,
  },
  {
    id: 'cross-club',
    name: 'Cross Club',
    category: 'club',
    lat: 50.1082,
    lng: 14.4433,
    cost: { amount: 150, currency: 'CZK', note: 'Wstęp ~100–200 CZK (zależnie od line-upu)' },
    openHours: 'do 05:00',
    time: '22:00',
    notes:
      '3 poziomy, industrialny wystrój. ~100 m od parkingu P+R Holešovice — wracamy pieszo do auta.',
    day: 1,
  },

  // ---------- DZIEŃ 2 ----------
  {
    id: 'john-reed-2',
    name: 'JOHN REED Fitness (prysznic)',
    category: 'shower',
    lat: 50.0755,
    lng: 14.4183,
    cost: { amount: 350, currency: 'CZK', note: '350 CZK / dzień (day pass)' },
    openHours: '07:00–21:00',
    time: '09:30',
    notes: 'Poranny prysznic drugiego dnia.',
    day: 2,
  },
  {
    id: 'vysehrad',
    name: 'Vyšehrad',
    category: 'sightseeing',
    lat: 50.0642,
    lng: 14.4189,
    cost: { amount: 0, currency: 'CZK', note: 'Teren wolny; bazylika/kazamaty płatne' },
    openHours: '09:30–18:00',
    time: '11:00',
    notes:
      'Bazylika św. Piotra i Pawła, cmentarz z grobami sławnych Czechów, panorama Wełtawy. Spokojniej niż Stare Miasto.',
    day: 2,
  },
  {
    id: 'zizkov-tower',
    name: 'Wieża telewizyjna Žižkov',
    category: 'sightseeing',
    lat: 50.0811,
    lng: 14.4512,
    cost: { amount: 300, currency: 'CZK', note: 'Taras widokowy ~300 CZK' },
    openHours: '09:00–24:00',
    time: '14:00',
    notes: 'Rzeźby pełzających dzieci (David Černý). Taras widokowy 93 m — panorama całej Pragi.',
    day: 2,
  },
]

// Pozycje kosztowe niepokazywane na mapie (wbudowane, edytowalne przez usera).
export const BUILTIN_EXTRA_COSTS: ExtraCost[] = [
  { id: 'vignette', label: 'Winieta CZ (10-dniowa)', amount: 300, currency: 'CZK', builtIn: true },
]
