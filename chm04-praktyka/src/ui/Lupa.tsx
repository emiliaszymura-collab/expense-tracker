// Powiększony fragment biurety – objętość trzeba odczytać samodzielnie, na dolnym menisku.
export function Lupa({ v, podpis }: { v: number; podpis?: string }) {
  const W = 120;
  const H = 210;
  const skala = 150; // px na 1 cm³
  const y = (wartosc: number) => H / 2 + (wartosc - v) * skala;
  const kreski: JSX.Element[] = [];
  for (let i = Math.ceil((v - 0.75) * 10); i <= Math.floor((v + 0.75) * 10); i++) {
    const w = i / 10;
    if (w < 0) continue;
    const pelna = i % 10 === 0;
    const pol = i % 5 === 0;
    kreski.push(<line key={i} x1={pelna ? 34 : pol ? 40 : 46} x2={64} y1={y(w)} y2={y(w)} stroke="#16324f" strokeWidth={pelna ? 2 : 1.2} />);
    if (pelna) kreski.push(<text key={`t${i}`} x={28} y={y(w) + 5} textAnchor="end" fontSize="15" fontWeight="700" fill="#16324f">{w}</text>);
  }
  const yM = y(v);
  return (
    <figure className="lupa">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Powiększenie biurety – odczytaj objętość na dolnym menisku">
        <rect x="0" y="0" width={W} height={H} fill="#fbfbf7" />
        {/* rurka */}
        <rect x="64" y="0" width="34" height={H} fill="#eef6fa" stroke="#9db4c0" strokeWidth="1.5" />
        {/* ciecz z wklęsłym meniskiem */}
        <path d={`M64 ${yM - 7} Q81 ${yM + 7} 98 ${yM - 7} L98 ${H} L64 ${H} Z`} fill="#a9d3ea" />
        <path d={`M64 ${yM - 7} Q81 ${yM + 7} 98 ${yM - 7}`} fill="none" stroke="#3b7ea1" strokeWidth="1.6" />
        {kreski}
        <text x={W - 4} y={14} textAnchor="end" fontSize="10" fill="#5f6b73">cm³</text>
      </svg>
      {podpis && <figcaption>{podpis}</figcaption>}
    </figure>
  );
}
