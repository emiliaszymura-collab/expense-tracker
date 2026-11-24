// Arkusz wzorcowy: co masz źle i jak powinna wyglądać cała karta z obliczeniami.
import type { KartaSpec } from '../silnik/typy';
import { ocenKarte, polaKryterium, wypelnijRozwiazanie, wzorcoweWypelnienie, type Odpowiedzi, type Pomiary } from '../silnik/karta';

interface Props {
  spec: KartaSpec;
  pomiary: Pomiary;
  odpowiedzi: Odpowiedzi;
}

export function ArkuszWzorcowy({ spec, pomiary, odpowiedzi }: Props) {
  const wzor = wzorcoweWypelnienie(spec, pomiary);
  const ocena = ocenKarte(spec, pomiary, odpowiedzi);
  const zle = new Set<string>();
  spec.kryteria.forEach((k, i) => {
    if (!ocena[i].ok) k.sprawdz.forEach((s) => polaKryterium(s).forEach((id) => zle.add(id)));
  });
  const bledne = ocena.filter((k) => !k.ok);

  const wiersze = (sek: KartaSpec['sekcje'][number]) => {
    const r: { id: string; etykieta: string; jedn?: string }[] = [];
    if (sek.tabela)
      for (let i = 1; i <= sek.tabela.wiersze; i++)
        for (const k of sek.tabela.kolumny) r.push({ id: k.pole.replace('{i}', String(i)), etykieta: `${k.naglowek} – nr ${i}` });
    for (const p of sek.pola ?? []) r.push({ id: p.id, etykieta: p.etykieta, jedn: p.jednostka });
    return r;
  };

  return (
    <div className="wzorcowy">
      <h3>Co masz źle</h3>
      {bledne.length === 0 ? (
        <p className="kr-ok">✓ Wszystkie kryteria spełnione.</p>
      ) : (
        <ul>
          {bledne.map((k, i) => (
            <li key={i} className="kr-zle">
              ✗ <strong>{k.opis}</strong>
              {k.uwaga && <div className="drobne">{k.uwaga}</div>}
            </li>
          ))}
        </ul>
      )}

      <h3>Arkusz wzorcowy – tak powinna wyglądać karta</h3>
      {spec.sekcje.map((sek) => (
        <div key={sek.tytul}>
          <h4>{sek.tytul}</h4>
          <table className="tabela-wzorcowa">
            <thead>
              <tr>
                <th></th>
                <th>Twoja odpowiedź</th>
                <th>Poprawnie</th>
              </tr>
            </thead>
            <tbody>
              {wiersze(sek).map((w) => (
                <tr key={w.id} className={zle.has(w.id) ? 'zle' : ''}>
                  <th>{w.etykieta}</th>
                  <td>
                    {odpowiedzi[w.id] || '—'} {zle.has(w.id) ? '✗' : odpowiedzi[w.id] ? '✓' : ''}
                  </td>
                  <td>
                    <strong>{wzor[w.id] ?? '(dowolna, zgodna z odczytem)'}</strong> {w.jedn ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {spec.rozwiazanie && (
        <>
          <h3>Rozwiązanie krok po kroku – na Twoich liczbach</h3>
          {wypelnijRozwiazanie(spec, pomiary).map((l, i) =>
            l.startsWith('~') ? (
              <div key={i} className="proporcja">
                {l.slice(1).split(' | ').map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            ) : (
              <p key={i}>{l}</p>
            ),
          )}
        </>
      )}

      {spec.brudnopis && !spec.rozwiazanie && (
        <>
          <h3>Obliczenia proporcjami – krok po kroku</h3>
          {spec.brudnopis.map((l, i) =>
            l.startsWith('~') ? (
              <div key={i} className="proporcja">
                {l.slice(1).split(' | ').map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            ) : (
              <p key={i}>{l}</p>
            ),
          )}
          <p className="drobne">Podstaw swoje odczyty do proporcji – wyniki dla Twoich danych są w kolumnie „Poprawnie”.</p>
        </>
      )}
    </div>
  );
}
