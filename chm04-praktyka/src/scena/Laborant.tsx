// Prosty awatar laboranta z brył. Ubiór odzwierciedla założone środki ochrony.
// Etap 4: tu dojdą animacje czynności (ważenie, pipetowanie, przelewanie, miareczkowanie, odczyt).
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface Props {
  celX: number;
  fartuch: boolean;
  rekawice: boolean;
  okulary: boolean;
  /** Zmienia się przy każdej przyjętej czynności – wywołuje krótki ruch rąk. */
  impuls: number;
}

const SKORA = '#e8b896';

export function Laborant({ celX, fartuch, rekawice, okulary, impuls }: Props) {
  const grupa = useRef<THREE.Group>(null);
  const prawa = useRef<THREE.Group>(null);
  const lewa = useRef<THREE.Group>(null);
  const czasImpulsu = useRef({ wartosc: impuls, start: -10 });

  useFrame(({ clock }, dt) => {
    const g = grupa.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    if (czasImpulsu.current.wartosc !== impuls) czasImpulsu.current = { wartosc: impuls, start: t };

    const dx = celX - g.position.x;
    const idzie = Math.abs(dx) > 0.02;
    g.position.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 1.6);
    // lekki krok podczas chodzenia, oddech w miejscu
    g.position.y = idzie ? Math.abs(Math.sin(t * 9)) * 0.025 : Math.sin(t * 1.5) * 0.004;

    // ręce: wyciągnięte do stołu przez ~1,2 s po przyjęciu czynności
    const odImpulsu = t - czasImpulsu.current.start;
    const praca = odImpulsu < 1.2 ? Math.sin((odImpulsu / 1.2) * Math.PI) : 0;
    const machanie = idzie ? Math.sin(t * 9) * 0.5 : 0;
    if (prawa.current) prawa.current.rotation.x = -praca * 1.1 + machanie;
    if (lewa.current) lewa.current.rotation.x = -praca * 0.8 - machanie;
  });

  const kolorUbrania = fartuch ? '#f8f9fa' : '#5b7a99';
  const kolorDloni = rekawice ? '#3b82f6' : SKORA;

  return (
    <group ref={grupa} position={[celX, 0, 0.6]} rotation={[0, Math.PI, 0]}>
      {/* nogi */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.84, 12]} />
          <meshStandardMaterial color="#2b2d42" />
        </mesh>
      ))}
      {/* tułów */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 6, 16]} />
        <meshStandardMaterial color={kolorUbrania} roughness={0.8} />
      </mesh>
      {fartuch && (
        <mesh position={[0, 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.22, 0.3, 16, 1, true]} />
          <meshStandardMaterial color="#f8f9fa" side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      )}
      {/* głowa */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.13, 24, 18]} />
        <meshStandardMaterial color={SKORA} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.68, 0.02]}>
        <sphereGeometry args={[0.135, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color="#5a3825" roughness={0.9} />
      </mesh>
      {okulary && (
        <mesh position={[0, 1.63, -0.115]}>
          <boxGeometry args={[0.22, 0.06, 0.04]} />
          <meshStandardMaterial color="#a5d8ff" transparent opacity={0.6} roughness={0.1} />
        </mesh>
      )}
      {/* ręce – obrót w barku */}
      <group ref={prawa} position={[-0.22, 1.36, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.38, 4, 10]} />
          <meshStandardMaterial color={kolorUbrania} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color={kolorDloni} />
        </mesh>
      </group>
      <group ref={lewa} position={[0.22, 1.36, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.38, 4, 10]} />
          <meshStandardMaterial color={kolorUbrania} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color={kolorDloni} />
        </mesh>
      </group>
    </group>
  );
}
