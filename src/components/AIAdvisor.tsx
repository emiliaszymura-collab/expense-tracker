import React, { useState, useRef, useEffect } from 'react';
import { Expense, Category, SavingsGoal } from '../types';
import { categorize, spendingOnly } from '../categorize';

// Map raw (English) API errors to a friendly Polish message; never expose technical/billing details.
function friendlyError(raw: string): string {
  const m = (raw || '').toLowerCase();
  if (/credit balance|billing|plans & billing|insufficient|quota/.test(m))
    return '⚠️ Asystent AI jest chwilowo niedostępny. Spróbuj ponownie później.';
  if (/rate limit|overloaded|too many|429|529/.test(m))
    return '⚠️ Asystent AI jest teraz przeciążony. Spróbuj za chwilę.';
  if (/authentication|invalid.*api.?key|x-api-key|401|permission/.test(m))
    return '⚠️ Problem z kluczem API — sprawdź klucz w ustawieniach.';
  return '⚠️ Asystent AI jest chwilowo niedostępny. Spróbuj ponownie później.';
}

interface Props {
  expenses: Expense[];
  categories: Category[];
  goals: SavingsGoal[];
  apiKey: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Na co wydaję najwięcej?',
  'Jak mogę zmniejszyć wydatki?',
  'Jakie mam nawyki finansowe?',
  'Czy jestem na dobrej drodze do celów?',
  'Stwórz plan oszczędnościowy',
];

function fmt(n: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

function buildContext(expenses: Expense[], categories: Category[], goals: SavingsGoal[]) {
  const now = new Date();
  const monthExp = spendingOnly(expenses).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);

  const byCat: Record<string, number> = {};
  monthExp.forEach(e => { const c = categorize(e); byCat[c] = (byCat[c] || 0) + e.amount; });

  const catSummary = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => `${cat}: ${fmt(total)}`)
    .join(', ');

  const goalSummary = goals
    .map(g => `${g.name}: ${fmt(g.current)}/${fmt(g.target)} (${Math.round((g.current / g.target) * 100)}%)`)
    .join('; ');

  return `Jesteś przyjaznym doradcą finansowym. Odpowiadaj po polsku, konkretnie i pomocnie.

Dane użytkownika (${now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}):
- Łączne wydatki: ${fmt(monthTotal)}
- Liczba transakcji: ${monthExp.length}
- Według kategorii: ${catSummary || 'brak danych'}
- Cele oszczędnościowe: ${goalSummary || 'brak celów'}
- Łączna historia: ${expenses.length} transakcji

Udzielaj konkretnych, spersonalizowanych porad na podstawie powyższych danych.`;
}

export default function AIAdvisor({ expenses, categories, goals, apiKey }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Cześć! Jestem Twoim AI doradcą finansowym 👋 Przeanalizowałem Twoje wydatki i jestem gotowy pomóc. Możesz mi zadać pytanie lub wybrać jedno z sugestii poniżej.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    if (!apiKey) { setError('Wprowadź klucz API Anthropic w panelu bocznym'); return; }

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const history = [...messages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

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
          max_tokens: 1024,
          system: buildContext(expenses, categories, goals),
          messages: history,
        }),
      });

      if (!res.ok) {
        let raw = `status ${res.status}`;
        try { const err = await res.json(); raw = err.error?.message || err.error?.type || raw; } catch {}
        throw new Error(friendlyError(raw));
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content[0].text }]);
    } catch (err: any) {
      // Network errors or thrown friendly messages — keep it user-friendly and Polish
      const msg = typeof err?.message === 'string' && err.message.startsWith('⚠️')
        ? err.message
        : '⚠️ Asystent AI jest chwilowo niedostępny. Spróbuj ponownie później.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">AI Doradca finansowy</div>
        <div className="page-subtitle">Powered by Claude · analizuje Twoje wydatki w czasie rzeczywistym</div>
      </div>

      <div className="card chat-container" style={{ maxWidth: 760 }}>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
              {m.role === 'assistant' && (
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  AI Doradca
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble chat-bubble-ai">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: 'var(--text2)',
                    animation: 'bounce 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                className="btn btn-secondary btn-sm"
                onClick={() => send(s)}
                disabled={loading}
                style={{ borderRadius: 20, fontSize: 13 }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-row">
          <input
            type="text"
            className="chat-input"
            placeholder="Zadaj pytanie o Twoje finanse..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
          >
            {loading ? <span className="spinner" /> : '↑'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
