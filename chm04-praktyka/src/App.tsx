import { useEffect, useMemo, useState } from 'react';
import { formatCzasu, ocenEgzamin, PROG, pozostaloMs } from './silnik/egzamin';
import { POZIOMY } from './procedury';
import { usunStan, wczytajStan, zapiszStan } from './postep';
import { Laboratorium } from './scena/Laboratorium';
import { dodajPodpowiedz, nowyStan, ocenWpis, poziomUkonczony, prosiOPomoc, type StanGry } from './silnik/gra';
import type { Poziom } from './silnik/typy';
import { losujPomiary } from './silnik/karta';
import { Karta } from './ui/Karta';
import { Konsola } from './ui/Konsola';
import { Lupa } from './ui/Lupa';
import { PanelProtokolu } from './ui/PanelProtokolu';

export default function App() {
  const [wybor, setWybor] = useState<{ id: string; tryb: Tryb } | null>(null);
  const poziom = POZIOMY.find((p) => p.id === wybor?.id);

  if (!poziom || !wybor) return <WyborPoziomu onWybierz={(id, tryb) => setWybor({ id, tryb })} />;
  return <Gra key={`${poziom.id}-${wybor.tryb}`} poziom={poziom} tryb={wybor.tryb} onWyjdz={() => setWybor(null)} />;
}

type Tryb = 'cwiczenie' | 'egzamin';

function WyborPoziomu({ onWybierz }: { onWybierz: (id: string, tryb: Tryb) => void }) {
  return (
    <main className="start">
      <header>
        <p className="znaczek">Technik analityk · CHM.04 · podstawa 2019</p>
        <h1>Lab CHM.04</h1>
        <p>Ćwicz procedury z egzaminu praktycznego: czytasz protokół, opisujesz, co robisz, a laborant to wykonuje.</p>
        <p className="drobne-start">Kliknij poziom, żeby ćwiczyć z podpowiedziami. „Egzamin” to próba jak na prawdziwym egzaminie: limit czasu, bez podpowiedzi, wynik w punktach (zdane od {PROG}%).</p>
      </header>
      <ul className="lista-poziomow">
        {POZIOMY.map((p, i) => {
          const zapis = wczytajStan(p.id);
          const status = !zapis
            ? 'nowy'
            : zapis.tryb === 'egzamin' && zapis.zakonczony
              ? `egzamin: ${ocenEgzamin(p, zapis).procent}%`
              : zapis.tryb === 'egzamin'
                ? 'egzamin w toku'
                : poziomUkonczony(p, zapis)
                  ? 'ukończony'
                  : `w trakcie: ${zapis.wykonane.length}/${p.kroki.length}`;
          return (
            <li key={p.id} className="poziom">
              <button onClick={() => onWybierz(p.id, 'cwiczenie')}>
                <span className="nr">{i + 1}</span>
                <span className="opis">
                  <strong>{p.tytul}</strong>
                  <span>
                    {p.metoda} · {p.zrodlo}
                  </span>
                </span>
                <span className={`status status-${status === 'ukończony' || status.startsWith('egzamin:') ? 'ok' : status === 'nowy' ? 'nowy' : 'trwa'}`}>{status}</span>
              </button>
              <button className="przycisk-egzamin" onClick={() => onWybierz(p.id, 'egzamin')} aria-label={`Egzamin: ${p.tytul}`}>
                Egzamin
                <span>{p.czasMinut} min</span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Gra({ poziom, tryb, onWyjdz }: { poziom: Poziom; tryb: Tryb; onWyjdz: () => void }) {
  const egzamin = tryb === 'egzamin';
  const [stan, setStan] = useState<StanGry>(() => {
    const nowy = (): StanGry => ({ ...nowyStan(poziom.id), tryb, start: egzamin ? Date.now() : undefined });
    const stary = wczytajStan(poziom.id);
    // zapis z innego trybu nie przechodzi: egzamin zawsze zaczyna się od zera, ćwiczenie nie dziedziczy egzaminu
    const zapis = stary && (stary.tryb ?? 'cwiczenie') === tryb && !(egzamin && stary.zakonczony) ? stary : nowy();
    // brak pomiarów albo zapis w starym formacie → losujemy od nowa
    const aktualne = zapis.pomiary && poziom.karta?.losuj.every((l) => typeof zapis.pomiary![l.id] === 'number');
    return aktualne || !poziom.karta ? zapis : { ...zapis, karta: undefined, pomiary: losujPomiary(poziom.karta) };
  });
  const pomiary = stan.pomiary ?? {};
  const [kartaOtwarta, setKartaOtwarta] = useState(false);
  const [widok, setWidok] = useState<'przod' | 'tyl'>('przod');
  const [lupa, setLupa] = useState(false);
  const [etykiety, setEtykiety] = useState(true);
  // Kartka z protokołem otwarta na start nowego poziomu, zwinięta przy powrocie do rozpoczętego.
  const [protokolOtwarty, setProtokolOtwarty] = useState(() => stan.dziennik.length === 0);
  const [pytanieReset, setPytanieReset] = useState(false);

  useEffect(() => zapiszStan(stan), [stan]);

  const wykonaneKroki = useMemo(
    () => stan.wykonane.map((id) => poziom.kroki.find((k) => k.id === id)!).filter(Boolean),
    [poziom, stan.wykonane],
  );
  const ukonczony = poziomUkonczony(poziom, stan);
  const poOdczycie = Boolean(poziom.karta) && (ukonczony || (poziom.scena?.kartaPo ? stan.wykonane.includes(poziom.scena.kartaPo) : false));
  const otworzKarte = (otwarta: boolean) => {
    setKartaOtwarta(otwarta);
    if (otwarta) setProtokolOtwarty(false);
  };

  // odliczanie czasu egzaminu
  const [teraz, setTeraz] = useState(Date.now());
  useEffect(() => {
    if (!egzamin || stan.zakonczony) return;
    const t = window.setInterval(() => setTeraz(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [egzamin, stan.zakonczony]);
  const pozostalo = egzamin ? pozostaloMs(poziom, stan, teraz) : 0;
  useEffect(() => {
    if (egzamin && !stan.zakonczony && pozostalo <= 0) setStan((s) => ({ ...s, zakonczony: true }));
  }, [egzamin, pozostalo, stan.zakonczony]);
  const [pytanieOddaj, setPytanieOddaj] = useState(false);
  const wynikEgz = egzamin && stan.zakonczony ? ocenEgzamin(poziom, stan) : null;

  const wpisz = (tekst: string) => {
    if (stan.zakonczony) return;
    if (prosiOPomoc(tekst)) {
      setStan((s) => dodajPodpowiedz(poziom, s, tekst, egzamin));
      return;
    }
    const wynik = ocenWpis(poziom, stan, tekst, !egzamin);
    setStan(wynik.stan);
  };

  const resetuj = () => {
    usunStan(poziom.id);
    setStan({ ...nowyStan(poziom.id), tryb, start: egzamin ? Date.now() : undefined, pomiary: poziom.karta ? losujPomiary(poziom.karta) : undefined });
    setPytanieReset(false);
    setKartaOtwarta(false);
  };

  return (
    <div className="gra">
      <nav className="gorny-pasek">
        <button className="drugorzedny" onClick={onWyjdz}>
          ← Poziomy
        </button>
        {egzamin ? (
          <span className={`zegar ${pozostalo < 15 * 60000 ? 'zegar-malo' : ''}`} role="timer" aria-label="Pozostały czas egzaminu">
            ⏱ {formatCzasu(pozostalo)}
          </span>
        ) : (
          <span className="tryb">
            <span className="tylko-szeroki">Tryb:&nbsp;</span>ćwiczenie
          </span>
        )}
        {egzamin && !stan.zakonczony &&
          (pytanieOddaj ? (
            <span className="potwierdz">
              Oddać pracę?
              <button className="niebezpieczny" onClick={() => setStan((s) => ({ ...s, zakonczony: true }))}>
                Tak, oddaję
              </button>
              <button className="drugorzedny" onClick={() => setPytanieOddaj(false)}>
                Nie
              </button>
            </span>
          ) : (
            <button className="drugorzedny" onClick={() => setPytanieOddaj(true)}>
              Zakończ egzamin
            </button>
          ))}
        <button className="drugorzedny" onClick={() => otworzKarte(!kartaOtwarta)} disabled={!poOdczycie && !egzamin} title={poOdczycie || egzamin ? '' : 'Dostępna po pierwszym odczycie wyniku'}>
          Karta<span className="tylko-szeroki">&nbsp;wyników</span>
        </button>
        <button className="drugorzedny" onClick={() => setWidok((w) => (w === 'przod' ? 'tyl' : 'przod'))}>
          {widok === 'przod' ? 'Zza pleców' : 'Z przodu'}
        </button>
        <label className="przelacznik">
          <input id="podpisy" type="checkbox" checked={etykiety} onChange={(e) => setEtykiety(e.target.checked)} /> Podpisy
          <span className="tylko-szeroki">&nbsp;sprzętu</span>
        </label>
        {pytanieReset ? (
          <span className="potwierdz">
            Zacząć od nowa?
            <button className="niebezpieczny" onClick={resetuj}>
              Tak, od nowa
            </button>
            <button className="drugorzedny" onClick={() => setPytanieReset(false)}>
              Anuluj
            </button>
          </span>
        ) : (
          <button className="drugorzedny" onClick={() => setPytanieReset(true)}>
            Od nowa
          </button>
        )}
      </nav>
      <section className="laboratorium">
        <div className="scena">
          <Laboratorium
            kroki={wykonaneKroki}
            bhp={stan.bhp}
            pokazEtykiety={etykiety}
            kartkaOtwarta={protokolOtwarty || kartaOtwarta}
            pisanie={kartaOtwarta}
            widok={widok}
            masa={pomiary[poziom.scena?.masaWagi ?? 'm1'] ?? 2}
            napisy={poziom.scena}
            onZblizenie={setLupa}
          />
          {!kartaOtwarta && (
            <PanelProtokolu
              poziom={poziom}
              otwarty={protokolOtwarty}
              onPrzelacz={(o) => {
                setProtokolOtwarty(o);
                if (o) setKartaOtwarta(false);
              }}
            />
          )}
          {lupa && (
            <div className="lupa-plywajaca">
              <Lupa v={pomiary[poziom.scena?.odczytBiureta ?? 'v1'] ?? 0} podpis="Odczytaj objętość na dolnym menisku" />
            </div>
          )}
        </div>
        {kartaOtwarta && poziom.karta && (
          <Karta
            spec={poziom.karta}
            pomiary={pomiary}
            odpowiedzi={stan.karta ?? {}}
            onZmiana={(karta) => setStan((s) => ({ ...s, karta }))}
            onZwin={() => setKartaOtwarta(false)}
            podpowiedzi={!egzamin}
            bezSprawdzania={egzamin}
          />
        )}
        <Konsola
          stan={stan}
          liczbaKrokow={poziom.kroki.length}
          ukonczony={ukonczony}
          onWpis={wpisz}
          onKarta={() => otworzKarte(true)}
          onPodpowiedz={() => setStan((s) => dodajPodpowiedz(poziom, s, undefined, egzamin))}
          egzamin={egzamin}
          zablokowana={Boolean(stan.zakonczony)}
        />
        {wynikEgz && (
          <div className="wynik-egzaminu" role="dialog" aria-label="Wynik egzaminu">
            <div className="wynik-karta">
              <p className="znaczek">{pozostalo <= 0 ? 'Koniec czasu' : 'Praca oddana'}</p>
              <h2>{wynikEgz.zdany ? 'Zdane' : 'Niezdane'} – {wynikEgz.procent}%</h2>
              <p className="drobne-start">Próg zaliczenia części praktycznej: {PROG}%.</p>
              <table className="tabela-wyniku">
                <tbody>
                  <tr>
                    <th>Przebieg (kroki procedury, minus błędy: {stan.bledy}, minus podpowiedzi: {stan.podpowiedzi ?? 0})</th>
                    <td>{wynikEgz.przebieg.pkt} / {wynikEgz.przebieg.max}</td>
                  </tr>
                  <tr>
                    <th>Środki ochrony indywidualnej</th>
                    <td>{wynikEgz.bhp.pkt} / {wynikEgz.bhp.max}</td>
                  </tr>
                  <tr>
                    <th>Karta wyników (kryteria z zasad oceniania)</th>
                    <td>{wynikEgz.karta.pkt} / {wynikEgz.karta.max}</td>
                  </tr>
                </tbody>
              </table>
              {wynikEgz.karta.nieSpelnione.length > 0 && (
                <details>
                  <summary>Niespełnione kryteria karty ({wynikEgz.karta.nieSpelnione.length})</summary>
                  <ul>
                    {wynikEgz.karta.nieSpelnione.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="wynik-przyciski">
                <button onClick={resetuj}>Nowy egzamin</button>
                <button className="drugorzedny" onClick={onWyjdz}>
                  Lista poziomów
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
