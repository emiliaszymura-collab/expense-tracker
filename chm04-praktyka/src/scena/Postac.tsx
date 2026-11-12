// Postać człowieka (laborant / egzaminator) z brył, z ramionami sterowanymi kinematyką odwrotną:
// podajemy punkt w świecie, do którego ma sięgnąć dłoń, a bark–łokieć–nadgarstek ustawiają się same.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

export interface Ster {
  /** Dokąd postać ma iść. */
  x: number;
  z: number;
  /** Obrót, gdy stoi (0 = twarzą do kamery). */
  obrotY: number;
  /** Pochylenie tułowia do przodu [rad]. */
  pochyl: number;
  /** Pochylenie głowy [rad]. */
  glowa: number;
  /** Cele dłoni w układzie świata (null = ręka luźno). */
  lewa: THREE.Vector3 | null;
  prawa: THREE.Vector3 | null;
}

export interface PostacApi {
  poz: THREE.Vector3;
  dlonL: THREE.Vector3;
  dlonP: THREE.Vector3;
  idzie: boolean;
}

export function nowySter(x: number, z: number, obrotY = 0): Ster {
  return { x, z, obrotY, pochyl: 0, glowa: 0, lewa: null, prawa: null };
}

export function nowePostacApi(): PostacApi {
  return { poz: new THREE.Vector3(), dlonL: new THREE.Vector3(), dlonP: new THREE.Vector3(), idzie: false };
}

interface Props {
  ster: MutableRefObject<Ster>;
  api: MutableRefObject<PostacApi>;
  rola: 'laborant' | 'egzaminator';
  fartuch?: boolean;
  rekawice?: boolean;
  okulary?: boolean;
  predkosc?: number;
}

const SKORA = '#e9b99a';
const BIODRO = 0.93;
const BARK_Y = 0.43;
const BARK_X = 0.185;
const L1 = 0.29;
const L2 = 0.27;
const OS_Y = new THREE.Vector3(0, 1, 0);

const tlum = (a: number, b: number, k: number) => a + (b - a) * k;

function profil(punkty: [number, number][]) {
  return new THREE.LatheGeometry(punkty.map(([r, y]) => new THREE.Vector2(r, y)), 28);
}

interface Ramie {
  gora: THREE.Mesh | null;
  dol: THREE.Mesh | null;
  lokiec: THREE.Mesh | null;
  dlon: THREE.Group | null;
  cel: THREE.Vector3;
}

export function Postac({ ster, api, rola, fartuch = false, rekawice = false, okulary = false, predkosc = 1.5 }: Props) {
  const grupa = useRef<THREE.Group>(null);
  const tulow = useRef<THREE.Group>(null);
  const glowa = useRef<THREE.Group>(null);
  const nogaL = useRef<THREE.Group>(null);
  const nogaP = useRef<THREE.Group>(null);
  const faza = useRef(0);
  const ramiona = useRef<[Ramie, Ramie]>([
    { gora: null, dol: null, lokiec: null, dlon: null, cel: new THREE.Vector3(BARK_X + 0.03, -0.1, 0.06) },
    { gora: null, dol: null, lokiec: null, dlon: null, cel: new THREE.Vector3(-BARK_X - 0.03, -0.1, 0.06) },
  ]);
  const tmp = useMemo(
    () => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), q: new THREE.Quaternion() }),
    [],
  );

  const egz = rola === 'egzaminator';
  const kolorGory = egz ? '#2c3a4f' : fartuch ? '#fbfbf9' : '#3f7f8c';
  const kolorSpodni = egz ? '#23272e' : '#27324a';
  const kolorDloni = rekawice ? '#2f6fd6' : SKORA;

  const geo = useMemo(
    () => ({
      // fartuch do kolan / marynarka / sweter – profil obracany, potem spłaszczony w osi z
      fartuch: profil([[0.0, -0.4], [0.2, -0.4], [0.195, -0.2], [0.18, 0.0], [0.158, 0.18], [0.172, 0.33], [0.17, 0.42], [0.11, 0.485], [0.055, 0.5], [0, 0.5]]),
      gora: profil([[0.0, -0.06], [0.175, -0.06], [0.178, 0.0], [0.155, 0.18], [0.17, 0.33], [0.168, 0.42], [0.11, 0.485], [0.055, 0.5], [0, 0.5]]),
      ramieGora: new THREE.CylinderGeometry(0.047, 0.041, 1, 14),
      ramieDol: new THREE.CylinderGeometry(0.04, 0.032, 1, 14),
    }),
    [],
  );

  useFrame(({ clock }, dtSurowe) => {
    const g = grupa.current;
    const t = tulow.current;
    if (!g || !t) return;
    const dt = Math.min(dtSurowe, 0.05);
    const s = ster.current;
    const k = 1 - Math.exp(-dt * 9);
    const czas = clock.elapsedTime;

    // --- chodzenie ---
    const dx = s.x - g.position.x;
    const dz = s.z - g.position.z;
    const dyst = Math.hypot(dx, dz);
    const idzie = dyst > 0.015;
    if (idzie) {
      const krok = Math.min(dyst, dt * predkosc);
      g.position.x += (dx / dyst) * krok;
      g.position.z += (dz / dyst) * krok;
      faza.current += dt * 9;
    }
    const celObrot = idzie && dyst > 0.12 ? Math.atan2(dx, dz) : s.obrotY;
    let roznica = celObrot - g.rotation.y;
    roznica = Math.atan2(Math.sin(roznica), Math.cos(roznica));
    g.rotation.y += roznica * (1 - Math.exp(-dt * 10));
    const mach = idzie ? Math.sin(faza.current) : 0;
    if (nogaL.current && nogaP.current) {
      nogaL.current.rotation.x = tlum(nogaL.current.rotation.x, mach * 0.55, k * 2);
      nogaP.current.rotation.x = tlum(nogaP.current.rotation.x, -mach * 0.55, k * 2);
    }
    g.position.y = idzie ? Math.abs(Math.cos(faza.current)) * 0.018 : 0;

    // --- tułów i głowa ---
    const oddech = Math.sin(czas * 1.4) * 0.006;
    t.rotation.x = tlum(t.rotation.x, idzie ? 0.04 : s.pochyl + oddech, k);
    if (glowa.current) glowa.current.rotation.x = tlum(glowa.current.rotation.x, idzie ? 0 : s.glowa, k);
    g.updateWorldMatrix(true, true);

    // --- ramiona (IK dwóch kości) ---
    const { a, b, c, d, q } = tmp;
    ramiona.current.forEach((r, i) => {
      const strona = i === 0 ? 1 : -1; // 0 = lewa ręka postaci (+x), 1 = prawa (−x)
      const celSwiat = i === 0 ? s.lewa : s.prawa;
      const bark = a.set(strona * BARK_X, BARK_Y, 0);
      if (celSwiat && !idzie) {
        b.copy(celSwiat);
        t.worldToLocal(b);
      } else {
        b.set(strona * (BARK_X + 0.035), -0.1, 0.05 - strona * mach * 0.16);
      }
      r.cel.lerp(b, k);
      // ograniczenie zasięgu
      c.copy(r.cel).sub(bark);
      const dl = THREE.MathUtils.clamp(c.length(), 0.08, L1 + L2 - 0.004);
      c.normalize();
      const nadgarstek = d.copy(bark).addScaledVector(c, dl);
      // łokieć: kąt przy barku z twierdzenia cosinusów, biegun w dół / na zewnątrz / do tyłu
      const cosA = THREE.MathUtils.clamp((L1 * L1 + dl * dl - L2 * L2) / (2 * L1 * dl), -1, 1);
      const sinA = Math.sqrt(1 - cosA * cosA);
      const biegun = b.set(strona * 0.55, -1, -0.5);
      biegun.addScaledVector(c, -biegun.dot(c)).normalize();
      const lokiec = b.copy(bark).addScaledVector(c, L1 * cosA).addScaledVector(biegun, L1 * sinA);

      if (r.gora && r.dol && r.lokiec && r.dlon) {
        // ramię: bark → łokieć
        c.copy(lokiec).sub(bark);
        r.gora.position.copy(bark).addScaledVector(c, 0.5);
        r.gora.scale.y = c.length();
        r.gora.quaternion.setFromUnitVectors(OS_Y, c.normalize().negate());
        r.lokiec.position.copy(lokiec);
        // przedramię: łokieć → nadgarstek
        c.copy(nadgarstek).sub(lokiec);
        r.dol.position.copy(lokiec).addScaledVector(c, 0.5);
        r.dol.scale.y = c.length();
        q.setFromUnitVectors(OS_Y, c.normalize().negate());
        r.dol.quaternion.copy(q);
        r.dlon.position.copy(nadgarstek);
        r.dlon.quaternion.copy(q);
      }
      // pozycja dłoni w świecie – dla rekwizytów trzymanych w ręce
      const wyjscie = i === 0 ? api.current.dlonL : api.current.dlonP;
      wyjscie.copy(nadgarstek);
      t.localToWorld(wyjscie);
    });

    api.current.poz.copy(g.position);
    api.current.idzie = idzie;
  });

  const ustaw = (i: 0 | 1, pole: 'gora' | 'dol' | 'lokiec' | 'dlon') => (el: THREE.Object3D | null) => {
    (ramiona.current[i] as unknown as Record<string, THREE.Object3D | null>)[pole] = el;
  };

  return (
    <group ref={grupa} position={[ster.current.x, 0, ster.current.z]} rotation={[0, ster.current.obrotY, 0]}>
      {/* nogi */}
      {([[0.085, nogaL], [-0.085, nogaP]] as const).map(([x, ref]) => (
        <group key={x} ref={ref} position={[x, BIODRO, 0]}>
          <mesh position={[0, -0.44, 0]} castShadow>
            <cylinderGeometry args={[0.078, 0.058, 0.88, 14]} />
            <meshStandardMaterial color={kolorSpodni} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.9, 0.04]} castShadow>
            <boxGeometry args={[0.095, 0.06, 0.24]} />
            <meshStandardMaterial color={egz ? '#1a1a1c' : '#f1f1ee'} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* tułów obraca się w biodrach – razem z nim ramiona i głowa */}
      <group ref={tulow} position={[0, BIODRO, 0]}>
        <mesh geometry={!egz && fartuch ? geo.fartuch : geo.gora} scale={[1, 1, 0.66]} castShadow>
          <meshStandardMaterial color={kolorGory} roughness={0.82} />
        </mesh>
        {(egz || fartuch) && (
          <>
            {/* zapięcie, guziki, kołnierz, kieszeń */}
            <mesh position={[0, egz ? 0.15 : 0.0, 0.118]}>
              <boxGeometry args={[0.006, egz ? 0.42 : 0.78, 0.004]} />
              <meshStandardMaterial color={egz ? '#1b2533' : '#cfd3d2'} />
            </mesh>
            {(egz ? [0.1, 0.2] : [-0.2, -0.08, 0.04, 0.16, 0.28]).map((y) => (
              <mesh key={y} position={[0.018, y, egz ? 0.115 : 0.121 - Math.max(0, y - 0.1) * 0.05]}>
                <sphereGeometry args={[0.009, 10, 8]} />
                <meshStandardMaterial color={egz ? '#0f1620' : '#dfe2e1'} roughness={0.4} />
              </mesh>
            ))}
            {[1, -1].map((s) => (
              <mesh key={s} position={[s * 0.05, 0.4, 0.092]} rotation={[0.25, 0, s * -0.55]}>
                <boxGeometry args={[0.06, 0.12, 0.008]} />
                <meshStandardMaterial color={kolorGory} roughness={0.8} />
              </mesh>
            ))}
            {!egz && (
              <group position={[0.1, 0.27, 0.108]}>
                <mesh>
                  <boxGeometry args={[0.075, 0.07, 0.006]} />
                  <meshStandardMaterial color="#f3f3f0" roughness={0.85} />
                </mesh>
                <mesh position={[0.018, 0.035, 0.006]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.06, 6]} />
                  <meshStandardMaterial color="#1f4fa3" />
                </mesh>
              </group>
            )}
          </>
        )}
        {egz && (
          <mesh position={[0, 0.36, 0.1]}>
            <boxGeometry args={[0.06, 0.2, 0.01]} />
            <meshStandardMaterial color="#f4f4f4" roughness={0.7} />
          </mesh>
        )}
        {/* barki */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * BARK_X, BARK_Y, 0]} castShadow>
            <sphereGeometry args={[0.058, 14, 12]} />
            <meshStandardMaterial color={kolorGory} roughness={0.82} />
          </mesh>
        ))}
        {/* szyja */}
        <mesh position={[0, 0.535, 0]}>
          <cylinderGeometry args={[0.042, 0.048, 0.09, 12]} />
          <meshStandardMaterial color={SKORA} roughness={0.7} />
        </mesh>

        {/* głowa */}
        <group ref={glowa} position={[0, 0.58, 0]}>
          <mesh position={[0, 0.105, 0]} scale={[0.88, 1.06, 0.95]} castShadow>
            <sphereGeometry args={[0.108, 28, 22]} />
            <meshStandardMaterial color={SKORA} roughness={0.65} />
          </mesh>
          {/* włosy */}
          <mesh position={[0, 0.118, -0.012]} scale={[0.93, 1.08, 1.02]} rotation={[-0.32, 0, 0]}>
            <sphereGeometry args={[0.112, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
            <meshStandardMaterial color={egz ? '#8d8f93' : '#5b3a26'} roughness={0.9} />
          </mesh>
          {!egz && (
            <mesh position={[0, 0.16, -0.115]}>
              <sphereGeometry args={[0.05, 16, 12]} />
              <meshStandardMaterial color="#553522" roughness={0.9} />
            </mesh>
          )}
          {/* twarz */}
          {[1, -1].map((s) => (
            <mesh key={s} position={[s * 0.036, 0.115, 0.093]}>
              <sphereGeometry args={[0.0105, 10, 8]} />
              <meshStandardMaterial color="#2a2018" roughness={0.3} />
            </mesh>
          ))}
          {[1, -1].map((s) => (
            <mesh key={s} position={[s * 0.036, 0.142, 0.094]} rotation={[0, 0, s * -0.12]}>
              <boxGeometry args={[0.03, 0.005, 0.004]} />
              <meshStandardMaterial color={egz ? '#77797d' : '#4a2f1f'} />
            </mesh>
          ))}
          <mesh position={[0, 0.09, 0.103]}>
            <sphereGeometry args={[0.013, 10, 8]} />
            <meshStandardMaterial color="#e2ab8b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.052, 0.094]}>
            <boxGeometry args={[0.034, 0.006, 0.004]} />
            <meshStandardMaterial color="#b9675a" />
          </mesh>
          {/* okulary ochronne (gogle) albo zwykłe okulary egzaminatora */}
          {okulary && (
            <group position={[0, 0.117, 0]}>
              <mesh>
                <cylinderGeometry args={[0.106, 0.106, 0.052, 28, 1, true, -1.15, 2.3]} />
                <meshPhysicalMaterial color="#d8f0ff" transmission={0.9} thickness={0.01} roughness={0.05} side={THREE.DoubleSide} envMapIntensity={2} />
              </mesh>
              <mesh position={[0, 0.028, 0]}>
                <cylinderGeometry args={[0.108, 0.108, 0.008, 28, 1, true, -1.2, 2.4]} />
                <meshStandardMaterial color="#3d7fd9" side={THREE.DoubleSide} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.1, 0.1, 0.014, 28, 1, true, 1.15, 3.98]} />
                <meshStandardMaterial color="#20252a" side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
          {egz &&
            [1, -1].map((s) => (
              <mesh key={s} position={[s * 0.036, 0.115, 0.1]}>
                <torusGeometry args={[0.02, 0.003, 8, 20]} />
                <meshStandardMaterial color="#1c1c1e" />
              </mesh>
            ))}
        </group>

        {/* ramiona */}
        {([0, 1] as const).map((i) => (
          <group key={i}>
            <mesh ref={ustaw(i, 'gora')} geometry={geo.ramieGora} castShadow>
              <meshStandardMaterial color={kolorGory} roughness={0.82} />
            </mesh>
            <mesh ref={ustaw(i, 'lokiec')}>
              <sphereGeometry args={[0.041, 12, 10]} />
              <meshStandardMaterial color={kolorGory} roughness={0.82} />
            </mesh>
            <mesh ref={ustaw(i, 'dol')} geometry={geo.ramieDol} castShadow>
              <meshStandardMaterial color={kolorGory} roughness={0.82} />
            </mesh>
            <group ref={ustaw(i, 'dlon')}>
              {/* mankiet rękawicy */}
              {rekawice && (
                <mesh position={[0, 0.02, 0]}>
                  <cylinderGeometry args={[0.036, 0.034, 0.06, 12]} />
                  <meshStandardMaterial color={kolorDloni} roughness={0.35} />
                </mesh>
              )}
              <mesh position={[0, -0.045, 0]} scale={[0.8, 1.25, 0.5]} castShadow>
                <sphereGeometry args={[0.042, 14, 12]} />
                <meshStandardMaterial color={kolorDloni} roughness={rekawice ? 0.35 : 0.65} />
              </mesh>
              <mesh position={[(i === 0 ? -1 : 1) * 0.03, -0.035, 0.012]} rotation={[0, 0, (i === 0 ? -1 : 1) * 0.7]} scale={[0.5, 1, 0.5]}>
                <sphereGeometry args={[0.024, 10, 8]} />
                <meshStandardMaterial color={kolorDloni} roughness={rekawice ? 0.35 : 0.65} />
              </mesh>
              {egz && i === 0 && (
                // podkładka z kartą oceny w lewej ręce egzaminatora
                <group position={[0, -0.12, 0.03]} rotation={[0.5, 0, 0]}>
                  <mesh>
                    <boxGeometry args={[0.2, 0.27, 0.008]} />
                    <meshStandardMaterial color="#6b4a2f" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.005, 0.006]}>
                    <boxGeometry args={[0.18, 0.24, 0.002]} />
                    <meshStandardMaterial color="#fbfbf7" />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
