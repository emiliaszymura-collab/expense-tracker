// Sala laboratoryjna: jasne ściany, okna ze światłem dziennym, panele LED, szafki, dygestorium, wyspa.
import { useMemo } from 'react';
import * as THREE from 'three';
import { BLAT_MAT, CHROM, PLASTIK_CIEMNY, SZAFKA, SZKLO, STAL, etykieta } from './materialy';
import { Butelka } from './Sprzet';
import { BLAT, WYSPA } from './uklad';

const Z_SCIANY = -3.4;
const SUFIT = 3.05;

function teksturaOkna() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const niebo = g.createLinearGradient(0, 0, 0, 256);
  niebo.addColorStop(0, '#9fd0ff');
  niebo.addColorStop(0.6, '#e4f3ff');
  niebo.addColorStop(1, '#f6fbff');
  g.fillStyle = niebo;
  g.fillRect(0, 0, 256, 256);
  // rozmyte korony drzew i budynek w tle
  g.filter = 'blur(6px)';
  g.fillStyle = '#b9c7d1';
  g.fillRect(150, 150, 90, 110);
  g.fillStyle = '#7fae7a';
  for (const [x, y, r] of [[40, 215, 46], [95, 232, 40], [5, 240, 36], [215, 245, 30]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function teksturaZegara() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fdfdfb';
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1d1f21';
  g.lineWidth = 8;
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineWidth = i % 3 === 0 ? 7 : 3;
    g.beginPath();
    g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100);
    g.lineTo(128 + Math.sin(a) * 114, 128 - Math.cos(a) * 114);
    g.stroke();
  }
  const teraz = new Date();
  const wsk = (kat: number, dl: number, gr: number) => {
    g.lineWidth = gr;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(128 + Math.sin(kat) * dl, 128 - Math.cos(kat) * dl);
    g.stroke();
  };
  wsk(((teraz.getHours() % 12) + teraz.getMinutes() / 60) / 12 * Math.PI * 2, 60, 9);
  wsk((teraz.getMinutes() / 60) * Math.PI * 2, 90, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rząd szafek z frontami i uchwytami; przód w stronę +z. */
function Szafki({ szer, wys, gl, fronty, szuflady = false }: { szer: number; wys: number; gl: number; fronty: number; szuflady?: boolean }) {
  const w = szer / fronty;
  return (
    <group>
      <mesh position={[0, wys / 2 + 0.05, 0]} castShadow receiveShadow material={SZAFKA}>
        <boxGeometry args={[szer, wys - 0.1, gl]} />
      </mesh>
      <mesh position={[0, 0.05, -0.03]} material={PLASTIK_CIEMNY}>
        <boxGeometry args={[szer - 0.02, 0.1, gl - 0.06]} />
      </mesh>
      {Array.from({ length: fronty }, (_, i) => {
        const x = -szer / 2 + w * (i + 0.5);
        const zSzuflada = szuflady && i % 3 === 1;
        return (
          <group key={i} position={[x, 0, gl / 2]}>
            {zSzuflada ? (
              [0.74, 0.5, 0.26].map((y) => (
                <group key={y} position={[0, (y * (wys - 0.12)) / 0.87 + 0.02, 0]}>
                  <mesh position={[0, 0, 0.008]} material={SZAFKA} castShadow>
                    <boxGeometry args={[w - 0.012, (wys - 0.14) / 3 - 0.012, 0.018]} />
                  </mesh>
                  <mesh position={[0, 0.04, 0.026]} rotation={[0, 0, Math.PI / 2]} material={CHROM}>
                    <cylinderGeometry args={[0.005, 0.005, w * 0.4, 8]} />
                  </mesh>
                </group>
              ))
            ) : (
              <>
                <mesh position={[0, wys / 2 + 0.05, 0.008]} material={SZAFKA} castShadow>
                  <boxGeometry args={[w - 0.012, wys - 0.13, 0.018]} />
                </mesh>
                <mesh position={[(i % 2 ? -1 : 1) * (w / 2 - 0.05), wys * 0.78, 0.026]} material={CHROM}>
                  <cylinderGeometry args={[0.005, 0.005, 0.13, 8]} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Okno({ x }: { x: number }) {
  const tex = useMemo(teksturaOkna, []);
  return (
    <group position={[x, 1.95, Z_SCIANY + 0.01]}>
      <mesh>
        <planeGeometry args={[1.7, 1.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* rama */}
      {[[0, 0.67, 1.8, 0.06], [0, -0.67, 1.8, 0.06], [-0.88, 0, 0.06, 1.4], [0.88, 0, 0.06, 1.4], [0, 0, 0.04, 1.3]].map(([px, py, w, h], i) => (
        <mesh key={i} position={[px, py, 0.02]}>
          <boxGeometry args={[w, h, 0.05]} />
          <meshStandardMaterial color="#f7f7f5" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, -0.74, 0.08]}>
        <boxGeometry args={[1.9, 0.04, 0.2]} />
        <meshStandardMaterial color="#f1f1ee" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Dygestorium() {
  return (
    <group position={[-3.9, 0, Z_SCIANY + 0.4]}>
      <mesh position={[0, 0.45, 0]} material={SZAFKA} castShadow>
        <boxGeometry args={[1.3, 0.9, 0.8]} />
      </mesh>
      <mesh position={[0, 0.915, 0]} material={BLAT_MAT}>
        <boxGeometry args={[1.32, 0.03, 0.82]} />
      </mesh>
      {/* komora */}
      <mesh position={[0, 1.6, -0.38]}>
        <boxGeometry args={[1.3, 1.35, 0.04]} />
        <meshStandardMaterial color="#dfe3e4" roughness={0.6} />
      </mesh>
      {[-0.63, 0.63].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} material={SZAFKA}>
          <boxGeometry args={[0.04, 1.35, 0.8]} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0]} material={SZAFKA} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.8]} />
      </mesh>
      {/* szyba podniesiona do połowy */}
      <mesh position={[0, 1.85, 0.38]} material={SZKLO}>
        <boxGeometry args={[1.22, 0.8, 0.012]} />
      </mesh>
      <mesh position={[0, 1.44, 0.39]} material={STAL}>
        <boxGeometry args={[1.24, 0.03, 0.03]} />
      </mesh>
      <mesh position={[0, 2.75, -0.1]}>
        <cylinderGeometry args={[0.14, 0.14, 0.5, 16]} />
        <meshStandardMaterial color="#c3c9cc" metalness={0.6} roughness={0.4} />
      </mesh>
      <group position={[-0.3, 0.93, -0.1]}>
        <Butelka napis={['NH₃ · H₂O', 'bufor pH 10']} braz wys={0.2} r={0.045} zakretka="#111" />
      </group>
    </group>
  );
}

function Plakat({ x, y, napis, tlo, kolor }: { x: number; y: number; napis: string[]; tlo: string; kolor: string }) {
  const tex = useMemo(() => etykieta(napis, { w: 256, h: 320, tlo, kolor, rozmiar: 40 }), []);
  return (
    <mesh position={[x, y, Z_SCIANY + 0.012]}>
      <planeGeometry args={[0.42, 0.52]} />
      <meshStandardMaterial map={tex} roughness={0.8} />
    </mesh>
  );
}

export function Pomieszczenie() {
  const zegar = useMemo(teksturaZegara, []);
  const szerWyspy = WYSPA.x1 - WYSPA.x0;
  const glWyspy = WYSPA.z1 - WYSPA.z0;
  const srodekX = (WYSPA.x0 + WYSPA.x1) / 2;
  const srodekZ = (WYSPA.z0 + WYSPA.z1) / 2;

  return (
    <group>
      {/* podłoga, ściany, sufit */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#a9b2b5" roughness={0.5} metalness={0.02} />
      </mesh>
      <mesh position={[0, SUFIT / 2, Z_SCIANY]} receiveShadow>
        <planeGeometry args={[14, SUFIT]} />
        <meshStandardMaterial color="#e6e8e3" roughness={0.95} />
      </mesh>
      <mesh position={[-5.6, SUFIT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12, SUFIT]} />
        <meshStandardMaterial color="#dfe2dd" roughness={0.95} />
      </mesh>
      <mesh position={[5.6, SUFIT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12, SUFIT]} />
        <meshStandardMaterial color="#dfe2dd" roughness={0.95} />
      </mesh>
      <mesh position={[0, SUFIT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#fafaf8" roughness={1} />
      </mesh>
      {/* listwa przypodłogowa */}
      <mesh position={[0, 0.05, Z_SCIANY + 0.01]}>
        <boxGeometry args={[14, 0.1, 0.02]} />
        <meshStandardMaterial color="#9aa3a7" roughness={0.6} />
      </mesh>
      {/* panele LED */}
      {[[-2.2, -1.2], [1.8, -1.2], [-2.2, 1.6], [1.8, 1.6]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, SUFIT - 0.01, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 0.6]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}

      <Okno x={-1.5} />
      <Okno x={1.3} />

      {/* stół przyścienny z szafkami i aparaturą */}
      <group position={[0.2, 0, Z_SCIANY + 0.32]}>
        <Szafki szer={6.4} wys={0.88} gl={0.62} fronty={10} szuflady />
        <mesh position={[0, 0.895, 0.01]} material={BLAT_MAT} receiveShadow castShadow>
          <boxGeometry args={[6.46, 0.035, 0.68]} />
        </mesh>
        {/* suszarka laboratoryjna */}
        <group position={[2.5, 0.915, -0.02]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.6, 0.6, 0.5]} />
            <meshStandardMaterial color="#e8eaeb" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[-0.05, 0.3, 0.252]}>
            <planeGeometry args={[0.32, 0.36]} />
            <meshStandardMaterial color="#1e2a30" roughness={0.1} metalness={0.4} />
          </mesh>
          <mesh position={[0.22, 0.45, 0.252]}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshBasicMaterial color="#ff8a3d" toneMapped={false} />
          </mesh>
        </group>
        {/* spektrofotometr */}
        <group position={[1.4, 0.915, 0]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.55, 0.2, 0.42]} />
            <meshStandardMaterial color="#dfe4e6" roughness={0.45} />
          </mesh>
          <mesh position={[0.12, 0.215, 0.05]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.22, 0.12, 0.012]} />
            <meshStandardMaterial color="#12303a" roughness={0.2} emissive="#0b6b7a" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-0.15, 0.205, 0]} material={PLASTIK_CIEMNY}>
            <boxGeometry args={[0.16, 0.012, 0.2]} />
          </mesh>
        </group>
        {/* szkło i odczynniki */}
        {[-2.7, -2.45, -2.2, -0.2, 0.05].map((x, i) => (
          <group key={x} position={[x, 0.915, -0.1 + (i % 2) * 0.12]}>
            <Butelka
              napis={[['NaOH', '0,1 mol/dm³'], ['H₂SO₄', '95%'], ['EDTA', '0,05 mol/dm³'], ['AgNO₃', '0,1 mol/dm³'], ['KMnO₄', '0,02 mol/dm³']][i]}
              braz={i === 1 || i >= 3}
              wys={0.2}
              r={0.045}
            />
          </group>
        ))}
      </group>

      {/* półka szklana nad stołem */}
      <group position={[-0.1, 1.38, Z_SCIANY + 0.13]}>
        <mesh material={SZKLO}>
          <boxGeometry args={[1.1, 0.012, 0.22]} />
        </mesh>
        {[-0.4, -0.15, 0.1, 0.35].map((x, i) => (
          <group key={x} position={[x, 0.008, 0]}>
            <Butelka napis={[['fenoloftaleina', '1%'], ['oranż metyl.', '0,1%'], ['skrobia', '0,5%'], ['K₂CrO₄', '10%']][i]} braz={i < 2} wys={0.12} r={0.03} zakretka="#111" />
          </group>
        ))}
      </group>

      <Dygestorium />

      {/* ściana: zegar, plakaty BHP, apteczka */}
      <mesh position={[3.6, 2.45, Z_SCIANY + 0.03]}>
        <circleGeometry args={[0.2, 40]} />
        <meshBasicMaterial map={zegar} />
      </mesh>
      <Plakat x={4.4} y={1.75} napis={['BHP', 'fartuch', 'rękawice', 'okulary']} tlo="#1864ab" kolor="#ffffff" />
      <Plakat x={-2.85} y={1.75} napis={['GHS', '⚠', 'karty', 'charakterystyk']} tlo="#fff5f5" kolor="#c92a2a" />
      <group position={[4.95, 1.65, Z_SCIANY + 0.06]}>
        <mesh>
          <boxGeometry args={[0.36, 0.36, 0.1]} />
          <meshStandardMaterial color="#2b8a3e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <boxGeometry args={[0.2, 0.06, 0.002]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <boxGeometry args={[0.06, 0.2, 0.002]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      </group>

      {/* stolik egzaminatora */}
      <group position={[3.55, 0, -2.1]}>
        <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.035, 0.6]} />
          <meshStandardMaterial color="#c8a77d" roughness={0.6} />
        </mesh>
        {[[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.36, z]} material={STAL}>
            <cylinderGeometry args={[0.018, 0.018, 0.72, 8]} />
          </mesh>
        ))}
        <mesh position={[-0.15, 0.752, 0.05]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <planeGeometry args={[0.21, 0.3]} />
          <meshStandardMaterial color="#fbfbf8" />
        </mesh>
        <mesh position={[0.25, 0.752, 0]} rotation={[-Math.PI / 2, 0, -0.1]}>
          <planeGeometry args={[0.21, 0.3]} />
          <meshStandardMaterial color="#fbfbf8" />
        </mesh>
      </group>

      {/* wyspa – stanowisko egzaminacyjne */}
      <group position={[srodekX, 0, srodekZ - 0.02]}>
        <Szafki szer={szerWyspy - 0.08} wys={BLAT - 0.035} gl={glWyspy - 0.1} fronty={7} szuflady />
      </group>
      <mesh position={[srodekX, BLAT - 0.018, srodekZ]} material={BLAT_MAT} castShadow receiveShadow>
        <boxGeometry args={[szerWyspy, 0.036, glWyspy]} />
      </mesh>
    </group>
  );
}
