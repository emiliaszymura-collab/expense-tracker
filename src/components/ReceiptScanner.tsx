import React, { useState, useRef } from 'react';
import { Expense, Category } from '../types';

interface Props {
  categories: Category[];
  onAdd: (expense: Expense) => void;
  apiKey: string;
}

interface ParsedReceipt {
  amount: number;
  description: string;
  category: string;
  date: string;
  notes: string;
}

export default function ReceiptScanner({ categories, onAdd, apiKey }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Wybierz plik graficzny (JPG, PNG, HEIC)');
      return;
    }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = e => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
    setParsed(null);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const scanReceipt = async () => {
    if (!image) return;
    if (!apiKey) { setError('Wprowadź klucz API Anthropic w panelu bocznym'); return; }
    setLoading(true);
    setError('');
    try {
      const base64 = image.split(',')[1];
      const mediaType = image.split(';')[0].split(':')[1];
      const catNames = categories.map(c => c.name).join(', ');
      const today = new Date().toISOString().split('T')[0];

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
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: `Przeanalizuj ten paragon i wyodrębnij dane. Odpowiedz TYLKO w formacie JSON (bez markdown), np.:
{"amount": 45.50, "description": "Biedronka", "category": "Jedzenie", "date": "${today}", "notes": "zakupy spożywcze"}

Dostępne kategorie: ${catNames}
Wybierz najlepiej pasującą kategorię.
Jeśli data nie jest widoczna, użyj dzisiejszej: ${today}
Kwotę podaj jako liczbę w PLN.`,
              },
            ],
          }],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Błąd API: ${res.status}`);
      }

      const data = await res.json();
      const text = data.content[0].text.trim();
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(jsonText) as ParsedReceipt;
      if (!categories.find(c => c.name === result.category)) {
        result.category = categories[0]?.name || 'Inne';
      }
      setParsed(result);
    } catch (err: any) {
      setError(err.message || 'Błąd podczas skanowania paragonu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!parsed) return;
    onAdd({
      id: crypto.randomUUID(),
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date: parsed.date,
      notes: parsed.notes || undefined,
    });
  };

  const getCatEmoji = (name: string) => categories.find(c => c.name === name)?.emoji || '🧾';
  const getCatColor = (name: string) => categories.find(c => c.name === name)?.color || '#8e8e93';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Skanuj paragon</div>
        <div className="page-subtitle">AI automatycznie rozpozna kwotę i kategorię</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 860 }}>
        {/* Upload */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Zdjęcie paragonu</div>

          {!image ? (
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="drop-zone-icon">📷</div>
              <div className="drop-zone-title">Przeciągnij lub kliknij</div>
              <div className="drop-zone-sub">JPG, PNG, HEIC · maks. 10 MB</div>
            </div>
          ) : (
            <div>
              <img
                src={image}
                alt="paragon"
                style={{ width: '100%', maxHeight: 340, objectFit: 'contain', borderRadius: 12, background: 'var(--bg)' }}
              />
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>{imageName}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={scanReceipt} disabled={loading}>
                  {loading ? <><span className="spinner" /> Skanowanie...</> : '🔍 Skanuj paragon'}
                </button>
                <button className="btn btn-secondary" onClick={() => { setImage(null); setParsed(null); setError(''); }} disabled={loading}>
                  Zmień
                </button>
              </div>
            </div>
          )}

          <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Result */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Wynik skanowania</div>

          {error && (
            <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '14px 16px', fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {!parsed && !error && !loading && (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <div className="empty-state-icon">🧾</div>
              <div className="empty-state-title">Brak wyników</div>
              <div className="empty-state-sub">Prześlij zdjęcie paragonu i kliknij „Skanuj"</div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Analizuję paragon...</div>
              <div style={{ color: 'var(--text2)', fontSize: 14 }}>AI rozpoznaje dane</div>
            </div>
          )}

          {parsed && (
            <div>
              <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div className="emoji" style={{ width: 52, height: 52, borderRadius: 14, background: `${getCatColor(parsed.category)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                    {getCatEmoji(parsed.category)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{parsed.amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</div>
                    <div style={{ color: 'var(--text2)', fontSize: 14 }}>{parsed.description}</div>
                  </div>
                </div>

                {[
                  { label: 'Kategoria', value: `${getCatEmoji(parsed.category)} ${parsed.category}` },
                  { label: 'Data', value: new Date(parsed.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  ...(parsed.notes ? [{ label: 'Notatki', value: parsed.notes }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                    <span style={{ fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Editable fields */}
              <div className="form-group">
                <label className="form-label">Opis</label>
                <input className="form-input" value={parsed.description} onChange={e => setParsed({ ...parsed, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Kategoria</label>
                <select className="form-select" value={parsed.category} onChange={e => setParsed({ ...parsed, category: e.target.value })}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kwota (PLN)</label>
                <input className="form-input" type="number" step="0.01" value={parsed.amount} onChange={e => setParsed({ ...parsed, amount: parseFloat(e.target.value) })} />
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>
                ✓ Zapisz wydatek
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
