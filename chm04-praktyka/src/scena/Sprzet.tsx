// Sprzęt laboratoryjny z prostych brył. Każdy element czyta tylko potrzebną część stanu sceny.
import { useMemo } from 'react';
import * as THREE from 'three';
import { BARWY } from './uklad';

const SZKLO = { color: '#cfe8f2', transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0, depthWrite: false };
const METAL = { color: '#8a939b', roughness: 0.35, metalness: 0.8 };

/** Profil kolby stożkowej (Erlenmeyera) obracany wokół osi Y. */
function profilKolby(skala = 1): THREE.Vector2[] {
  const p: [number, number][] = [
    [0, 0], [0.11, 0], [0.12, 0.01], [0.12, 0.02], [0.035, 0.17], [0.03, 0.19], [0.03, 0.24], [0.034, 0.25],
  ];
  return p.map(([x, y]) => new THREE.Vector2(x * skala, y * skala));
}

export function Kolba({ plyn, skala = 1 }: { plyn?: string; skala?: number }) {
  const szklo = useMemo(() => new THREE.LatheGeometry(profilKolby(skala), 32), [skala]);
  const plynGeo = useMemo(() => {
    const h = 0.07 * skala;
    const r0 = 0.112 * skala;
    const r1 = r0 - (0.085 * skala * h) / (0.15 * skala);
    return new THREE.CylinderGeometry(r1, r0, h, 32);
  }, [skala]);
  const kolor = plyn && plyn !== 'pusta' ? BARWY[plyn] : undefined;
  return (
    <group>
      <mesh geometry={szklo} castShadow>
        <meshStandardMaterial {...SZKLO} side={THREE.DoubleSide} />
      </mesh>
      {plyn === 'mydlo' && (
        <mesh position={[0, 0.012 * skala, 0]}>
          <boxGeometry args={[0.05 * skala, 0.02 * skala, 0.04 * skala]} />
          <meshStandardMaterial color={BARWY.mydlo} roughness={0.8} />
        </mesh>
      )}
      {kolor && plyn !== 'mydlo' && (
        <mesh geometry={plynGeo} position={[0, 0.036 * skala, 0]}>
          <meshStandardMaterial color={kolor} transparent opacity={0.85} roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

export function Statyw({ zestaw, lejek, poziom }: { zestaw: boolean; lejek: boolean; poziom: number }) {
  const dlugosc = 0.75;
  return (
    <group>
      {/* podstawa i pręt */}
      <mesh position={[0, 0.012, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.024, 0.22]} />
        <meshStandardMaterial color="#2f3438" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.55, -0.12]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 1.1, 12]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {zestaw ? (
        <group position={[0, 0.22, 0]}>
          {/* łapa */}
          <mesh position={[0, 0.5, -0.06]}>
            <boxGeometry args={[0.03, 0.025, 0.12]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
          <Biureta poziom={poziom} dlugosc={dlugosc} lejek={lejek} />
        </group>
      ) : (
        // Biureta odłożona na stół, gdy zestaw nie jest zmontowany.
        <group position={[0.05, 0.02, 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <Biureta poziom={poziom} dlugosc={dlugosc} lejek={false} />
        </group>
      )}
    </group>
  );
}

function Biureta({ poziom, dlugosc, lejek }: { poziom: number; dlugosc: number; lejek: boolean }) {
  const r = 0.014;
  const wys = dlugosc * Math.max(0, Math.min(1, poziom)) * 0.92;
  return (
    <group>
      <mesh position={[0, dlugosc / 2 + 0.06, 0]}>
        <cylinderGeometry args={[r, r, dlugosc, 16, 1, true]} />
        <meshStandardMaterial {...SZKLO} side={THREE.DoubleSide} />
      </mesh>
      {/* podziałka */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[0, 0.06 + dlugosc * 0.04 + i * dlugosc * 0.088, r + 0.0005]}>
          <boxGeometry args={[0.012, 0.0015, 0.0005]} />
          <meshBasicMaterial color="#1d3557" />
        </mesh>
      ))}
      {wys > 0 && (
        <mesh position={[0, 0.06 + wys / 2, 0]}>
          <cylinderGeometry args={[r * 0.85, r * 0.85, wys, 12]} />
          <meshStandardMaterial color={BARWY.titrant} transparent opacity={0.7} />
        </mesh>
      )}
      {/* kranik i wylot */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.05, 0.012, 0.012]} />
        <meshStandardMaterial color="#2d6a4f" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.003, 0.005, 0.05, 8]} />
        <meshStandardMaterial {...SZKLO} />
      </mesh>
      {lejek && (
        <mesh position={[0, dlugosc + 0.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.04, 0.07, 20, 1, true]} />
          <meshStandardMaterial {...SZKLO} opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function Waga({ wlaczona }: { wlaczona: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.08, 0.38]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.088, -0.03]}>
        <cylinderGeometry args={[0.1, 0.1, 0.01, 32]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.07, 0.17]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.01]} />
        <meshStandardMaterial color={wlaczona ? '#4ade80' : '#1f2937'} emissive={wlaczona ? '#22c55e' : '#000'} emissiveIntensity={wlaczona ? 0.7 : 0} />
      </mesh>
    </group>
  );
}

export function Zlewka({ plyn, papierek }: { plyn?: string; papierek?: string }) {
  const kolor = plyn && plyn !== 'pusta' ? BARWY[plyn] : undefined;
  return (
    <group>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.052, 0.14, 28, 1, true]} />
        <meshStandardMaterial {...SZKLO} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.004, 28]} />
        <meshStandardMaterial {...SZKLO} />
      </mesh>
      {kolor && (
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.066, 28]} />
          <meshStandardMaterial color={kolor} transparent opacity={0.75} />
        </mesh>
      )}
      {papierek && papierek !== 'brak' && (
        <mesh position={[0.11, 0.003, 0.02]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <planeGeometry args={[0.012, 0.07]} />
          <meshStandardMaterial color={BARWY[papierek] ?? '#f5d76e'} />
        </mesh>
      )}
    </group>
  );
}

export function PojemnikOdpady() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.24, 20]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 0.13, 0.081]}>
        <planeGeometry args={[0.1, 0.07]} />
        <meshStandardMaterial color="#fff7d6" />
      </mesh>
    </group>
  );
}

export function Butelka({ kolor, etykieta = '#ffffff', wys = 0.18 }: { kolor: string; etykieta?: string; wys?: number }) {
  return (
    <group>
      <mesh position={[0, wys / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, wys, 16]} />
        <meshStandardMaterial color={kolor} roughness={0.2} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, wys + 0.02, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.04, 12]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, wys * 0.5, 0.041]}>
        <planeGeometry args={[0.05, 0.05]} />
        <meshStandardMaterial color={etykieta} />
      </mesh>
    </group>
  );
}

export function Zlew() {
  return (
    <group>
      <mesh position={[0, -0.005, 0]} receiveShadow>
        <boxGeometry args={[0.6, 0.012, 0.45]} />
        <meshStandardMaterial color="#b8c1c8" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.25, -0.2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 10]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.49, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 10]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
    </group>
  );
}
