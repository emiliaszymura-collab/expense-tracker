import { useEffect, useMemo, useState } from 'react';
import { POZIOMY } from './procedury';
import { usunStan, wczytajStan, zapiszStan } from './postep';
import { Laboratorium } from './scena/Laboratorium';
import { dodajPodpowiedz, nowyStan, ocenWpis, poziomUkonczony, stanSceny, type StanGry } from './silnik/gra';
import type { Poziom } from './silnik/typy';
import { Konsola } from './ui/Konsola';
import { PanelProtokolu } from './ui/PanelProtokolu';

export default function App() {
  const [poziomId, setPoziomId] = useState<string | null>(null);
  const poziom = POZIOMY.find((p) => p.id === poziomId);

  if (!poziom) return <WyborPoziomu onWybierz={setPoziomId} />;
  return <Gra key={poziom.id} poziom={poziom} onWyjdz={() => setPoziomId(null)} />;
}

function WyborPoziomu({ onWybierz }: { onWybierz: (id: string) => void }) {
  return (
    <main className="start">
      <header>
        <p className="znaczek">Technik analityk · CHM.04 · podstawa 2019</p>
        <h1>Lab CHM.04</h1>
        <p>Ćwicz procedury z egzaminu praktycznego: czytasz protokół, opisujesz, co robisz, a laborant to wykonuje.</p>
      </header>
      <ul className="lista-poziomow">
        {POZIOMY.map((p, i) => {
          const zapis = wczytajStan(p.id);
          const status = zapis
            ? poziomUkonczony(p, zapis)
              ? 'ukończony'
              : `w trakcie: ${zapis.wykonane.length}/${p.kroki.length}`
            : 'nowy';
          return (
            <li key={p.id}>
              <button onClick={() => onWybierz(p.id)}>
                <span className="nr">{i + 1}</span>
                <span className="opis">
                  <strong>{p.tytul}</strong>
                  <span>
                    {p.metoda} · {p.zrodlo}
                  </span>
                </span>
                <span className={`status status-${status === 'ukończony' ? 'ok' : status === 'nowy' ? 'nowy' : 'trwa'}`}>{status}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Gra({ poziom, onWyjdz }: { poziom: Poziom; onWyjdz: () => void }) {
  const [stan, setStan] = useState<StanGry>(() => wczytajStan(poziom.id) ?? nowyStan(poziom.id));
  const [impuls, setImpuls] = useState(0);
  const [etykiety, setEtykiety] = useState(true);
  const [protokolOtwarty, setProtokolOtwarty] = useState(true);
  const [pytanieReset, setPytanieReset] = useState(false);

  useEffect(() => zapiszStan(stan), [stan]);

  const scena = useMemo(() => stanSceny(poziom, stan), [poziom, stan]);
  const ostatniKrok = [...stan.wykonane].reverse().map((id) => poziom.kroki.find((k) => k.id === id)).find((k) => k?.sprzet);
  const ukonczony = poziomUkonczony(poziom, stan);

  const wpisz = (tekst: string) => {
    const wynik = ocenWpis(poziom, stan, tekst, true);
    setStan(wynik.stan);
    if (wynik.przyjete.length > 0 || wynik.stan.bhp.length !== stan.bhp.length) setImpuls((n) => n + 1);
  };

  const resetuj = () => {
    usunStan(poziom.id);
    setStan(nowyStan(poziom.id));
    setPytanieReset(false);
  };

  return (
    <div className={`gra ${protokolOtwarty ? '' : 'bez-protokolu'}`}>
      <nav className="gorny-pasek">
        <button className="drugorzedny" onClick={onWyjdz}>
          ← Poziomy
        </button>
        <button className="drugorzedny" onClick={() => setProtokolOtwarty((o) => !o)}>
          {protokolOtwarty ? 'Ukryj protokół' : 'Pokaż protokół'}
        </button>
        <span className="tryb">Tryb: ćwiczenie</span>
        <label className="przelacznik">
          <input type="checkbox" checked={etykiety} onChange={(e) => setEtykiety(e.target.checked)} /> Podpisy sprzętu
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
      {protokolOtwarty && <PanelProtokolu poziom={poziom} />}
      <section className="laboratorium">
        <div className="scena">
          <Laboratorium stan={scena} aktywnySprzet={ostatniKrok?.sprzet} impuls={impuls} pokazEtykiety={etykiety} />
        </div>
        <Konsola
          stan={stan}
          liczbaKrokow={poziom.kroki.length}
          ukonczony={ukonczony}
          onWpis={wpisz}
          onPodpowiedz={() => setStan((s) => dodajPodpowiedz(poziom, s))}
        />
      </section>
    </div>
  );
}
