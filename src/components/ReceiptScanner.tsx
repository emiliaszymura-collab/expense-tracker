import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Expense, Category } from '../types';
import { authHeader } from '../authToken';
import { ReceiptText } from '../icons';

interface Props {
  categories: Category[];
  onAdd: (expense: Expense) => void;
  apiKey: string;
}

interface ReceiptItem { name: string; price?: number }
interface ParsedReceipt {
  store: string;
  total: number;
  date: string;
  category: string;
  notes: string;
  items: ReceiptItem[];
}
interface SavedReceipt {
  id: string;
  store: string;
  date: string;
  total: number | null;
  items: ReceiptItem[];
  category?: string;
  notes?: string;
  image?: string;
}

const SERVER = process.env.REACT_APP_SERVER_URL || '';

function fmt(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
}

// Resize/compress so receipts stay small enough to store and OCR well
function resizeImage(dataUrl: string, maxDim = 1568, quality = 0.8): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function ReceiptScanner({ categories, onAdd, apiKey }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Archive
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState<SavedReceipt | null>(null);

  const loadReceipts = useCallback(async (q?: string) => {
    try {
      const url = `${SERVER}/api/receipts${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, { headers: { ...authHeader() } });
      const data = await res.json();
      if (res.ok) setReceipts(data.receipts || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);
  useEffect(() => {
    const t = setTimeout(() => loadReceipts(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query, loadReceipts]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Wybierz plik graficzny (JPG, PNG, HEIC)'); return; }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = async e => setImage(await resizeImage(e.target?.result as string));
    reader.readAsDataURL(file);
    setParsed(null); setError(''); setSaved('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Core Vision call — parse one receipt image into structured data
  const callVision = async (img: string): Promise<ParsedReceipt> => {
    const base64 = img.split(',')[1];
    const mediaType = img.split(';')[0].split(':')[1];
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
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: `Przeanalizuj ten paragon. Odpowiedz TYLKO w formacie JSON (bez markdown):
{"store": "nazwa sklepu", "total": 45.50, "date": "${today}", "category": "Jedzenie", "notes": "", "items": [{"name": "Mleko 2%", "price": 3.49}, {"name": "Chleb", "price": 4.20}]}

Zasady:
- "store": nazwa sklepu/firmy z paragonu
- "total": suma do zapłaty (liczba PLN)
- "date": data zakupu z paragonu (format YYYY-MM-DD); jeśli brak, użyj ${today}
- "category": jedna z: ${catNames}
- "items": lista WSZYSTKICH produktów z paragonu (nazwa + cena jeśli widoczna).
- "notes": dodatkowe info (np. nr paragonu) lub pusty string`,
            },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error('scan-failed');
    const data = await res.json();
    const text = (data.content[0].text || '').trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(text) as ParsedReceipt;
    result.items = Array.isArray(result.items) ? result.items : [];
    if (!result.date) result.date = today;
    if (!categories.find(c => c.name === result.category)) result.category = categories[0]?.name || 'Inne';
    return result;
  };

  const scanReceipt = async () => {
    if (!image) return;
    if (!apiKey) { setError('Wprowadź klucz API Anthropic w panelu (menu „Więcej")'); return; }
    setLoading(true); setError(''); setSaved('');
    try {
      setParsed(await callVision(image));
    } catch (err: any) {
      setError('⚠️ Nie udało się rozpoznać paragonu (sprawdź klucz API/środki lub spróbuj wyraźniejsze zdjęcie).');
    } finally { setLoading(false); }
  };

  // ── Batch scanning ──
  const batchRef = useRef<HTMLInputElement>(null);
  const [batch, setBatch] = useState<{ image: string; parsed?: ParsedReceipt; status: 'pending' | 'done' | 'error'; pick: boolean }[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  const handleBatchFiles = async (files: FileList) => {
    if (!apiKey) { setError('Wprowadź klucz API Anthropic w panelu (menu „Więcej")'); return; }
    setError(''); setSaved('');
    const imgs: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      const dataUrl = await new Promise<string>(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(f); });
      imgs.push(await resizeImage(dataUrl));
    }
    const initial: { image: string; parsed?: ParsedReceipt; status: 'pending' | 'done' | 'error'; pick: boolean }[] =
      imgs.map(image => ({ image, status: 'pending', pick: true }));
    setBatch(initial);
    setBatchRunning(true);
    const results = [...initial];
    for (let i = 0; i < results.length; i++) {
      try {
        const parsed = await callVision(results[i].image);
        results[i] = { ...results[i], parsed, status: 'done' };
      } catch {
        results[i] = { ...results[i], status: 'error' };
      }
      setBatch([...results]);
    }
    setBatchRunning(false);
  };

  const saveBatch = async () => {
    setSaving(true); setError('');
    let saved = 0;
    for (const b of batch) {
      if (!b.pick || b.status !== 'done' || !b.parsed) continue;
      try {
        await fetch(`${SERVER}/api/receipts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ ...b.parsed, image: b.image }),
        });
        onAdd({ id: crypto.randomUUID(), amount: b.parsed.total, category: b.parsed.category, description: b.parsed.store, date: b.parsed.date, notes: b.parsed.notes || undefined });
        saved++;
      } catch { /* skip */ }
    }
    setSaving(false);
    setBatch([]);
    setSaved(`✅ Zapisano ${saved} paragonów i dodano do wydatków!`);
    loadReceipts(query.trim());
  };

  const saveReceipt = async (alsoExpense: boolean) => {
    if (!parsed || !image) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${SERVER}/api/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...parsed, image }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Błąd zapisu'); }
      if (alsoExpense) {
        onAdd({
          id: crypto.randomUUID(),
          amount: parsed.total,
          category: parsed.category,
          description: parsed.store,
          date: parsed.date,
          notes: parsed.notes || undefined,
        });
      }
      setSaved(alsoExpense ? '✅ Paragon zapisany i dodany do wydatków!' : '✅ Paragon zapisany w archiwum!');
      setImage(null); setParsed(null); setImageName('');
      loadReceipts(query.trim());
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const openReceipt = async (id: string) => {
    try {
      const res = await fetch(`${SERVER}/api/receipts/${id}`, { headers: { ...authHeader() } });
      if (res.ok) setViewing(await res.json());
    } catch { /* ignore */ }
  };

  const deleteReceipt = async (id: string) => {
    try {
      await fetch(`${SERVER}/api/receipts/${id}`, { method: 'DELETE', headers: { ...authHeader() } });
      setViewing(null);
      loadReceipts(query.trim());
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Paragony</div>
        <div className="page-subtitle">Dodaj paragon i wyszukuj później po produkcie lub sklepie (np. pod gwarancję)</div>
      </div>

      {saved && (
        <div style={{ background: 'rgba(52,199,89,0.08)', color: 'var(--success)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontWeight: 500 }}>{saved}</div>
      )}

      {/* ── Add receipt ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Dodaj paragon</div>

        {!image ? (
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className="drop-zone-icon" style={{ color: 'var(--accent)' }}><ReceiptText size={40} strokeWidth={1.6} /></div>
            <div className="drop-zone-title">Zrób zdjęcie lub wybierz paragon</div>
            <div className="drop-zone-sub">JPG, PNG, HEIC</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
            <div>
              <img src={image} alt="paragon" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 12, background: 'var(--bg)' }} />
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)', textAlign: 'center', overflowWrap: 'anywhere' }}>{imageName}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                {!parsed && (
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={scanReceipt} disabled={loading}>
                    {loading ? <><span className="spinner" /> Skanowanie…</> : 'Skanuj paragon'}
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => { setImage(null); setParsed(null); setError(''); }} disabled={loading || saving}>Zmień</button>
              </div>
            </div>

            <div>
              {error && <div style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 12 }}>{error}</div>}
              {!parsed && !loading && !error && (
                <div className="empty-state" style={{ padding: '32px 12px' }}>
                  <div className="empty-state-icon" style={{ color: 'var(--text2)' }}><ReceiptText size={40} strokeWidth={1.5} /></div>
                  <div className="empty-state-sub">Kliknij „Skanuj", a AI odczyta sklep, datę i produkty</div>
                </div>
              )}
              {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}><div style={{ marginBottom: 12 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>Analizuję paragon…</div>}

              {parsed && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Sklep</label>
                    <input className="form-input" value={parsed.store} onChange={e => setParsed({ ...parsed, store: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Data</label>
                      <input className="form-input" type="date" value={parsed.date} onChange={e => setParsed({ ...parsed, date: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Suma (PLN)</label>
                      <input className="form-input" type="number" step="0.01" value={parsed.total} onChange={e => setParsed({ ...parsed, total: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: '4px 0 8px' }}>Produkty ({parsed.items.length})</div>
                  <div style={{ maxHeight: 160, overflowY: 'auto', background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', marginBottom: 14 }}>
                    {parsed.items.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text2)', padding: '8px 0' }}>Nie wykryto pozycji</div>
                    ) : parsed.items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '4px 0' }}>
                        <span style={{ overflowWrap: 'anywhere' }}>{it.name}</span>
                        {it.price != null && <span style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmt(it.price)}</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => saveReceipt(false)} disabled={saving}>{saving ? '…' : 'Zapisz paragon'}</button>
                    <button className="btn btn-secondary" onClick={() => saveReceipt(true)} disabled={saving}>Zapisz i dodaj jako wydatek</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {/* ── Batch scanning ── */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Skanowanie seryjne</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Wgraj wiele paragonów naraz — AI przetworzy wszystkie</div>
            </div>
            <button className="btn btn-secondary" onClick={() => batchRef.current?.click()} disabled={batchRunning || saving}>
              {batchRunning ? <><span className="spinner" /> Przetwarzanie…</> : 'Wybierz wiele zdjęć'}
            </button>
            <input type="file" accept="image/*" multiple ref={batchRef} style={{ display: 'none' }} onChange={e => e.target.files && e.target.files.length && handleBatchFiles(e.target.files)} />
          </div>

          {batch.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {batch.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>
                    <img src={b.image} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {b.status === 'pending' && <span style={{ color: 'var(--text2)', fontSize: 13 }}><span className="spinner" /> Skanowanie…</span>}
                      {b.status === 'error' && <span style={{ color: 'var(--danger)', fontSize: 13 }}>Nie rozpoznano</span>}
                      {b.status === 'done' && b.parsed && (
                        <>
                          <div style={{ fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere' }}>{b.parsed.store}</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fmt(b.parsed.total)} · {b.parsed.items.length} poz. · {b.parsed.date}</div>
                        </>
                      )}
                    </div>
                    {b.status === 'done' && (
                      <input type="checkbox" checked={b.pick} onChange={e => setBatch(prev => prev.map((x, j) => j === i ? { ...x, pick: e.target.checked } : x))} style={{ width: 18, height: 18 }} />
                    )}
                  </div>
                ))}
              </div>
              {!batchRunning && (
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={saveBatch} disabled={saving || !batch.some(b => b.pick && b.status === 'done')}>
                  {saving ? '…' : `Zapisz zaznaczone (${batch.filter(b => b.pick && b.status === 'done').length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Archive ── */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div className="section-title">Twoje paragony ({receipts.length})</div>
        </div>
        <input
          className="form-input"
          placeholder={'Szukaj po produkcie lub sklepie (np. lodówka, Media Markt)'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        {receipts.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 12px' }}>
            <div className="empty-state-icon" style={{ color: 'var(--text2)' }}><ReceiptText size={40} strokeWidth={1.5} /></div>
            <div className="empty-state-sub">{query ? 'Brak paragonów dla tego wyszukiwania' : 'Brak zapisanych paragonów — dodaj pierwszy powyżej'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {receipts.map(r => (
              <button key={r.id} onClick={() => openReceipt(r.id)} style={{ textAlign: 'left', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{r.store}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{fmt(r.total)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                  {new Date(r.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {r.items && r.items.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.items.slice(0, 3).map(i => i.name).join(', ')}{r.items.length > 3 ? '…' : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Receipt detail modal ── */}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 18, padding: 20, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{viewing.store}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(viewing.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })} · {fmt(viewing.total)}</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewing(null)}>✕</button>
            </div>
            {viewing.image && (
              <img src={viewing.image} alt="paragon" style={{ width: '100%', borderRadius: 12, margin: '12px 0', background: 'var(--bg)' }} />
            )}
            {viewing.items && viewing.items.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Produkty</div>
                {viewing.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ overflowWrap: 'anywhere' }}>{it.name}</span>
                    {it.price != null && <span style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmt(it.price)}</span>}
                  </div>
                ))}
              </div>
            )}
            {viewing.notes && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>{viewing.notes}</div>}
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => deleteReceipt(viewing.id)}>🗑 Usuń paragon</button>
          </div>
        </div>
      )}
    </div>
  );
}
