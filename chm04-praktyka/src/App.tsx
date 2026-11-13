import { useEffect, useMemo, useState } from 'react';
import { POZIOMY } from './procedury';
import { usunStan, wczytajStan, zapiszStan } from './postep';
import { Laboratorium } from './scena/Laboratorium';
import { dodajPodpowiedz, nowyStan, ocenWpis, poziomUkonczony, type StanGry } from './silnik/gra';
import type { Poziom } from './silnik/typy';
import { losujPomiary } from './silnik/karta';
import { Karta } from './ui/Karta';
import { Konsola } from './ui/Konsola';
import { Lupa } from './ui/Lupa';
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
  const [stan, setStan] = useState<StanGry>(() => {
    const zapis = wczytajStan(poziom.id) ?? nowyStan(poziom.id);
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

  const wpisz = (tekst: string) => {
    const wynik = ocenWpis(poziom, stan, tekst, true);
    setStan(wynik.stan);
  };

  const resetuj = () => {
    usunStan(poziom.id);
    setStan({ ...nowyStan(poziom.id), pomiary: poziom.karta ? losujPomiary(poziom.karta) : undefined });
    setPytanieReset(false);
    setKartaOtwarta(false);
  };

  return (
    <div className="gra">
      <nav className="gorny-pasek">
        <button className="drugorzedny" onClick={onWyjdz}>
          ← Poziomy
        </button>
        <span className="tryb">
          <span className="tylko-szeroki">Tryb:&nbsp;</span>ćwiczenie
        </span>
        <button className="drugorzedny" onClick={() => otworzKarte(!kartaOtwarta)} disabled={!poOdczycie} title={poOdczycie ? '' : 'Dostępna po pierwszym odczycie wyniku'}>
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
            podpowiedzi
          />
        )}
        <Konsola
          stan={stan}
          liczbaKrokow={poziom.kroki.length}
          ukonczony={ukonczony}
          onWpis={wpisz}
          onKarta={() => otworzKarte(true)}
          onPodpowiedz={() => setStan((s) => dodajPodpowiedz(poziom, s))}
        />
      </section>
    </div>
  );
}
