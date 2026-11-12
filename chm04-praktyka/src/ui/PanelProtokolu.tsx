import type { Poziom } from '../silnik/typy';

/** Wyświetla treść zadania i procedury jak w arkuszu egzaminacyjnym. */
export function PanelProtokolu({ poziom }: { poziom: Poziom }) {
  return (
    <aside className="protokol">
      <div className="protokol-naglowek">
        <span className="znaczek">{poziom.zrodlo}</span>
        <h1>{poziom.tytul}</h1>
        <p className="metoda">{poziom.metoda}</p>
      </div>
      {poziom.protokol.map((sekcja) => (
        <section key={sekcja.tytul}>
          <h2>{sekcja.tytul}</h2>
          <Tresc tekst={sekcja.tresc} />
        </section>
      ))}
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
