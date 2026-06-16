import { Expense } from './types';
import { isSavings } from './categorize';

export interface Subscription {
  name: string;
  amount: number;      // monthly amount
  yearly: number;      // amount * 12
  count: number;       // number of detected charges
  lastDate: string;
  monthsSinceLast: number;
  unused: boolean;     // no charge for 2+ months
}

// Known subscription brands → nicer grouping/naming
const BRANDS: Record<string, string> = {
  netflix: 'Netflix', spotify: 'Spotify', hbo: 'HBO Max', disney: 'Disney+',
  youtube: 'YouTube', amazon: 'Amazon', allegro: 'Allegro Smart', icloud: 'iCloud',
  apple: 'Apple', google: 'Google', microsoft: 'Microsoft', playstation: 'PlayStation',
  xbox: 'Xbox', canva: 'Canva', adobe: 'Adobe', dropbox: 'Dropbox', linkedin: 'LinkedIn',
  tidal: 'Tidal', audible: 'Audible', duolingo: 'Duolingo', openai: 'OpenAI',
  chatgpt: 'ChatGPT', storytel: 'Storytel', empik: 'Empik Go', nordvpn: 'NordVPN',
  player: 'Player', canal: 'Canal+', legimi: 'Legimi', revolut: 'Revolut',
};

function normalize(desc: string): string {
  return (desc || '')
    .toLowerCase()
    .replace(/płatność kartą|platnosc karta|przelew/gi, '')
    .replace(/[^a-ząćęłńóśźż ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keyAndName(desc: string): { key: string; name: string } {
  const norm = normalize(desc);
  for (const brand in BRANDS) {
    if (norm.includes(brand)) return { key: brand, name: BRANDS[brand] };
  }
  const words = norm.split(' ').filter(w => w.length >= 3).slice(0, 2);
  const key = words.join(' ') || norm || 'inne';
  const name = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { key, name };
}

function monthKey(date: string): string {
  return (date || '').slice(0, 7); // YYYY-MM
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// Detect recurring payments: same merchant + stable amount across ≥2 different months.
export function detectSubscriptions(expenses: Expense[]): Subscription[] {
  const groups: Record<string, { name: string; items: { amount: number; date: string }[] }> = {};
  for (const e of expenses) {
    if (isSavings(e)) continue;
    const { key, name } = keyAndName(e.description);
    if (!groups[key]) groups[key] = { name, items: [] };
    groups[key].items.push({ amount: e.amount, date: e.date });
  }

  const now = new Date();
  const subs: Subscription[] = [];

  for (const key in groups) {
    const g = groups[key];
    const months = new Set(g.items.map(i => monthKey(i.date)));
    if (months.size < 2) continue; // must recur across at least 2 months

    // Most common (rounded) amount = the subscription price
    const counts: Record<string, number> = {};
    g.items.forEach(i => { const r = Math.round(i.amount); counts[r] = (counts[r] || 0) + 1; });
    const dominant = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);

    // Require amount consistency: most charges close to the dominant price
    const consistent = g.items.filter(i => Math.abs(i.amount - dominant) <= Math.max(2, dominant * 0.15));
    if (consistent.length < 2 || new Set(consistent.map(i => monthKey(i.date))).size < 2) continue;

    const amount = consistent.reduce((s, i) => s + i.amount, 0) / consistent.length;
    const lastDate = consistent.map(i => i.date).sort().slice(-1)[0];
    const monthsSinceLast = monthsBetween(new Date(lastDate), now);

    subs.push({
      name: g.name,
      amount: Math.round(amount * 100) / 100,
      yearly: Math.round(amount * 12 * 100) / 100,
      count: consistent.length,
      lastDate,
      monthsSinceLast,
      unused: monthsSinceLast >= 2,
    });
  }

  return subs.sort((a, b) => b.amount - a.amount);
}

export function monthlyTotal(subs: Subscription[]): number {
  return subs.reduce((s, x) => s + x.amount, 0);
}
