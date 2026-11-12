// Scena 3D: stół laboratoryjny, sprzęt i laborant.
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Laborant } from './Laborant';
import { Butelka, Kolba, PojemnikOdpady, Statyw, Waga, Zlew, Zlewka } from './Sprzet';
import { NAZWY_SPRZETU, POZYCJE, WYSOKOSC_STOLU } from './uklad';

export type StanSceny = Record<string, string | number | boolean>;

interface Props {
  stan: StanSceny;
  aktywnySprzet?: string;
  impuls: number;
  pokazEtykiety: boolean;
}

/** Na wąskim ekranie (telefon) poszerza pole widzenia, żeby cały stół mieścił się w kadrze. */
function KameraDopasowanie() {
  const { camera, size } = useThree();
  useEffect(() => {
    const kamera = camera as THREE.PerspectiveCamera;
    const proporcje = size.width / size.height;
    const poziomeFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(45) / 2) * 1.7);
    const pionoweFov = 2 * Math.atan(Math.tan(poziomeFov / 2) / proporcje);
    kamera.fov = Math.min(80, Math.max(45, THREE.MathUtils.radToDeg(pionoweFov)));
    kamera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Podswietlenie({ id }: { id?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.15;
  });
  if (!id || id === 'stol' || !POZYCJE[id]) return null;
  const [x, y, z] = POZYCJE[id];
  return (
    <mesh ref={ref} position={[x, y + 0.003, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.26, 40]} />
      <meshBasicMaterial color="#14b8a6" transparent opacity={0.4} />
    </mesh>
  );
}

function Etykieta({ id }: { id: string }) {
  const [x, y, z] = POZYCJE[id];
  return (
    <Html position={[x, y - 0.06, z + 0.32]} center distanceFactor={3.2} zIndexRange={[10, 0]}>
      <span className="etykieta-3d">{NAZWY_SPRZETU[id]}</span>
    </Html>
  );
}

function Pomieszczenie() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#d6dde3" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, -0.9]} receiveShadow>
        <planeGeometry args={[14, 5]} />
        <meshStandardMaterial color="#eef2f5" roughness={1} />
      </mesh>
      {/* kafelki za stołem */}
      <mesh position={[0, 1.3, -0.885]}>
        <planeGeometry args={[8.2, 0.8]} />
        <meshStandardMaterial color="#e1ecf0" roughness={0.4} />
      </mesh>
      {/* stół: blat + szafki */}
      <mesh position={[0, WYSOKOSC_STOLU - 0.025, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.05, 1.2]} />
        <meshStandardMaterial color="#2f3e46" roughness={0.35} />
      </mesh>
      <mesh position={[0, (WYSOKOSC_STOLU - 0.05) / 2, -0.15]} receiveShadow>
        <boxGeometry args={[7.9, WYSOKOSC_STOLU - 0.05, 1.05]} />
        <meshStandardMaterial color="#cfd8dc" roughness={0.7} />
      </mesh>
      {/* półka z odczynnikami */}
      <mesh position={[-0.5, 1.55, -0.75]} castShadow>
        <boxGeometry args={[4, 0.03, 0.25]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      <group position={[-2.1, 1.565, -0.75]}>
        <Butelka kolor="#e3f2fd" etykieta="#ffe8a3" />
      </group>
      <group position={[-1.7, 1.565, -0.75]}>
        <Butelka kolor="#f4a261" etykieta="#ffffff" wys={0.12} />
      </group>
      <group position={[-1.3, 1.565, -0.75]}>
        <Butelka kolor="#5e3a1a" etykieta="#ffffff" wys={0.2} />
      </group>
      <group position={[-0.9, 1.565, -0.75]}>
        <Butelka kolor="#e9f5db" etykieta="#d0f4de" />
      </group>
    </group>
  );
}

export function Laboratorium({ stan, aktywnySprzet, impuls, pokazEtykiety }: Props) {
  // Laborant staje obok sprzętu (z prawej), żeby nie zasłaniać go kamerze.
  const celX = (POZYCJE[aktywnySprzet ?? '']?.[0] ?? POZYCJE.kolba[0]) + 0.42;
  const p = POZYCJE;
  const kolby = Number(stan.kolby ?? 1);

  return (
    <Canvas shadows camera={{ position: [0.2, 1.85, 2.7], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#e9eef2']} />
      <hemisphereLight args={['#ffffff', '#b8c4cc', 0.7]} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
      />
      <KameraDopasowanie />
      <Pomieszczenie />

      <group position={p.zlew}>
        <Zlew />
      </group>
      <group position={p.waga}>
        <Waga wlaczona={stan.waga === 'wlaczona'} />
      </group>
      <group position={p.kolba}>
        <Kolba plyn={stan.kolba as string | undefined} skala={1.2} />
        {Array.from({ length: Math.max(0, kolby - 1) }, (_, i) => (
          <group key={i} position={[-0.3 - i * 0.28, 0, -0.15]}>
            <Kolba plyn="pomaranczowy" skala={1.2} />
          </group>
        ))}
      </group>
      <group position={p.statyw}>
        <Statyw zestaw={Boolean(stan.zestaw)} lejek={Boolean(stan.lejek)} poziom={Number(stan.biuretaPoziom ?? 0)} />
      </group>
      <group position={p.zlewka}>
        <Zlewka plyn={stan.zlewka as string | undefined} papierek={stan.papierek as string | undefined} />
      </group>
      <group position={p.odpady}>
        <PojemnikOdpady />
      </group>

      <Podswietlenie id={aktywnySprzet} />
      {pokazEtykiety && Object.keys(NAZWY_SPRZETU).map((id) => <Etykieta key={id} id={id} />)}

      <Laborant
        celX={celX}
        fartuch={Boolean(stan.bhp_fartuch)}
        rekawice={Boolean(stan.bhp_rekawice)}
        okulary={Boolean(stan.bhp_okulary)}
        impuls={impuls}
      />
      <ContactShadows position={[0, 0.001, 0.6]} opacity={0.35} scale={10} blur={2.5} far={2} />
      <OrbitControls
        target={[0.2, 1.1, 0]}
        enablePan={false}
        minDistance={1.6}
        maxDistance={6}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
      />
    </Canvas>
  );
}
