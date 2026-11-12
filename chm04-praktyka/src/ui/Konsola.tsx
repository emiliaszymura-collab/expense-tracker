import { useEffect, useRef, useState } from 'react';
import type { StanGry, WpisDziennika } from '../silnik/gra';
import { WSZYSTKIE_BHP } from '../silnik/gra';
import type { ElementBhp } from '../silnik/typy';

const IKONY: Record<WpisDziennika['rodzaj'], string> = {
  ok: '✓',
  bhp: '🛡',
  'za-wczesnie': '⏭',
  'brak-bhp': '⚠',
  blad: '✗',
  'nie-rozpoznano': '?',
  'juz-zrobione': '↺',
  podpowiedz: '💡',
};

const ETYKIETY_BHP: Record<ElementBhp, string> = { fartuch: 'Fartuch', rekawice: 'Rękawice', okulary: 'Okulary' };

interface Props {
  stan: StanGry;
  liczbaKrokow: number;
  ukonczony: boolean;
  onWpis: (tekst: string) => void;
  onPodpowiedz: () => void;
}

export function Konsola({ stan, liczbaKrokow, ukonczony, onWpis, onPodpowiedz }: Props) {
  const [tekst, setTekst] = useState('');
  const dziennikRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dziennikRef.current?.scrollTo({ top: dziennikRef.current.scrollHeight, behavior: 'smooth' });
  }, [stan.dziennik.length]);

  const wyslij = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tekst.trim()) return;
    onWpis(tekst.trim());
    setTekst('');
  };

  const procent = Math.round((stan.wykonane.length / liczbaKrokow) * 100);

  return (
    <div className="konsola">
      <div className="pasek-stanu">
        <div className="postep" aria-label={`Postęp ${procent}%`}>
          <div className="postep-wypelnienie" style={{ width: `${procent}%` }} />
          <span>
            Kroki: {stan.wykonane.length}/{liczbaKrokow}
          </span>
        </div>
        <div className="bhp">
          {WSZYSTKIE_BHP.map((b) => (
            <span key={b} className={stan.bhp.includes(b) ? 'bhp-ok' : 'bhp-brak'}>
              {ETYKIETY_BHP[b]}
            </span>
          ))}
        </div>
      </div>

      <div className="dziennik" ref={dziennikRef}>
        {stan.dziennik.length === 0 && (
          <p className="pusty">
            Kliknij kartkę „Protokół” w rogu laboratorium, przeczytaj procedurę i wpisz, co robisz – np. „zakładam fartuch, rękawice i okulary” albo „montuję zestaw
            do miareczkowania”.
          </p>
        )}
        {stan.dziennik.map((w, i) => (
          <div key={i} className={`wpis wpis-${w.rodzaj}`}>
            <div className="wpis-gracz">› {w.tekstGracza}</div>
            <div className="wpis-odp">
              <span className="ikona">{IKONY[w.rodzaj]}</span> {w.komunikat}
            </div>
            {w.wyjasnienie && <div className="wpis-wyjasnienie">{w.wyjasnienie}</div>}
          </div>
        ))}
        {ukonczony && (
          <div className="wpis wpis-koniec">
            <div>Procedura wykonana – wszystkie {liczbaKrokow} kroki.</div>
            <div className="podsumowanie">
              Błędy i pominięte kroki: <strong>{stan.bledy}</strong> · Podpowiedzi: <strong>{stan.podpowiedzi ?? 0}</strong>
            </div>
            <div className="podsumowanie">
              {stan.bledy === 0 && (stan.podpowiedzi ?? 0) === 0
                ? 'Bezbłędnie i bez podpowiedzi – tak jak na egzaminie.'
                : 'Spróbuj jeszcze raz („Od nowa”), aż przejdziesz bez błędów i podpowiedzi.'}
            </div>
          </div>
        )}
      </div>

      <form className="wpisz" onSubmit={wyslij}>
        <input
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Co teraz robisz?"
          aria-label="Opisz czynność"
          autoFocus
          disabled={ukonczony}
        />
        <button type="submit" disabled={ukonczony}>
          Wykonaj
        </button>
        <button type="button" className="drugorzedny" onClick={onPodpowiedz} disabled={ukonczony} aria-label="Podpowiedź">
          <span className="tylko-szeroki">Podpowiedź</span>
          <span className="tylko-waski" aria-hidden="true">?</span>
        </button>
      </form>
    </div>
  );
}
