// Sprzęt laboratoryjny. Szkło to materiał z transmisją, ciecze są nieprzezroczyste (widać je przez szkło).
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Anim } from './animacje';
import { CHROM, PLASTIK_BIALY, PLASTIK_CIEMNY, STAL, SZKLO, SZKLO_BRAZ, etykieta, plyn, rysujEtykiete } from './materialy';
import { BARWY, BIURETA, gladko } from './uklad';

type AnimRef = MutableRefObject<Anim>;

function toczenie(p: [number, number][], seg = 36) {
  return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

const GEO_KOLBA = toczenie([[0, 0.002], [0.07, 0.002], [0.076, 0.009], [0.074, 0.022], [0.025, 0.15], [0.022, 0.166], [0.022, 0.2], [0.027, 0.21]]);
const GEO_KOLBA_PLYN = toczenie([[0, 0.006], [0.068, 0.006], [0.07, 0.02], [0.052, 0.068], [0, 0.068]]);
const GEO_ZLEWKA = toczenie([[0, 0.002], [0.04, 0.002], [0.043, 0.008], [0.043, 0.1], [0.046, 0.105]]);

const kolorTmp = new THREE.Color();

/** Kolba stożkowa. Barwa cieczy płynnie przechodzi z `plynOd` do `plynDo` w trakcie animacji. */
export function Kolba({ plynOd, plynDo, anim }: { plynOd?: string; plynDo?: string; anim?: AnimRef }) {
  const mat = useMemo(() => plyn(BARWY[plynDo ?? ''] ?? '#ffffff'), []);
  const ciecz = useRef<THREE.Mesh>(null);
  const mydlo = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const a = anim?.current;
    const t = a?.aktywna ? gladko(0.35, 0.92, a.p) : 1;
    const cOd = BARWY[plynOd ?? ''];
    const cDo = BARWY[plynDo ?? ''];
    const pokaz = t > 0.5 ? plynDo : plynOd;
    if (ciecz.current) {
      ciecz.current.visible = Boolean(BARWY[pokaz ?? '']);
      if (cOd && cDo) mat.color.set(cOd).lerp(kolorTmp.set(cDo), t);
      else if (cDo || cOd) mat.color.set((cDo ?? cOd)!);
    }
    if (mydlo.current) mydlo.current.visible = pokaz === 'mydlo';
  });
  return (
    <group>
      <mesh geometry={GEO_KOLBA} material={SZKLO} castShadow />
      <mesh ref={ciecz} geometry={GEO_KOLBA_PLYN} material={mat} />
      <mesh ref={mydlo} position={[0.01, 0.012, 0]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.045, 0.014, 0.03]} />
        <meshStandardMaterial color="#efe6c8" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Zlewka({ plyn: p, papierek }: { plyn?: string; papierek?: string }) {
  const kolor = BARWY[p ?? ''];
  const mat = useMemo(() => plyn(kolor ?? '#fff'), [kolor]);
  return (
    <group>
      <mesh geometry={GEO_ZLEWKA} material={SZKLO} castShadow />
      {[0.03, 0.05, 0.07].map((y) => (
        <mesh key={y} position={[0, y, 0.0435]}>
          <boxGeometry args={[0.014, 0.0012, 0.0008]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {kolor && (
        <mesh position={[0, 0.036, 0]} material={mat}>
          <cylinderGeometry args={[0.0405, 0.039, 0.06, 28]} />
        </mesh>
      )}
      {/* skala barw pH i papierek po odczycie */}
      {papierek && papierek !== 'brak' && (
        <mesh position={[0.1, 0.0045, 0.05]} rotation={[-Math.PI / 2, 0, 0.25]}>
          <planeGeometry args={[0.009, 0.06]} />
          <meshStandardMaterial color={BARWY[papierek] ?? '#f1d36b'} />
        </mesh>
      )}
    </group>
  );
}

function Biureta({ poziomOd, poziomDo, lejek, anim }: { poziomOd: number; poziomDo: number; lejek: boolean; anim: AnimRef }) {
  const slup = useRef<THREE.Mesh>(null);
  const { dol, dlugosc } = BIURETA;
  const r = 0.0115;
  const y0 = dol + 0.07;
  useFrame(() => {
    const a = anim.current;
    const t = a.aktywna ? gladko(0.2, 0.9, a.p) : 1;
    const poziom = THREE.MathUtils.clamp(poziomOd + (poziomDo - poziomOd) * t, 0, 1);
    if (slup.current) {
      const h = dlugosc * 0.93 * poziom;
      slup.current.visible = h > 0.002;
      slup.current.scale.y = Math.max(h, 0.001);
      slup.current.position.y = y0 + h / 2;
    }
  });
  return (
    <group>
      <mesh position={[0, y0 + dlugosc / 2, 0]} material={SZKLO} castShadow>
        <cylinderGeometry args={[r, r, dlugosc, 20, 1, true]} />
      </mesh>
      {/* podziałka: dłuższe kreski co 5 */}
      {Array.from({ length: 26 }, (_, i) => (
        <mesh key={i} position={[0, y0 + dlugosc * 0.93 - (i / 25) * dlugosc * 0.88, r + 0.0003]}>
          <boxGeometry args={[i % 5 === 0 ? 0.016 : 0.009, 0.0011, 0.0004]} />
          <meshBasicMaterial color="#16324f" />
        </mesh>
      ))}
      <mesh ref={slup} material={useMemo(() => plyn(BARWY.titrant), [])}>
        <cylinderGeometry args={[r * 0.82, r * 0.82, 1, 14]} />
      </mesh>
      {/* kranik teflonowy */}
      <mesh position={[0, dol + 0.05, 0]} material={SZKLO}>
        <cylinderGeometry args={[0.011, 0.006, 0.04, 14]} />
      </mesh>
      <mesh position={[0, dol + 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.045, 12]} />
        <meshStandardMaterial color="#f4f4f1" roughness={0.4} />
      </mesh>
      <mesh position={[0.03, dol + 0.045, 0]}>
        <boxGeometry args={[0.012, 0.034, 0.008]} />
        <meshStandardMaterial color="#2f9e6e" roughness={0.4} />
      </mesh>
      <mesh position={[0, dol + 0.012, 0]} material={SZKLO}>
        <cylinderGeometry args={[0.0045, 0.0018, 0.045, 10]} />
      </mesh>
      {lejek && (
        <group position={[0, y0 + dlugosc, 0]}>
          <mesh position={[0, 0.045, 0]} rotation={[Math.PI, 0, 0]} material={SZKLO}>
            <coneGeometry args={[0.035, 0.05, 24, 1, true]} />
          </mesh>
          <mesh position={[0, 0.005, 0]} material={SZKLO}>
            <cylinderGeometry args={[0.005, 0.004, 0.04, 10, 1, true]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Statyw(props: { zestaw: boolean; lejek: boolean; poziomOd: number; poziomDo: number; anim: AnimRef }) {
  const { dol, dlugosc } = BIURETA;
  const yLapy = dol + 0.07 + dlugosc * 0.62;
  return (
    <group>
      {/* biała podstawa – na niej stoi kolba podczas miareczkowania */}
      <mesh position={[0.05, 0.011, -0.01]} castShadow receiveShadow material={PLASTIK_BIALY}>
        <boxGeometry args={[0.32, 0.022, 0.22]} />
      </mesh>
      <mesh position={[0.16, 0.42, -0.07]} castShadow material={CHROM}>
        <cylinderGeometry args={[0.007, 0.007, 0.84, 12]} />
      </mesh>
      {props.zestaw ? (
        <>
          {/* łącznik i łapa */}
          <mesh position={[0.16, yLapy, -0.07]} material={STAL}>
            <boxGeometry args={[0.028, 0.03, 0.028]} />
          </mesh>
          <mesh position={[0.08, yLapy, -0.035]} rotation={[0, -0.42, Math.PI / 2]} material={STAL}>
            <cylinderGeometry args={[0.005, 0.005, 0.18, 8]} />
          </mesh>
          <mesh position={[0, yLapy, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.016, 0.005, 8, 20]} />
            <meshStandardMaterial color="#c9772e" roughness={0.6} />
          </mesh>
          <Biureta {...props} />
        </>
      ) : (
        <group position={[-0.3, 0.012, 0.2]} rotation={[0, 0.12, Math.PI / 2]}>
          <group position={[0, -dol - 0.07 - dlugosc / 2, 0]}>
            <Biureta {...props} lejek={false} />
          </group>
        </group>
      )}
    </group>
  );
}

export function Waga({ wlaczona, anim }: { wlaczona: boolean; anim: AnimRef }) {
  const { tekstura, ctx } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tekstura: t, ctx: c.getContext('2d')! };
  }, []);
  const ostatni = useRef('');
  useFrame(() => {
    const a = anim.current;
    let tekst = '';
    if (wlaczona) {
      let m = 0;
      if (a.aktywna && a.typ === 'wazenie') m = a.p < 0.3 ? 0 : a.p < 0.55 ? 1.12 * gladko(0.3, 0.42, a.p) : a.p < 0.92 ? 1.12 + 0.89 * gladko(0.55, 0.7, a.p) : 0;
      tekst = `${m.toFixed(2).replace('.', ',')} g`;
    }
    if (tekst !== ostatni.current) {
      ostatni.current = tekst;
      rysujEtykiete(ctx, 256, 96, [tekst], { tlo: wlaczona ? '#bfe3c0' : '#1c2226', kolor: '#10231a', rozmiar: 60 });
      tekstura.needsUpdate = true;
    }
  });
  return (
    <group>
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow material={PLASTIK_BIALY}>
        <boxGeometry args={[0.26, 0.07, 0.3]} />
      </mesh>
      <mesh position={[0, 0.071, -0.03]} material={PLASTIK_CIEMNY}>
        <cylinderGeometry args={[0.092, 0.092, 0.004, 32]} />
      </mesh>
      <mesh position={[0, 0.082, -0.03]} castShadow material={STAL}>
        <cylinderGeometry args={[0.085, 0.085, 0.006, 32]} />
      </mesh>
      {/* panel z wyświetlaczem i przyciskami – od strony kamery */}
      <mesh position={[0, 0.04, 0.1505]}>
        <planeGeometry args={[0.13, 0.045]} />
        <meshBasicMaterial map={tekstura} toneMapped={false} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.04, 0.152]} material={PLASTIK_CIEMNY}>
          <boxGeometry args={[0.03, 0.02, 0.004]} />
        </mesh>
      ))}
    </group>
  );
}

export function PojemnikOdpady() {
  const tex = useMemo(() => etykieta(['ODPADY', 'CIEKŁE'], { tlo: '#ffd43b', kolor: '#1b1b1b', ramka: '#1b1b1b', w: 256, h: 160 }), []);
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.24, 24]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 0.03, 20]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.035, 16]} />
        <meshStandardMaterial color="#c92a2a" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.0756, 0.0756, 0.11, 24, 1, true, 0, 1.2]} />
        <meshStandardMaterial map={tex} />
      </mesh>
    </group>
  );
}

export function Butelka({ napis, braz = false, wys = 0.17, r = 0.036, zakretka = '#1d4ed8' }: { napis: string[]; braz?: boolean; wys?: number; r?: number; zakretka?: string }) {
  const tex = useMemo(() => etykieta(napis, { w: 256, h: 160, pasek: braz ? '#e8590c' : '#1971c2' }), [napis.join('|')]);
  return (
    <group>
      <mesh position={[0, wys / 2, 0]} castShadow material={braz ? SZKLO_BRAZ : SZKLO}>
        <cylinderGeometry args={[r, r, wys, 20]} />
      </mesh>
      {!braz && (
        <mesh position={[0, wys * 0.36, 0]} material={useMemo(() => plyn('#d5e9f3'), [])}>
          <cylinderGeometry args={[r * 0.93, r * 0.93, wys * 0.68, 20]} />
        </mesh>
      )}
      <mesh position={[0, wys + 0.012, 0]} material={braz ? SZKLO_BRAZ : SZKLO}>
        <cylinderGeometry args={[r * 0.45, r * 0.8, 0.025, 16]} />
      </mesh>
      <mesh position={[0, wys + 0.035, 0]}>
        <cylinderGeometry args={[r * 0.52, r * 0.52, 0.025, 16]} />
        <meshStandardMaterial color={zakretka} roughness={0.45} />
      </mesh>
      <mesh position={[0, wys * 0.5, 0]} rotation={[0, -0.7, 0]}>
        <cylinderGeometry args={[r + 0.0006, r + 0.0006, wys * 0.5, 20, 1, true, 0, 1.4]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Cylinder({ woda = true }: { woda?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.004, 0]} material={SZKLO}>
        <cylinderGeometry args={[0.035, 0.038, 0.008, 6]} />
      </mesh>
      <mesh position={[0, 0.11, 0]} castShadow material={SZKLO}>
        <cylinderGeometry args={[0.017, 0.017, 0.21, 20, 1, true]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[0, 0.03 + i * 0.017, 0.0174]}>
          <boxGeometry args={[i % 5 === 0 ? 0.014 : 0.008, 0.001, 0.0004]} />
          <meshBasicMaterial color="#16324f" />
        </mesh>
      ))}
      {woda && (
        <mesh position={[0, 0.095, 0]} material={useMemo(() => plyn(BARWY.bezbarwny), [])}>
          <cylinderGeometry args={[0.0155, 0.0155, 0.17, 16]} />
        </mesh>
      )}
    </group>
  );
}

export function Tryskawka() {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.034, 0.14, 20]} />
        <meshPhysicalMaterial color="#f4f8fa" transmission={0.5} roughness={0.35} thickness={0.02} />
      </mesh>
      <mesh position={[0, 0.155, 0]}>
        <cylinderGeometry args={[0.016, 0.03, 0.03, 16]} />
        <meshStandardMaterial color="#e03131" roughness={0.4} />
      </mesh>
      <mesh position={[0.03, 0.19, 0]} rotation={[0, 0, -1.0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.09, 8]} />
        <meshStandardMaterial color="#e03131" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Zlew wpuszczony w blat, z wysoką wylewką. Woda leci podczas mycia. */
export function Zlew({ anim }: { anim: AnimRef }) {
  const woda = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const a = anim.current;
    if (woda.current) woda.current.visible = a.aktywna && a.typ === 'mycie' && a.sprzet === 'zlew' && a.p > 0.12 && a.p < 0.9;
  });
  return (
    <group>
      <mesh position={[0, -0.003, 0]} material={STAL} receiveShadow>
        <boxGeometry args={[0.5, 0.012, 0.4]} />
      </mesh>
      <mesh position={[0, 0.0035, 0]}>
        <boxGeometry args={[0.42, 0.002, 0.32]} />
        <meshStandardMaterial color="#6d757b" metalness={0.9} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.002, 16]} />
        <meshStandardMaterial color="#2b2f33" metalness={0.8} roughness={0.3} />
      </mesh>
      <group position={[0, 0, -0.17]}>
        <mesh position={[0, 0.16, 0]} material={CHROM} castShadow>
          <cylinderGeometry args={[0.011, 0.014, 0.32, 12]} />
        </mesh>
        <mesh position={[0, 0.32, 0.06]} rotation={[0, Math.PI / 2, 0]} material={CHROM}>
          <torusGeometry args={[0.06, 0.011, 10, 20, Math.PI]} />
        </mesh>
        <mesh position={[0, 0.3, 0.12]} material={CHROM}>
          <cylinderGeometry args={[0.011, 0.011, 0.04, 12]} />
        </mesh>
        <mesh ref={woda} position={[0, 0.14, 0.12]} visible={false}>
          <cylinderGeometry args={[0.006, 0.008, 0.28, 8]} />
          <meshStandardMaterial color="#cfe9f7" transparent opacity={0.7} roughness={0.1} />
        </mesh>
        <mesh position={[0.06, 0.03, 0]} material={CHROM}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 10]} />
        </mesh>
      </group>
    </group>
  );
}
