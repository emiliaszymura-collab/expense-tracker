// Widok w okularze refraktometru Abbego: u góry pole jasne i ciemne z granicą na przecięciu nici,
// u dołu skala współczynnika załamania nD – wartość odczytuje się samodzielnie (4 miejsca po przecinku).
export function OkularAbbego({ n, podpis }: { n: number; podpis?: string }) {
  const W = 220;
  const skala = 9000; // px na 1 jednostkę nD (0,001 = 9 px)
  const x = (w: number) => W / 2 + (w - n) * skala;
  const kreski: JSX.Element[] = [];
  const od = Math.ceil((n - 0.012) * 1000);
  const doo = Math.floor((n + 0.012) * 1000);
  for (let i = od; i <= doo; i++) {
    const w = i / 1000;
    const duza = i % 10 === 0;
    const srednia = i % 5 === 0;
    kreski.push(<line key={i} x1={x(w)} x2={x(w)} y1={186} y2={duza ? 166 : srednia ? 172 : 178} stroke="#1b1b1b" strokeWidth={duza ? 1.6 : 1} />);
    if (duza) kreski.push(<text key={`t${i}`} x={x(w)} y={160} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1b1b1b">{w.toFixed(2).replace('.', ',')}</text>);
  }
  return (
    <figure className="lupa okular">
      <svg viewBox={`0 0 ${W} 200`} width={W} height={200} role="img" aria-label="Widok w okularze refraktometru Abbego – odczytaj współczynnik załamania nD">
        <defs>
          <clipPath id="pole-okularu">
            <circle cx={W / 2} cy={70} r={62} />
          </clipPath>
        </defs>
        <rect width={W} height={200} fill="#101418" rx="10" />
        {/* pole widzenia: jasna góra, ciemny dół, granica na przecięciu nici */}
        <g clipPath="url(#pole-okularu)">
          <rect x="0" y="0" width={W} height={70} fill="#f4f1e6" />
          <rect x="0" y="70" width={W} height={70} fill="#2a2f33" />
          <line x1={W / 2 - 62} y1={8} x2={W / 2 + 62} y2={132} stroke="#c0392b" strokeWidth="1.2" />
          <line x1={W / 2 - 62} y1={132} x2={W / 2 + 62} y2={8} stroke="#c0392b" strokeWidth="1.2" />
        </g>
        <circle cx={W / 2} cy={70} r={62} fill="none" stroke="#5c646b" strokeWidth="3" />
        {/* skala nD */}
        <rect x="10" y="146" width={W - 20} height="46" fill="#f2efe3" rx="4" />
        {kreski}
        <line x1={W / 2} x2={W / 2} y1={146} y2={192} stroke="#c0392b" strokeWidth="1.6" />
        <text x={W - 14} y={188} textAnchor="end" fontSize="10" fill="#555">nD</text>
      </svg>
      {podpis && <figcaption>{podpis}</figcaption>}
    </figure>
  );
}

// Widok w okularze polarymetru półcieniowego: pole podzielone na dwie połowy o równym zaciemnieniu
// (analizator ustawiony) oraz skala główna co 1° z noniuszem 20-działkowym – dokładność 0,05°.
export function OkularPolarymetru({ kat, podpis }: { kat: number; podpis?: string }) {
  const W = 380;
  const k = 16; // px na 1° skali głównej
  const x0 = 26; // zero noniusza – przy nim odczytuje się pełne stopnie
  const x = (st: number) => x0 + (st - kat) * k;
  const glowna: JSX.Element[] = [];
  for (let m = Math.ceil(kat - 1); m <= Math.floor(kat + 21); m++) {
    const duza = m % 5 === 0;
    glowna.push(<line key={m} x1={x(m)} x2={x(m)} y1={150} y2={duza ? 128 : 136} stroke="#1b1b1b" strokeWidth={duza ? 1.6 : 1} />);
    if (duza) glowna.push(<text key={`t${m}`} x={x(m)} y={124} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1b1b1b">{m}</text>);
  }
  const noniusz: JSX.Element[] = [];
  for (let i = 0; i <= 20; i++) {
    const xi = x0 + i * 0.95 * k;
    const opis = i % 5 === 0;
    noniusz.push(<line key={i} x1={xi} x2={xi} y1={150} y2={opis ? 170 : 163} stroke="#7a1f1f" strokeWidth={i === 0 ? 1.8 : 1} />);
    if (opis) noniusz.push(<text key={`n${i}`} x={xi} y={183} textAnchor="middle" fontSize="10" fill="#7a1f1f">{i}</text>);
  }
  return (
    <figure className="lupa okular">
      <svg viewBox={`0 0 ${W} 200`} width={W} height={200} role="img" aria-label="Widok w okularze polarymetru – odczytaj kąt ze skali i noniusza">
        <defs>
          <clipPath id="pole-polarymetru">
            <circle cx={W / 2} cy={55} r={46} />
          </clipPath>
        </defs>
        <rect width={W} height={200} fill="#101418" rx="10" />
        {/* półcień: obie połowy jednakowo zaciemnione – analizator ustawiony */}
        <g clipPath="url(#pole-polarymetru)">
          <rect x="0" y="0" width={W / 2} height={110} fill="#b9a45a" />
          <rect x={W / 2} y="0" width={W / 2} height={110} fill="#b5a057" />
          <line x1={W / 2} y1={0} x2={W / 2} y2={110} stroke="#5d5230" strokeWidth="1" />
        </g>
        <circle cx={W / 2} cy={55} r={46} fill="none" stroke="#5c646b" strokeWidth="3" />
        <rect x="8" y="112" width={W - 16} height="80" fill="#f2efe3" rx="4" />
        {glowna}
        {noniusz}
        <text x={14} y={142} fontSize="9" fill="#555">°</text>
        <text x={W - 12} y={190} textAnchor="end" fontSize="9" fill="#7a1f1f">noniusz ×0,05°</text>
      </svg>
      {podpis && <figcaption>{podpis}</figcaption>}
    </figure>
  );
}
