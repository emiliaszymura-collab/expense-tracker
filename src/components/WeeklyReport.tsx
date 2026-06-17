import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Expense } from '../types';
import { categorize, spendingOnly } from '../categorize';

interface Props { expenses: Expense[]; apiKey: string; }

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

function friendlyError(raw: string): string {
  const m = (raw || '').toLowerCase();
  if (/credit balance|billing|insufficient|quota/.test(m)) return '⚠️ Asystent AI jest chwilowo niedostępny. Spróbuj ponownie później.';
  if (/rate limit|overloaded|429|529/.test(m)) return '⚠️ Asystent AI jest teraz przeciążony. Spróbuj za chwilę.';
  if (/authentication|invalid.*api.?key|x-api-key|401|permission/.test(m)) return '⚠️ Problem z kluczem API — sprawdź klucz w ustawieniach.';
  return '⚠️ Asystent AI jest chwilowo niedostępny. Spróbuj ponownie później.';
}

// Monday-based key for caching the weekly report
function weekKey(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d.getTime() - day * 864e5);
  return `weeklyReport_${monday.toISOString().split('T')[0]}`;
}

export default function WeeklyReport({ expenses, apiKey }: Props) {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = localStorage.getItem(weekKey());
    if (cached) setReport(cached);
  }, []);

  // Compare last 7 days vs the 7 days before that, per category
  const comparison = useMemo(() => {
    const spend = spendingOnly(expenses);
    const now = Date.now();
    const inRange = (e: Expense, from: number, to: number) => {
      const t = new Date(e.date).getTime();
      return t >= from && t < to;
    };
    const thisWeek = spend.filter(e => inRange(e, now - 7 * 864e5, now + 864e5));
    const lastWeek = spend.filter(e => inRange(e, now - 14 * 864e5, now - 7 * 864e5));
    const byCat = (list: Expense[]) => {
      const m: Record<string, number> = {};
      list.forEach(e => { const c = categorize(e); m[c] = (m[c] || 0) + e.amount; });
      return m;
    };
    const a = byCat(thisWeek), b = byCat(lastWeek);
    const cats = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    const rows = cats.map(c => ({ cat: c, now: a[c] || 0, prev: b[c] || 0 }))
      .sort((x, y) => y.now - x.now);
    const totalNow = thisWeek.reduce((s, e) => s + e.amount, 0);
    const totalPrev = lastWeek.reduce((s, e) => s + e.amount, 0);
    return { rows, totalNow, totalPrev, count: thisWeek.length };
  }, [expenses]);

  const generate = async () => {
    if (!apiKey) { setError('⚠️ Dodaj klucz API Anthropic w ustawieniach, aby wygenerować raport.'); return; }
    setLoading(true); setError('');
    try {
      const lines = comparison.rows.slice(0, 8).map(r => {
        const diff = r.prev > 0 ? Math.round(((r.now - r.prev) / r.prev) * 100) : (r.now > 0 ? 100 : 0);
        return `- ${r.cat}: ${fmt(r.now)} (poprzednio ${fmt(r.prev)}, zmiana ${diff >= 0 ? '+' : ''}${diff}%)`;
      }).join('\n');
      const prompt = `Jesteś motywującym, konkretnym doradcą finansowym. Napiszesz KRÓTKI (4-6 zdań) raport tygodnia po polsku.

Dane (ostatnie 7 dni vs poprzednie 7 dni):
- Łącznie ten tydzień: ${fmt(comparison.totalNow)} (${comparison.count} transakcji)
- Łącznie poprzedni tydzień: ${fmt(comparison.totalPrev)}
Według kategorii:
${lines || 'brak danych'}

Zasady: ton motywujący ale szczery; użyj KONKRETNYCH liczb i % zmian; wskaż 1 rzecz, która poszła dobrze i 1 do poprawy; zakończ krótką zachętą. Bez nagłówków i list - płynny tekst.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        let raw = `status ${res.status}`;
        try { const e = await res.json(); raw = e.error?.message || e.error?.type || raw; } catch {}
        throw new Error(friendlyError(raw));
      }
      const data = await res.json();
      const text = (data.content[0].text || '').trim();
      setReport(text);
      localStorage.setItem(weekKey(), text);
    } catch (err: any) {
      setError(typeof err?.message === 'string' && err.message.startsWith('⚠️') ? err.message : '⚠️ Asystent AI jest chwilowo niedostępny. Spróbuj ponownie później.');
    } finally { setLoading(false); }
  };

  const trendUp = comparison.totalNow > comparison.totalPrev;
  const diffPct = comparison.totalPrev > 0 ? Math.round(((comparison.totalNow - comparison.totalPrev) / comparison.totalPrev) * 100) : null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div className="section-title">Raport tygodnia</div>
        <button className="btn btn-sm btn-primary" onClick={generate} disabled={loading}>
          {loading ? <span className="spinner" /> : (report ? 'Odśwież' : 'Wygeneruj')}
        </button>
      </div>

      {/* Quick numeric snapshot (always visible) */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: report || error ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ten tydzień</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(comparison.totalNow)}</div>
        </div>
        {diffPct != null && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>vs poprzedni</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: trendUp ? 'var(--danger)' : 'var(--success)' }}>
              {trendUp ? '▲' : '▼'} {Math.abs(diffPct)}%
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>{error}</div>}

      {report ? (
        <div className="md" style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)' }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown></div>
      ) : !error && (
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Kliknij „Wygeneruj", a AI przygotuje motywujące podsumowanie Twojego tygodnia z porównaniem do poprzedniego.</div>
      )}
    </div>
  );
}
