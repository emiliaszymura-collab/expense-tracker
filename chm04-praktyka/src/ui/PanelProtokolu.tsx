import { useEffect } from 'react';
import type { Poziom } from '../silnik/typy';

interface Props {
  poziom: Poziom;
  otwarty: boolean;
  onPrzelacz: (otwarty: boolean) => void;
}

/**
 * Protokół jako kartka leżąca na scenie: zwinięta to mała kartka w rogu,
 * po kliknięciu rozwija się na część ekranu, a laboratorium dalej widać obok.
 */
export function PanelProtokolu({ poziom, otwarty, onPrzelacz }: Props) {
  useEffect(() => {
    if (!otwarty) return;
    const klawisz = (e: KeyboardEvent) => e.key === 'Escape' && onPrzelacz(false);
    window.addEventListener('keydown', klawisz);
    return () => window.removeEventListener('keydown', klawisz);
  }, [otwarty, onPrzelacz]);

  if (!otwarty) {
    return (
      <button className="kartka-zwinieta" onClick={() => onPrzelacz(true)} aria-label="Otwórz protokół z arkusza">
        <span className="kartka-linie" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="kartka-podpis">Protokół</span>
      </button>
    );
  }

  return (
    <aside className="kartka" aria-label="Protokół z arkusza egzaminacyjnego">
      <header className="kartka-naglowek">
        <div>
          <span className="kartka-zrodlo">{poziom.zrodlo}</span>
          <h1>{poziom.tytul}</h1>
          <p className="metoda">{poziom.metoda}</p>
        </div>
        <button className="kartka-zwin" onClick={() => onPrzelacz(false)} aria-label="Zwiń protokół">
          Zwiń
        </button>
      </header>
      <div className="kartka-tresc">
        {poziom.protokol.map((sekcja) => (
          <section key={sekcja.tytul}>
            <h2>{sekcja.tytul}</h2>
            <Tresc tekst={sekcja.tresc} />
          </section>
        ))}
      </div>
    </aside>
  );
}

function Tresc({ tekst }: { tekst: string }) {
  const linie = tekst.split('\n');
  const bloki: JSX.Element[] = [];
  let lista: string[] = [];
  const zamknijListe = () => {
    if (lista.length) bloki.push(<ul key={`l${bloki.length}`}>{lista.map((l) => <li key={l}>{l}</li>)}</ul>);
    lista = [];
  };
  for (const linia of linie) {
    if (linia.startsWith('- ')) {
      lista.push(linia.slice(2));
      continue;
    }
    zamknijListe();
    if (/^[IVX]+\.\s/.test(linia)) bloki.push(<h3 key={bloki.length}>{linia}</h3>);
    else if (linia.includes(' = ') && linia.length < 60) bloki.push(<p key={bloki.length} className="wzor">{linia}</p>);
    else bloki.push(<p key={bloki.length}>{linia}</p>);
  }
  zamknijListe();
  return <>{bloki}</>;
}
