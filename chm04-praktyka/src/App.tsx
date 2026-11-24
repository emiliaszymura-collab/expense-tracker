import { useEffect, useMemo, useState } from 'react';
import { formatCzasu, ocenEgzamin, PROG, pozostaloMs } from './silnik/egzamin';
import { POZIOMY } from './procedury';
import { usunStan, wczytajStan, zapiszStan } from './postep';
import { Laboratorium } from './scena/Laboratorium';
import { dodajPodpowiedz, nowyStan, ocenWpis, poziomUkonczony, prosiOPomoc, type StanGry } from './silnik/gra';
import type { Poziom } from './silnik/typy';
import { losujPomiary } from './silnik/karta';
import { ArkuszWzorcowy } from './ui/Wzorcowy';
import { Karta } from './ui/Karta';
import { Konsola } from './ui/Konsola';
import { Lupa } from './ui/Lupa';
import { OkularAbbego, OkularPolarymetru } from './ui/Okular';
import { PanelProtokolu } from './ui/PanelProtokolu';

export default function App() {
  // Otwarty poziom zapamiętujemy, żeby po przeładowaniu strony (nowa wersja gry, iOS zwalniający pamięć)
  // wrócić od razu do poziomu i egzaminu, a nie na listę.
  const [wybor, setWyborStan] = useState<{ id: string; tryb: Tryb } | null>(() => {
    try {
      const z = JSON.parse(localStorage.getItem(KLUCZ_WIDOKU) ?? 'null');
      return z && POZIOMY.some((p) => p.id === z.id) ? z : null;
    } catch {
      return null;
    }
  });
  const setWybor = (w: { id: string; tryb: Tryb } | null) => {
    try {
      if (w) localStorage.setItem(KLUCZ_WIDOKU, JSON.stringify(w));
      else localStorage.removeItem(KLUCZ_WIDOKU);
    } catch {
      /* bez storage – zostaje tylko w pamięci */
    }
    setWyborStan(w);
  };
  const poziom = POZIOMY.find((p) => p.id === wybor?.id);

  if (!poziom || !wybor) return <WyborPoziomu onWybierz={(id, tryb) => setWybor({ id, tryb })} />;
  return <Gra key={`${poziom.id}-${wybor.tryb}`} poziom={poziom} tryb={wybor.tryb} onWyjdz={() => setWybor(null)} />;
}

type Tryb = 'cwiczenie' | 'egzamin';
const KLUCZ_WIDOKU = 'chm04-praktyka:widok:v1';

function WyborPoziomu({ onWybierz }: { onWybierz: (id: string, tryb: Tryb) => void }) {
  return (
    <main className="start">
      <header>
        <p className="znaczek">Technik analityk · CHM.04 · podstawa 2019</p>
        <h1>Lab CHM.04</h1>
        <p>Ćwicz procedury z egzaminu praktycznego: czytasz protokół, opisujesz, co robisz, a laborant to wykonuje.</p>
        <p className="drobne-start">Kliknij poziom, żeby ćwiczyć z podpowiedziami. „Egzamin” to próba jak na prawdziwym egzaminie: limit czasu, bez podpowiedzi, wynik w punktach (zdane od {PROG}%).</p>
      </header>
      {GRUPY.map((g) => (
        <section key={g.nazwa} className="grupa-poziomow">
          <h2>{g.nazwa}</h2>
          {g.opis && <p className="drobne-start">{g.opis}</p>}
      <ul className="lista-poziomow">
        {g.poziomy.map((p) => {
          const i = POZIOMY.indexOf(p);
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
        </section>
      ))}
    </main>
  );
}

/** Zadania z arkuszy CKE osobno, a przewidywane – pogrupowane według przyrządu. */
const GRUPY: { nazwa: string; opis?: string; poziomy: Poziom[] }[] = (() => {
  const zArkuszy = POZIOMY.filter((p) => !p.grupa);
  const nazwy = [...new Set(POZIOMY.filter((p) => p.grupa).map((p) => p.grupa!))];
  return [
    { nazwa: 'Zadania z arkuszy CKE', poziomy: zArkuszy },
    ...nazwy.map((n, i) => ({
      nazwa: `Co może się jeszcze pojawić: ${n}`,
      opis: i === 0 ? 'Metody z podstawy programowej 2019, których nie było jeszcze w arkuszach – każde typowe zadanie z danym przyrządem.' : undefined,
      poziomy: POZIOMY.filter((p) => p.grupa === n),
    })),
  ];
})();

function Gra({ poziom, tryb, onWyjdz }: { poziom: Poziom; tryb: Tryb; onWyjdz: () => void }) {
  const egzamin = tryb === 'egzamin';
  const [stan, setStan] = useState<StanGry>(() => {
    const nowy = (): StanGry => ({ ...nowyStan(poziom.id), tryb, start: egzamin ? Date.now() : undefined });
    const stary = wczytajStan(poziom.id);
    // zapis z innego trybu nie przechodzi: egzamin zawsze zaczyna się od zera, ćwiczenie nie dziedziczy egzaminu
    let zapis = stary && (stary.tryb ?? 'cwiczenie') === tryb && !(egzamin && stary.zakonczony) ? stary : nowy();
    if (egzamin && !zapis.start) zapis = { ...zapis, start: Date.now() };
    // brak pomiarów albo zapis w starym formacie → losujemy od nowa
    const aktualne = zapis.pomiary && poziom.karta?.losuj.every((l) => typeof zapis.pomiary![l.id] === 'number');
    return aktualne || !poziom.karta ? zapis : { ...zapis, karta: undefined, pomiary: losujPomiary(poziom.karta) };
  });
  const pomiary = stan.pomiary ?? {};
  const [kartaOtwarta, setKartaOtwarta] = useState(false);
  const [widok, setWidok] = useState<'przod' | 'tyl'>('przod');
  const [lupa, setLupa] = useState(false);
  const [okular, setOkular] = useState(false);
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
        {egzamin && !stan.zakonczony && (
          <button className="niebezpieczny oddaj" onClick={() => setPytanieOddaj(true)}>
            Zakończ egzamin
          </button>
        )}
        {egzamin && !stan.zakonczony && pytanieOddaj && (
          <div className="wynik-egzaminu" role="dialog" aria-label="Oddanie pracy">
            <div className="wynik-karta">
              <h2>Oddać pracę?</h2>
              <p>Po oddaniu nie można już nic zmienić. Zobaczysz wynik i arkusz wzorcowy.</p>
              <div className="wynik-przyciski">
                <button className="niebezpieczny" onClick={() => { setPytanieOddaj(false); setKartaOtwarta(false); setStan((s) => ({ ...s, zakonczony: true })); }}>
                  Tak, oddaję
                </button>
                <button className="drugorzedny" onClick={() => setPytanieOddaj(false)}>
                  Nie, wracam
                </button>
              </div>
            </div>
          </div>
        )}
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
            onOkular={setOkular}
            przyrzad={poziom.scena?.przyrzad}
            phmetr={poziom.scena?.phmetr}
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
          {okular && poziom.scena?.okular && (
            <div className="lupa-plywajaca">
              {poziom.scena.przyrzad === 'polarymetr' ? (
                <OkularPolarymetru kat={pomiary[poziom.scena.okular] ?? 0} podpis="Pola zrównane – odczytaj kąt: stopnie ze skali, setne z noniusza" />
              ) : (
                <OkularAbbego n={pomiary[poziom.scena.okular] ?? 1.333} podpis="Granica pól na przecięciu nici – odczytaj nD" />
              )}
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
            onOddaj={egzamin && !stan.zakonczony ? () => setPytanieOddaj(true) : undefined}
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
              {poziom.karta && stan.pomiary && (
                <details open>
                  <summary>Co masz źle i arkusz wzorcowy</summary>
                  <ArkuszWzorcowy spec={poziom.karta} pomiary={stan.pomiary} odpowiedzi={stan.karta ?? {}} />
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
