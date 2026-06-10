import React, { useState, useRef } from 'react';
import { Expense, Category } from '../types';

interface Props {
  categories: Category[];
  onImport: (expenses: Expense[]) => void;
}

interface CSVRow {
  [key: string]: string;
}

export default function ImportCSV({ categories, onImport }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ amount: '', description: '', date: '', category: '', notes: '' });
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.name || '');
  const [imported, setImported] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; rows: CSVRow[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('Plik CSV musi zawierać nagłówek i co najmniej jeden wiersz');
    const sep = text.includes(';') && !text.includes(',') ? ';' : ',';
    const hdrs = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''));
    const rws = lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/"/g, ''));
      const row: CSVRow = {};
      hdrs.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
    return { headers: hdrs, rows: rws };
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Wybierz plik CSV'); return; }
    setFileName(file.name);
    setError('');
    setImported(false);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const { headers: hdrs, rows: rws } = parseCSV(text);
        setHeaders(hdrs);
        setRows(rws);
        // Auto-detect columns
        const find = (keywords: string[]) => hdrs.find(h => keywords.some(k => h.toLowerCase().includes(k))) || '';
        setMapping({
          amount: find(['kwota', 'amount', 'suma', 'wartość', 'value', 'price']),
          description: find(['opis', 'description', 'tytuł', 'title', 'nazwa', 'name', 'merchant']),
          date: find(['data', 'date', 'dzień', 'day']),
          category: find(['kategoria', 'category', 'typ', 'type']),
          notes: find(['notatka', 'note', 'komentarz', 'comment']),
        });
      } catch (err: any) {
        setError(err.message || 'Błąd parsowania CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseAmount = (val: string): number => {
    const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
    return Math.abs(parseFloat(cleaned) || 0);
  };

  const parseDate = (val: string): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    // Try various formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2})/, // ISO
      /(\d{2})\.(\d{2})\.(\d{4})/, // Polish DD.MM.YYYY
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    ];
    for (const fmt of formats) {
      const m = val.match(fmt);
      if (m) {
        if (fmt === formats[0]) return `${m[1]}-${m[2]}-${m[3]}`;
        return `${m[3]}-${m[2]}-${m[1]}`;
      }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
  };

  const handleImport = () => {
    if (!mapping.amount || !mapping.description) {
      setError('Wybierz co najmniej kolumny: kwota i opis');
      return;
    }
    const catNames = categories.map(c => c.name);
    const newExpenses: Expense[] = rows
      .filter(row => parseAmount(row[mapping.amount]) > 0)
      .map(row => {
        const rowCat = mapping.category ? row[mapping.category] : '';
        const matchedCat = catNames.find(c => c.toLowerCase() === rowCat.toLowerCase()) || defaultCategory;
        return {
          id: crypto.randomUUID(),
          amount: parseAmount(row[mapping.amount]),
          description: (mapping.description ? row[mapping.description] : '') || 'Import CSV',
          category: matchedCat,
          date: parseDate(mapping.date ? row[mapping.date] : ''),
          notes: mapping.notes ? row[mapping.notes] || undefined : undefined,
        };
      });

    onImport(newExpenses);
    setImported(true);
    setRows([]);
    setHeaders([]);
    setFileName('');
  };

  const reset = () => {
    setRows([]); setHeaders([]); setFileName(''); setImported(false); setError('');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Import CSV</div>
        <div className="page-subtitle">Importuj historię transakcji z banku</div>
      </div>

      {imported ? (
        <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Import zakończony!</div>
          <div style={{ color: 'var(--text2)', marginBottom: 24 }}>Transakcje zostały dodane do Twojej historii</div>
          <button className="btn btn-primary" onClick={reset}>Importuj kolejny plik</button>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ maxWidth: 560 }}>
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <div className="drop-zone-icon">📥</div>
            <div className="drop-zone-title">Przeciągnij plik CSV lub kliknij</div>
            <div className="drop-zone-sub">Eksport z PKO, mBank, Santander, ING i innych</div>
          </div>
          {error && <div style={{ color: 'var(--danger)', marginTop: 12, fontSize: 14 }}>⚠️ {error}</div>}
          <input type="file" accept=".csv" ref={fileRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Wskazówki</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
              <div>• Eksportuj historię jako CSV z aplikacji bankowej</div>
              <div>• Separator: przecinek lub średnik</div>
              <div>• Kodowanie: UTF-8</div>
              <div>• Wymagane kolumny: kwota, opis transakcji</div>
              <div>• Opcjonalne: data, kategoria, notatki</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 760 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div className="section-title">Mapowanie kolumn</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                  📄 {fileName} · {rows.length} wierszy
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={reset}>Zmień plik</button>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 14 }}>⚠️ {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'amount', label: 'Kwota *', required: true },
                { key: 'description', label: 'Opis *', required: true },
                { key: 'date', label: 'Data', required: false },
                { key: 'category', label: 'Kategoria', required: false },
                { key: 'notes', label: 'Notatki', required: false },
              ].map(field => (
                <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{field.label}</label>
                  <select
                    className="form-select"
                    value={(mapping as any)[field.key]}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <option value="">— Nie mapuj —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Domyślna kategoria</label>
                <select className="form-select" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Podgląd (pierwsze 5 wierszy)</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    {headers.map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {headers.map(h => <td key={h} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="btn btn-primary" style={{ minWidth: 200 }} onClick={handleImport}>
            📥 Importuj {rows.length} transakcji
          </button>
        </div>
      )}
    </div>
  );
}
