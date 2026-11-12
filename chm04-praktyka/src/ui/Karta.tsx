// Karta wyników – jak tabele 2 i 3 w arkuszu. Wartości odczytuje się z wagi i biurety, obliczenia robi samodzielnie.
import { useState } from 'react';
import { ocenKarte, type Kryterium, type Odpowiedzi } from '../silnik/karta';
import type { Pomiary } from '../silnik/pomiary';
import { Lupa } from './Lupa';

interface Props {
  pomiary: Pomiary;
  odpowiedzi: Odpowiedzi;
  onZmiana: (o: Odpowiedzi) => void;
  onZwin: () => void;
  /** W trybie egzaminu nie pokazujemy wskazówek do błędów. */
  podpowiedzi: boolean;
}

const SKALA_PH = ['#d62828', '#e2452a', '#ee6c2c', '#f39c2f', '#f1c93b', '#c9d544', '#6fbf4a', '#35a26b', '#2a9a8f', '#2b78b5', '#3a55a4', '#4a3f98', '#5b2d8c', '#6a1f7a'];
const przecinek = (x: number, n: number) => x.toFixed(n).replace('.', ',');

export function Karta({ pomiary, odpowiedzi, onZmiana, onZwin, podpowiedzi }: Props) {
  const [wynik, setWynik] = useState<Kryterium[] | null>(null);
  const pole = (id: string, etykieta: string, szer = 'sr') => (
    <input
      id={`karta-${id}`}
      className={`pole pole-${szer}`}
      value={odpowiedzi[id] ?? ''}
      aria-label={etykieta}
      inputMode={/^(m|v|vd|x|ph)/.test(id) ? 'decimal' : 'text'}
      autoComplete="off"
      onChange={(e) => {
        onZmiana({ ...odpowiedzi, [id]: e.target.value });
        setWynik(null);
      }}
    />
  );
  const punkty = wynik?.filter((k) => k.ok).length ?? 0;

  return (
    <aside className="kartka kartka-karta" aria-label="Karta wyników">
      <header className="kartka-naglowek">
        <div>
          <span className="kartka-zrodlo">Tabela 2 i 3 – dokumentacja z badań</span>
          <h1>Karta wyników</h1>
        </div>
        <button className="kartka-zwin" onClick={onZwin}>
          Zwiń
        </button>
      </header>
      <div className="kartka-tresc">
        <h2>Odczyty z aparatury</h2>
        <p className="drobne">Przepisz wartości do tabeli. Objętość odczytaj na dolnym menisku (dokładność 0,05 cm³).</p>
        <div className="odczyty">
          {pomiary.m.map((m, i) => (
            <div key={i} className="odczyt">
              <div className="lcd">{przecinek(m, 2)} g</div>
              <Lupa v={pomiary.v[i]} />
              <span>Próbka {i + 1}</span>
            </div>
          ))}
        </div>

        <h2>Wyniki oznaczenia zawartości NaOH</h2>
        <div className="tabela-przewin">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nr</th>
                <th>Masa próbki [g]</th>
                <th>V titranta [cm³]</th>
                <th>V titranta [dm³]</th>
                <th>X [%]</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td>{i}</td>
                  <td>{pole(`m${i}`, `Masa próbki ${i} w gramach`)}</td>
                  <td>{pole(`v${i}`, `Objętość titranta ${i} w cm³`)}</td>
                  <td>{pole(`vd${i}`, `Objętość titranta ${i} w dm³`)}</td>
                  <td>{pole(`x${i}`, `Zawartość NaOH w próbce ${i} w procentach`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wiersz">
          Zawartość NaOH w mydle (średnia) X = {pole('xsr', 'Średnia zawartość NaOH w procentach')} %
        </p>

        <details className="brudnopis">
          <summary>Brudnopis – obliczenia proporcjami</summary>
          <p className="drobne">Stężenie HCl: 0,01 mol/dm³. Masa molowa NaOH: 40 g/mol. HCl i NaOH reagują 1 : 1.</p>
          <ol>
            <li>
              Zamiana jednostek:
              <span className="proporcja">1000 cm³ — 1 dm³<br />V cm³ — x dm³</span>
            </li>
            <li>
              Liczba moli HCl:
              <span className="proporcja">1 dm³ roztworu — 0,01 mol HCl<br />V dm³ — n mol HCl</span>
            </li>
            <li>Z równania reakcji: n NaOH = n HCl.</li>
            <li>
              Masa NaOH:
              <span className="proporcja">1 mol NaOH — 40 g<br />n mol — a g</span>
            </li>
            <li>
              Zawartość procentowa:
              <span className="proporcja">m próbki [g] — 100%<br />a [g] — X%</span>
            </li>
          </ol>
          <p className="drobne">
            Przykład na innych liczbach: V = 3,00 cm³ = 0,00300 dm³ → n = 0,00003 mol → a = 0,0012 g → dla m = 2,00 g: X = 0,06%.
          </p>
          <textarea
            id="karta-notatki"
            aria-label="Miejsce na własne obliczenia"
            placeholder="Miejsce na własne obliczenia (nie podlega ocenie)"
            value={odpowiedzi.notatki ?? ''}
            onChange={(e) => onZmiana({ ...odpowiedzi, notatki: e.target.value })}
          />
        </details>

        <h2>Wyniki badania odczynu</h2>
        <div className="papierek-podglad">
          <span className="pasek" style={{ background: SKALA_PH[pomiary.ph - 1] }} aria-label="Papierek wskaźnikowy po zanurzeniu" />
          <div className="skala-ph" aria-label="Skala barw pH od 1 do 14">
            {SKALA_PH.map((c, i) => (
              <span key={c} style={{ background: c }}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <p className="wiersz">Zabarwienie papierka: {pole('barwa', 'Zabarwienie papierka wskaźnikowego', 'dl')}</p>
        <p className="wiersz">Przybliżona wartość pH (0–14): {pole('ph', 'Przybliżona wartość pH', 'kr')}</p>
        <p className="wiersz">Odczyn (kwasowy / obojętny / zasadowy): {pole('odczyn', 'Odczyn roztworu', 'dl')}</p>

        <h2>Równanie reakcji podczas miareczkowania</h2>
        <p className="wiersz">1. Cząsteczkowo: {pole('r1', 'Równanie w formie cząsteczkowej', 'max')}</p>
        <p className="wiersz">2. Jonowo (pełne): {pole('r2', 'Równanie w formie jonowej pełnej', 'max')}</p>
        <p className="wiersz">3. Jonowo (skrócone): {pole('r3', 'Równanie w formie jonowej skróconej', 'max')}</p>
        <p className="drobne">Strzałkę możesz zapisać jako -&gt; albo =, ładunki jako + i -.</p>

        <button className="sprawdz" onClick={() => setWynik(ocenKarte(pomiary, odpowiedzi))}>
          Sprawdź kartę
        </button>
        {wynik && (
          <div className="wynik-karty" role="status">
            <strong>
              Wynik: {punkty} / {wynik.length} kryteriów
            </strong>
            <ul>
              {wynik.map((k) => (
                <li key={k.id} className={k.ok ? 'kr-ok' : 'kr-zle'}>
                  <span aria-hidden="true">{k.ok ? '✓' : '✗'}</span> {k.opis}
                  {!k.ok && podpowiedzi && k.uwaga && <em> — {k.uwaga}</em>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
