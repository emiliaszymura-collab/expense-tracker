// Przyrządy do metod instrumentalnych: refraktometr Abbego, polarymetr, spektrofotometr, pH-metr.
// Budowane z prostych brył (bez plików), proporcje jak w przyrządach z pracowni szkolnych.
import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Anim } from './animacje';
import { CHROM, PLASTIK_BIALY, PLASTIK_CIEMNY, STAL, SZKLO } from './materialy';
import { gladko } from './uklad';

type AnimRef = MutableRefObject<Anim>;

const EMALIA = new THREE.MeshStandardMaterial({ color: '#d9d3c3', roughness: 0.42, metalness: 0.12 });
const EMALIA_CIEMNA = new THREE.MeshStandardMaterial({ color: '#3f4a4f', roughness: 0.4, metalness: 0.25 });
const GUMA = new THREE.MeshStandardMaterial({ color: '#141617', roughness: 0.85 });
const PRYZMAT = new THREE.MeshStandardMaterial({ color: '#2c3e4a', roughness: 0.05, metalness: 0.4 });

/** Geometria refraktometru (lokalnie, względem środka podstawy). Strona laboranta to -z. */
export const ABBE = {
  /** Górna powierzchnia dolnego pryzmatu – tu nanosi się próbkę. */
  pryzmat: new THREE.Vector3(0, 0.227, -0.085),
  /** Okular – tu laborant przykłada oko. */
  okular: new THREE.Vector3(0, 0.44, -0.07),
  /** Pokrętło pomiarowe (prawa ręka) i kompensatora (lewa). */
  pokretlo: new THREE.Vector3(0.075, 0.14, 0.02),
  kompensator: new THREE.Vector3(-0.05, 0.33, -0.02),
};

/** Ile otwarty jest górny pryzmat (0–1) – przy nanoszeniu próbki i myciu pryzmatu. */
function otwarciePryzmatu(a: Anim) {
  if (!a.aktywna || a.sprzet !== 'przyrzad') return 0;
  if (a.typ !== 'pipetowanie' && a.typ !== 'mycie') return 0;
  return gladko(0.02, 0.2, a.p) * (1 - gladko(0.8, 0.96, a.p));
}

export function RefraktometrAbbego({ anim }: { anim: AnimRef }) {
  const pokrywa = useRef<THREE.Group>(null);
  const pokretlo = useRef<THREE.Mesh>(null);
  const probka = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const a = anim.current;
    if (pokrywa.current) {
      const cel = otwarciePryzmatu(a) * 1.25;
      pokrywa.current.rotation.x += (cel - pokrywa.current.rotation.x) * Math.min(1, dt * 10);
    }
    if (pokretlo.current && a.aktywna && a.sprzet === 'przyrzad' && (a.typ === 'pokretlo' || a.typ === 'okular')) pokretlo.current.rotation.x += dt * 1.4;
    if (probka.current) probka.current.visible = a.aktywna && a.sprzet === 'przyrzad' && a.typ === 'pipetowanie' && a.p > 0.45 && a.p < 0.85;
  });
  const P = ABBE.pryzmat;
  return (
    <group>
      {/* podstawa i kolumna (z tyłu, od strony egzaminatora) */}
      <mesh position={[0, 0.016, 0]} material={EMALIA_CIEMNA} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.032, 0.22]} />
      </mesh>
      <mesh position={[0, 0.16, 0.035]} material={EMALIA} castShadow>
        <boxGeometry args={[0.09, 0.26, 0.09]} />
      </mesh>
      {/* tarcza ze skalą i pokrętło pomiarowe z boku */}
      <mesh position={[0.05, 0.14, 0.03]} rotation={[0, 0, Math.PI / 2]} material={EMALIA}>
        <cylinderGeometry args={[0.055, 0.055, 0.02, 32]} />
      </mesh>
      <mesh ref={pokretlo} position={[ABBE.pokretlo.x, ABBE.pokretlo.y, ABBE.pokretlo.z]} rotation={[0, 0, Math.PI / 2]} material={GUMA}>
        <cylinderGeometry args={[0.028, 0.028, 0.024, 20]} />
      </mesh>
      {/* głowica z pryzmatami – od strony laboranta */}
      <mesh position={[0, 0.2, -0.065]} material={EMALIA} castShadow>
        <boxGeometry args={[0.1, 0.05, 0.1]} />
      </mesh>
      {/* dolny pryzmat (pomiarowy) – ciemne szkło */}
      <mesh position={[0, P.y, P.z]} rotation={[-Math.PI / 2, 0, 0]} material={PRYZMAT}>
        <planeGeometry args={[0.05, 0.03]} />
      </mesh>
      {/* kropla próbki na pryzmacie */}
      <mesh ref={probka} position={[0, P.y + 0.002, P.z]} scale={[1, 0.25, 1]} visible={false}>
        <sphereGeometry args={[0.009, 12, 8]} />
        <meshStandardMaterial color="#f2d27a" roughness={0.05} transparent opacity={0.85} />
      </mesh>
      {/* górny pryzmat (oświetlający) na zawiasie od strony kolumny – unosi się przy nanoszeniu próbki */}
      <group ref={pokrywa} position={[0, P.y + 0.001, -0.025]}>
        <mesh position={[0, 0.017, -0.045]} material={EMALIA} castShadow>
          <boxGeometry args={[0.09, 0.034, 0.09]} />
        </mesh>
        <mesh position={[0, 0.0, -0.06]} rotation={[Math.PI / 2, 0, 0]} material={PRYZMAT}>
          <planeGeometry args={[0.05, 0.03]} />
        </mesh>
        {/* okienko oświetlenia */}
        <mesh position={[0, 0.035, -0.06]} rotation={[-Math.PI / 2, 0, 0]} material={SZKLO}>
          <circleGeometry args={[0.014, 16]} />
        </mesh>
      </group>
      <mesh position={[0, P.y + 0.001, -0.025]} rotation={[0, 0, Math.PI / 2]} material={CHROM}>
        <cylinderGeometry args={[0.006, 0.006, 0.1, 10]} />
      </mesh>
      {/* termometr przy pryzmatach */}
      <mesh position={[-0.062, 0.215, -0.09]} rotation={[-0.4, 0, 0]} material={SZKLO}>
        <cylinderGeometry args={[0.004, 0.004, 0.08, 8]} />
      </mesh>
      <mesh position={[-0.062, 0.2, -0.1]} rotation={[-0.4, 0, 0]}>
        <cylinderGeometry args={[0.0015, 0.0015, 0.04, 6]} />
        <meshStandardMaterial color="#c92a2a" />
      </mesh>
      {/* lusterko oświetlające za pryzmatami */}
      <group position={[0, 0.26, 0.1]} rotation={[-0.7, 0, 0]}>
        <mesh material={CHROM}>
          <boxGeometry args={[0.06, 0.004, 0.045]} />
        </mesh>
      </group>
      {/* tubus lunetki pochylony do laboranta i okular */}
      <mesh position={[0, 0.355, -0.005]} rotation={[-0.6, 0, 0]} material={EMALIA} castShadow>
        <cylinderGeometry args={[0.022, 0.025, 0.17, 20]} />
      </mesh>
      <mesh position={[ABBE.okular.x, ABBE.okular.y - 0.01, ABBE.okular.z + 0.01]} rotation={[-0.6, 0, 0]} material={GUMA}>
        <cylinderGeometry args={[0.02, 0.017, 0.05, 20]} />
      </mesh>
      {/* pokrętło kompensatora (usuwa barwne zabarwienie granicy) */}
      <mesh position={[ABBE.kompensator.x, ABBE.kompensator.y, ABBE.kompensator.z]} rotation={[0, 0, Math.PI / 2]} material={PLASTIK_CIEMNY}>
        <cylinderGeometry args={[0.016, 0.016, 0.02, 16]} />
      </mesh>
      {/* tabliczka */}
      <mesh position={[0, 0.16, 0.0805]}>
        <planeGeometry args={[0.07, 0.02]} />
        <meshStandardMaterial color="#1f3b57" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Polarymetr półcieniowy: lampa sodowa z przodu, komora na rurkę, analizator z tarczą i okular od strony laboranta. */
export function Polarymetr({ anim, wlaczony }: { anim: AnimRef; wlaczony: boolean }) {
  const klapa = useRef<THREE.Group>(null);
  const tarcza = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const a = anim.current;
    const otw = a.aktywna && a.sprzet === 'przyrzad' && a.typ === 'siegnij' ? Math.sin(Math.PI * Math.min(1, a.p)) : 0;
    if (klapa.current) klapa.current.rotation.x += (-otw * 1.3 - klapa.current.rotation.x) * Math.min(1, dt * 8);
    if (tarcza.current && a.aktywna && a.sprzet === 'przyrzad' && (a.typ === 'okular' || a.typ === 'pokretlo')) tarcza.current.rotation.z += dt * 0.8;
  });
  return (
    <group>
      <mesh position={[0, 0.015, 0.02]} material={EMALIA_CIEMNA} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.03, 0.56]} />
      </mesh>
      {/* nóżki-podpory */}
      {[0.22, -0.14].map((z) => (
        <mesh key={z} position={[0, 0.07, z]} material={EMALIA}>
          <boxGeometry args={[0.04, 0.08, 0.04]} />
        </mesh>
      ))}
      {/* lampa sodowa */}
      <mesh position={[0, 0.15, 0.25]} material={EMALIA} castShadow>
        <boxGeometry args={[0.11, 0.13, 0.1]} />
      </mesh>
      <mesh position={[0, 0.15, 0.301]}>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial color={wlaczony ? '#ffc23a' : '#55504a'} toneMapped={false} />
      </mesh>
      {/* korpus z komorą na rurkę */}
      <mesh position={[0, 0.14, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={EMALIA} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.34, 24]} />
      </mesh>
      <group ref={klapa} position={[0.0, 0.178, -0.03]}>
        <mesh position={[0, 0, 0.07]} material={EMALIA_CIEMNA}>
          <boxGeometry args={[0.08, 0.008, 0.16]} />
        </mesh>
      </group>
      {/* tarcza analizatora z noniuszem */}
      <group position={[0, 0.15, -0.16]}>
        <group ref={tarcza}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={CHROM}>
            <cylinderGeometry args={[0.075, 0.075, 0.014, 40]} />
          </mesh>
        </group>
        <mesh position={[0.06, -0.04, 0]} rotation={[0, 0, Math.PI / 2]} material={GUMA}>
          <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
        </mesh>
      </group>
      {/* okular */}
      <mesh position={[0, 0.15, -0.2]} rotation={[Math.PI / 2, 0, 0]} material={GUMA}>
        <cylinderGeometry args={[0.017, 0.02, 0.06, 20]} />
      </mesh>
    </group>
  );
}

/** Rurka polarymetryczna 2 dm w uchwycie – napełniana pionowo, bez pęcherzyka powietrza. */
export function RurkaPolarymetryczna({ pelna }: { pelna: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} material={PLASTIK_BIALY}>
        <cylinderGeometry args={[0.03, 0.035, 0.02, 20]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={SZKLO}>
        <cylinderGeometry args={[0.009, 0.009, 0.2, 14]} />
      </mesh>
      {pelna && (
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.0075, 0.0075, 0.18, 12]} />
          <meshStandardMaterial color="#efe2a0" roughness={0.1} transparent opacity={0.6} />
        </mesh>
      )}
      {[0.02, 0.22].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={CHROM}>
          <cylinderGeometry args={[0.013, 0.013, 0.015, 16]} />
        </mesh>
      ))}
    </group>
  );
}

/** Spektrofotometr UV-Vis z komorą na kuwetę i wyświetlaczem. */
export function Spektrofotometr({ anim, wlaczony }: { anim: AnimRef; wlaczony: boolean }) {
  const klapa = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const a = anim.current;
    const otw = a.aktywna && a.sprzet === 'przyrzad' && a.typ === 'siegnij' ? Math.sin(Math.PI * Math.min(1, a.p)) : 0;
    if (klapa.current) klapa.current.rotation.x += (-otw * 1.4 - klapa.current.rotation.x) * Math.min(1, dt * 8);
  });
  return (
    <group>
      <mesh position={[0, 0.08, 0]} material={PLASTIK_BIALY} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.16, 0.32]} />
      </mesh>
      {/* wyświetlacz i klawiatura od strony laboranta (tył bryły = -z) */}
      <mesh position={[-0.07, 0.12, -0.163]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.16, 0.06]} />
        <meshStandardMaterial color={wlaczony ? '#0e5a66' : '#1c2226'} emissive={wlaczony ? '#0b8a9a' : '#000'} emissiveIntensity={wlaczony ? 0.7 : 0} roughness={0.2} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.07 + i * 0.03, 0.06, -0.163]} rotation={[0, Math.PI, 0]} material={PLASTIK_CIEMNY}>
          <planeGeometry args={[0.022, 0.016]} />
        </mesh>
      ))}
      {/* komora kuwety z klapką */}
      <group ref={klapa} position={[0.1, 0.161, 0.02]}>
        <mesh position={[0, 0.005, -0.04]} material={PLASTIK_CIEMNY}>
          <boxGeometry args={[0.12, 0.01, 0.09]} />
        </mesh>
      </group>
    </group>
  );
}

/** Statyw na kuwety z jedną kuwetą. */
export function Kuwety({ barwa }: { barwa?: string }) {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} material={PLASTIK_BIALY}>
        <boxGeometry args={[0.12, 0.03, 0.04]} />
      </mesh>
      {[-0.03, 0.03].map((x, i) => (
        <group key={x} position={[x, 0.05, 0]}>
          <mesh material={SZKLO}>
            <boxGeometry args={[0.012, 0.045, 0.012]} />
          </mesh>
          {barwa && i === 0 && (
            <mesh position={[0, -0.004, 0]}>
              <boxGeometry args={[0.01, 0.032, 0.01]} />
              <meshStandardMaterial color={barwa} roughness={0.1} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** pH-metr z elektrodą na ramieniu – elektroda opuszcza się do zlewki przy pomiarze. */
export function PhMetr({ anim, zanurzona }: { anim: AnimRef; zanurzona: boolean }) {
  const ramie = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const a = anim.current;
    let cel = zanurzona ? -0.07 : 0;
    if (a.aktywna && a.sprzet === 'zlewka' && a.krokId === 'ph') cel = -0.07 * gladko(0.15, 0.4, a.p);
    if (ramie.current) ramie.current.position.y += (0.24 + cel - ramie.current.position.y) * Math.min(1, dt * 6);
  });
  return (
    <group>
      {/* miernik */}
      <mesh position={[0.2, 0.03, -0.02]} material={PLASTIK_BIALY} castShadow>
        <boxGeometry args={[0.13, 0.06, 0.1]} />
      </mesh>
      <mesh position={[0.2, 0.045, -0.071]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshStandardMaterial color="#0e5a66" emissive="#0b8a9a" emissiveIntensity={0.6} />
      </mesh>
      {/* statyw elektrody */}
      <mesh position={[0.08, 0.005, -0.03]} material={PLASTIK_CIEMNY}>
        <boxGeometry args={[0.07, 0.01, 0.07]} />
      </mesh>
      <mesh position={[0.08, 0.16, -0.03]} material={CHROM}>
        <cylinderGeometry args={[0.005, 0.005, 0.3, 10]} />
      </mesh>
      <group ref={ramie} position={[0, 0.24, 0]}>
        <mesh position={[0.04, 0, -0.015]} rotation={[0, 0.35, Math.PI / 2]} material={STAL}>
          <cylinderGeometry args={[0.004, 0.004, 0.09, 8]} />
        </mesh>
        {/* elektroda */}
        <mesh position={[0, -0.06, 0]} material={SZKLO}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 10]} />
        </mesh>
        <mesh position={[0, 0.01, 0]} material={PLASTIK_CIEMNY}>
          <cylinderGeometry args={[0.007, 0.007, 0.03, 10]} />
        </mesh>
      </group>
    </group>
  );
}
