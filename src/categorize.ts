import { Expense } from './types';

// Single source of truth for category colours/emoji used by charts and lists.
export const CATEGORY_COLORS: Record<string, string> = {
  Jedzenie: '#34c759',
  Transport: '#0071e3',
  Dom: '#ff9500',
  Zdrowie: '#ff3b30',
  Rozrywka: '#af52de',
  Zakupy: '#ff2d55',
  Edukacja: '#5ac8fa',
  Przelewy: '#5856d6',
  Ubezpieczenia: '#00c7be',
  Oszczędności: '#30d158',
  Inne: '#8e8e93',
};

export const CATEGORY_EMOJI: Record<string, string> = {
  Jedzenie: '🍔',
  Transport: '🚗',
  Dom: '🏠',
  Zdrowie: '💊',
  Rozrywka: '🎬',
  Zakupy: '🛍️',
  Edukacja: '📚',
  Przelewy: '💸',
  Ubezpieczenia: '🛡️',
  Oszczędności: '🐷',
  Inne: '💰',
};

// Ordered keyword rules — first match wins. Easy to extend.
export interface CatRule { keyword: RegExp; category: string; }
export const CATEGORY_RULES: CatRule[] = [
  { keyword: /smart\s*saver/i, category: 'Oszczędności' },
  { keyword: /składk|polis|ubezpiecz|\bpzu\b|warta|allianz|link4|nationale|generali/i, category: 'Ubezpieczenia' },
  { keyword: /przelew na telefon|\bblik\b|przelew własny|przelew przych|przelew wych|przelew zewn|przelew/i, category: 'Przelewy' },
  { keyword: /biedronka|lidl|żabka|zabka|kaufland|auchan|carrefour|netto|dino|aldi|stokrotka|spożyw|spozyw|rossmann|grocery|piekarni/i, category: 'Jedzenie' },
  { keyword: /mcdonald|kfc|burger|pizza|restaurac|kebab|sushi|glovo|pyszne|uber\s*eats|\bwolt\b|starbucks|costa|cukierni|bistro|\bbar\b/i, category: 'Jedzenie' },
  { keyword: /orlen|\bbp\b|shell|circle\s*k|lotos|moya|amic|paliwo|\buber\b|\bbolt\b|free\s*now|\bmpk\b|\bztm\b|\bpkp\b|intercity|flixbus|koleje|parking|taxi|taxify/i, category: 'Transport' },
  { keyword: /netflix|spotify|\bhbo\b|disney|youtube|cinema|\bkino\b|helios|multikino|steam|playstation|xbox|twitch|tidal|player\.pl/i, category: 'Rozrywka' },
  { keyword: /apteka|pharma|dr\.?\s*max|gemini|\bdoz\b|lekarz|przychodni|dental|medicover|lux\s*med|\benel\b|szpital|klinik/i, category: 'Zdrowie' },
  { keyword: /allegro|amazon|zalando|\bzara\b|h&m|reserved|sinsay|cropp|house|mohito|media\s*markt|rtv\s*euro|x-?kom|empik|\bikea\b|leroy|castorama|decathlon|sklep|\bshop\b/i, category: 'Zakupy' },
  { keyword: /czynsz|prąd|prad|energia|tauron|\bpge\b|\benea\b|\bgaz\b|pgnig|woda|internet|orange|t-?mobile|\bplay\b|\bplus\b|\bupc\b|vectra|netia|opłat|oplat|rachun/i, category: 'Dom' },
  { keyword: /szkoł|szkol|kurs|udemy|coursera|książk|ksiazk|edukac|uczeln|student/i, category: 'Edukacja' },
  // Generic card payment with no other signal → treat as shopping (sensible default, not "Inne")
  { keyword: /płatność kartą|platnosc karta|payment|card/i, category: 'Zakupy' },
];

const BANK_ID = /^(eb_|gc_|tink_)/;

export function isSavings(e: Expense): boolean {
  return e.category === 'Oszczędności' || /smart\s*saver/i.test(e.description || '');
}

// Derived category for display/aggregation. Recomputes for bank transactions
// (whose stored category is often "Inne"), but respects manual/scanned entries.
export function categorize(e: Expense): string {
  if (isSavings(e)) return 'Oszczędności';
  const isBank = BANK_ID.test(e.id);
  if (!isBank && e.category && CATEGORY_COLORS[e.category]) return e.category;
  const text = `${e.description || ''} ${e.notes || ''}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.keyword.test(text)) return rule.category;
  }
  if (e.category && e.category !== 'Inne' && CATEGORY_COLORS[e.category]) return e.category;
  return 'Inne';
}

export const catColor = (name: string): string => CATEGORY_COLORS[name] || '#8e8e93';
export const catEmoji = (name: string): string => CATEGORY_EMOJI[name] || '💰';

// Expenses that actually count as spending (savings transfers excluded).
export const spendingOnly = (expenses: Expense[]): Expense[] => expenses.filter(e => !isSavings(e));
export const savingsTotal = (expenses: Expense[]): number =>
  expenses.filter(isSavings).reduce((s, e) => s + e.amount, 0);

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);
