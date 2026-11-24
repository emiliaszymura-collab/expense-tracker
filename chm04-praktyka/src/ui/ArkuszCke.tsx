import { useEffect } from 'react';
import type { Poziom } from '../silnik/typy';

/** Cały oryginalny arkusz egzaminacyjny CKE – wszystkie strony z tabelami, tak jak na egzaminie. */
export function ArkuszCke({ poziom, onZamknij }: { poziom: Poziom; onZamknij: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onZamknij();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onZamknij]);
  const n = poziom.arkuszStron ?? 0;
  const nr = (i: number) => (n >= 10 ? String(i).padStart(2, '0') : String(i));
  return (
    <div className="arkusz-cke" role="dialog" aria-label="Arkusz egzaminacyjny CKE">
      <div className="arkusz-cke-pasek">
        <strong>Arkusz CKE – {poziom.zrodlo}</strong>
        <button onClick={onZamknij}>Zamknij</button>
      </div>
      <div className="arkusz-cke-strony">
        {Array.from({ length: n }, (_, i) => (
          <img key={i} src={`zasoby/arkusze/${poziom.id}/s-${nr(i + 1)}.jpg`} alt={`Strona ${i + 1} z ${n}`} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
