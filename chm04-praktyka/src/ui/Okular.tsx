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
