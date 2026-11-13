// Karta wyników – tabele jak w arkuszu, zbudowane z opisu w pliku poziomu (pole "karta").
// Wartości odczytuje się z wagi i biurety, obliczenia robi samodzielnie.
import { useState } from 'react';
import { ocenKarte, type Kryterium, type Odpowiedzi, type Pomiary } from '../silnik/karta';
import type { KartaSpec, Odczyt, PoleKarty } from '../silnik/typy';
import { Lupa } from './Lupa';

interface Props {
  spec: KartaSpec;
  pomiary: Pomiary;
  odpowiedzi: Odpowiedzi;
  onZmiana: (o: Odpowiedzi) => void;
  onZwin: () => void;
  /** W trybie egzaminu nie pokazujemy wskazówek do błędów. */
  podpowiedzi: boolean;
  /** Egzamin: karta oceniana dopiero po oddaniu pracy. */
  bezSprawdzania?: boolean;
}

const SKALA_PH = ['#d62828', '#e2452a', '#ee6c2c', '#f39c2f', '#f1c93b', '#c9d544', '#6fbf4a', '#35a26b', '#2a9a8f', '#2b78b5', '#3a55a4', '#4a3f98', '#5b2d8c', '#6a1f7a'];
const przecinek = (x: number, n: number) => x.toFixed(n).replace('.', ',');

/** Punkty pomiarowe pH = f(V) dla miareczkowania słabego kwasu mocną zasadą – jak tabela 1 w arkuszu z octem. */
const OBJETOSCI = [0, 2, 4, 6, 8, 10, 11, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 18, 20, 22, 24];

export function phKrzywej(v: number, vpk: number): number {
  if (v <= 0) return 2.9;
  if (v < vpk - 0.02) return Math.max(2.9, 4.76 + Math.log10(v / (vpk - v)));
  if (v <= vpk + 0.02) return 8.7;
  return Math.min(13, 14 + Math.log10(((v - vpk) * 0.25) / (100 + v)));
}

function Krzywa({ vpk }: { vpk: number }) {
  const W = 300;
  const H = 210;
  const x = (v: number) => 34 + (v / 24) * (W - 44);
  const y = (ph: number) => H - 34 - (ph / 14) * (H - 52);
  const punkty = OBJETOSCI.map((v) => [v, phKrzywej(v, vpk)] as const);
  return (
    <figure className="lupa krzywa">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wyniki pomiarów pH w funkcji objętości NaOH">
        <rect width={W} height={H} fill="#fbfbf7" />
        {Array.from({ length: 25 }, (_, i) => (
          <line key={`x${i}`} x1={x(i)} x2={x(i)} y1={y(0)} y2={y(14)} stroke={i % 2 ? '#eceae0' : '#d9d6c8'} strokeWidth="1" />
        ))}
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`y${i}`} x1={x(0)} x2={x(24)} y1={y(i)} y2={y(i)} stroke={i % 2 ? '#eceae0' : '#d9d6c8'} strokeWidth="1" />
        ))}
        {[0, 4, 8, 12, 16, 20, 24].map((v) => (
          <text key={v} x={x(v)} y={H - 21} textAnchor="middle" fontSize="10" fill="#23303a">{v}</text>
        ))}
        {[0, 2, 4, 6, 8, 10, 12, 14].map((ph) => (
          <text key={ph} x={28} y={y(ph) + 3} textAnchor="end" fontSize="10" fill="#23303a">{ph}</text>
        ))}
        <text x={W / 2} y={H - 5} textAnchor="middle" fontSize="10" fill="#5f6b73">V NaOH [cm³]</text>
        <text x={30} y={10} textAnchor="end" fontSize="10" fill="#5f6b73">pH</text>
        {punkty.map(([v, ph]) => (
          <circle key={v} cx={x(v)} cy={y(ph)} r="2.6" fill="#0f766e" />
        ))}
      </svg>
      <table className="tabela tabela-ph">
        <tbody>
          <tr>
            <th>V [cm³]</th>
            {punkty.map(([v]) => (
              <td key={v}>{String(v).replace('.', ',')}</td>
            ))}
          </tr>
          <tr>
            <th>pH</th>
            {punkty.map(([v, ph]) => (
              <td key={v}>{ph.toFixed(1).replace('.', ',')}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </figure>
  );
}

function WidokOdczytu({ o, p }: { o: Odczyt; p: Pomiary }) {
  if (o.typ === 'info')
    return (
      <div className="odczyt odczyt-info">
        <span>{o.etykieta}</span>
        <strong>{o.tekst}</strong>
      </div>
    );
  if (o.typ === 'krzywa')
    return (
      <div className="odczyt odczyt-szeroki">
        <Krzywa vpk={p[o.id]} />
        <span>{o.etykieta}</span>
      </div>
    );
  if (o.typ === 'biureta')
    return (
      <div className="odczyt">
        <Lupa v={p[o.id]} />
        <span>{o.etykieta}</span>
      </div>
    );
  if (o.typ === 'papierek') {
    const ph = Math.round(Math.min(14, Math.max(1, p[o.id])));
    return (
      <div className="odczyt odczyt-szeroki">
        <div className="papierek-podglad">
          <span className="pasek" style={{ background: SKALA_PH[ph - 1] }} aria-label="Papierek wskaźnikowy po zanurzeniu" />
          <div className="skala-ph" aria-label="Skala barw pH od 1 do 14">
            {SKALA_PH.map((c, i) => (
              <span key={c} style={{ background: c }}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <span>{o.etykieta}</span>
      </div>
    );
  }
  return (
    <div className="odczyt">
      <div className="lcd">
        {przecinek(p[o.id], o.miejsca)} {o.jednostka}
      </div>
      <span>{o.etykieta}</span>
    </div>
  );
}

export function Karta({ spec, pomiary, odpowiedzi, onZmiana, onZwin, podpowiedzi, bezSprawdzania = false }: Props) {
  const [wynik, setWynik] = useState<Kryterium[] | null>(null);
  const pole = (id: string, etykieta: string, szer = 'sr') => (
    <input
      id={`karta-${id}`}
      className={`pole pole-${szer}`}
      value={odpowiedzi[id] ?? ''}
      aria-label={etykieta}
      autoComplete="off"
      onChange={(e) => {
        onZmiana({ ...odpowiedzi, [id]: e.target.value });
        setWynik(null);
      }}
    />
  );
  const wiersz = (p: PoleKarty) => (
    <p className="wiersz" key={p.id}>
      {p.etykieta} {pole(p.id, p.etykieta, p.szer)} {p.jednostka}
    </p>
  );
  const punkty = wynik?.filter((k) => k.ok).length ?? 0;

  return (
    <aside className="kartka kartka-karta" aria-label="Karta wyników">
      <header className="kartka-naglowek">
        <div>
          <span className="kartka-zrodlo">Dokumentacja z badań</span>
          <h1>{spec.tytul}</h1>
        </div>
        <button className="kartka-zwin" onClick={onZwin}>
          Zwiń
        </button>
      </header>
      <div className="kartka-tresc">
        <h2>Odczyty z aparatury</h2>
        <p className="drobne">Przepisz wartości do tabeli. Objętość z biurety odczytaj na dolnym menisku (dokładność 0,05 cm³).</p>
        <div className="odczyty">
          {spec.odczyty.map((o, i) => (
            <WidokOdczytu key={i} o={o} p={pomiary} />
          ))}
        </div>

        {spec.sekcje.map((s) => (
          <section key={s.tytul}>
            <h2>{s.tytul}</h2>
            {s.opis && <p className="drobne">{s.opis}</p>}
            {s.tabela && (
              <div className="tabela-przewin">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Nr</th>
                      {s.tabela.kolumny.map((k) => (
                        <th key={k.pole}>{k.naglowek}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: s.tabela.wiersze }, (_, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        {s.tabela!.kolumny.map((k) => (
                          <td key={k.pole}>{pole(k.pole.replace('{i}', String(i + 1)), `${k.naglowek}, wiersz ${i + 1}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.pola?.map(wiersz)}
          </section>
        ))}

        {spec.brudnopis && (
          <details className="brudnopis">
            <summary>Brudnopis – obliczenia proporcjami</summary>
            {spec.brudnopis.map((l, i) =>
              l.startsWith('~') ? (
                <span className="proporcja" key={i}>
                  {l.slice(1).split(' | ').map((w, j) => (
                    <span key={j}>
                      {w}
                      <br />
                    </span>
                  ))}
                </span>
              ) : (
                <p className="drobne" key={i}>
                  {l}
                </p>
              ),
            )}
            <textarea
              id="karta-notatki"
              aria-label="Miejsce na własne obliczenia"
              placeholder="Miejsce na własne obliczenia (nie podlega ocenie)"
              value={odpowiedzi.notatki ?? ''}
              onChange={(e) => onZmiana({ ...odpowiedzi, notatki: e.target.value })}
            />
          </details>
        )}

        {bezSprawdzania ? (
          <p className="drobne">Egzamin: kartę oceni egzaminator po oddaniu pracy (przycisk „Zakończ egzamin”).</p>
        ) : (
          <button className="sprawdz" onClick={() => setWynik(ocenKarte(spec, pomiary, odpowiedzi))}>
            Sprawdź kartę
          </button>
        )}
        {wynik && (
          <div className="wynik-karty" role="status">
            <strong>
              Wynik: {punkty} / {wynik.length} kryteriów
            </strong>
            <ul>
              {wynik.map((k, i) => (
                <li key={i} className={k.ok ? 'kr-ok' : 'kr-zle'}>
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
