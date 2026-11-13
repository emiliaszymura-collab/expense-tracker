// Postać człowieka (laborant / egzaminator) – gotowy model ze szkieletem (Ready Player Me, z przykładów three.js).
// Ramiona steruje kinematyka odwrotna: podajemy punkt w świecie, do którego ma sięgnąć dłoń,
// a kości ramienia i przedramienia ustawiają się same.
import { useGLTF } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { clone as klonujSzkielet } from 'three/examples/jsm/utils/SkeletonUtils.js';

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

const PLIK = 'zasoby/postacie/rpm.wasm';
const SKALA = 0.93;
const KOSCI = ['Spine', 'Spine1', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'] as const;
type NazwaKosci = (typeof KOSCI)[number];
const OS_X = new THREE.Vector3(1, 0, 0);
const tlum = (a: number, b: number, k: number) => a + (b - a) * k;

export function Postac({ ster, api, rola, fartuch = false, rekawice = false, okulary = false, predkosc = 1.5 }: Props) {
  const grupa = useRef<THREE.Group>(null);
  const { scene } = useGLTF(PLIK);
  const egz = rola === 'egzaminator';

  // Własna kopia modelu ze szkieletem i materiałami (dwie postacie nie mogą dzielić kości).
  const { model, kosci, spoczynek, materialy } = useMemo(() => {
    const model = klonujSzkielet(scene);
    const materialy: Record<string, { m: THREE.MeshStandardMaterial; mapa: THREE.Texture | null; kolor: THREE.Color; mesh: THREE.Mesh }> = {};
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      mesh.material = m;
      materialy[m.name] = { m, mapa: m.map, kolor: m.color.clone(), mesh };
    });
    const kosci = {} as Record<NazwaKosci, THREE.Object3D>;
    const spoczynek = {} as Record<NazwaKosci, THREE.Quaternion>;
    for (const n of KOSCI) {
      kosci[n] = model.getObjectByName(n)!;
      spoczynek[n] = kosci[n].quaternion.clone();
    }
    return { model, kosci, spoczynek, materialy };
  }, [scene]);

  // Ubiór: fartuch = biała góra, rękawice = niebieskie dłonie; egzaminator w granatowym garniturze.
  useEffect(() => {
    const ustaw = (nazwa: string, kolor: string | null) => {
      const x = materialy[nazwa];
      if (!x) return;
      if (kolor) {
        x.m.map = null;
        x.m.color.set(kolor);
      } else {
        x.m.map = x.mapa;
        x.m.color.copy(x.kolor);
      }
      x.m.needsUpdate = true;
    };
    if (materialy.Wolf3D_Headwear) materialy.Wolf3D_Headwear.mesh.visible = false;
    if (materialy.Wolf3D_Beard) materialy.Wolf3D_Beard.mesh.visible = egz;
    ustaw('Wolf3D_Outfit_Top', egz ? '#2a3850' : fartuch ? '#f6f6f3' : null);
    ustaw('Wolf3D_Outfit_Bottom', egz ? '#232c3d' : fartuch ? '#2b3140' : null);
    ustaw('Wolf3D_Body', rekawice ? '#2f6fd6' : null);
    if (materialy.Wolf3D_Body) materialy.Wolf3D_Body.m.roughness = rekawice ? 0.35 : 0.7;
  }, [materialy, egz, fartuch, rekawice]);

  const faza = useRef(0);
  const cele = useRef([new THREE.Vector3(0.24, 0.9, 0.05), new THREE.Vector3(-0.24, 0.9, 0.05)]);
  const pochylenie = useRef({ tulow: 0, glowa: 0, nogi: 0 });
  const t = useMemo(
    () => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), q3: new THREE.Quaternion() }),
    [],
  );

  /** Obraca kość tak, żeby odcinek kość→dziecko wskazywał w kierunku `kier` (w układzie świata). */
  const skieruj = (kosc: THREE.Object3D, dziecko: THREE.Object3D, kier: THREE.Vector3) => {
    const { a, b, q, q2, q3 } = t;
    kosc.getWorldPosition(a);
    dziecko.getWorldPosition(b);
    b.sub(a).normalize();
    q.setFromUnitVectors(b, kier);
    kosc.getWorldQuaternion(q2);
    q.multiply(q2); // nowa orientacja w świecie
    kosc.parent!.getWorldQuaternion(q3).invert();
    kosc.quaternion.copy(q3.multiply(q));
    kosc.updateWorldMatrix(false, true);
  };

  useFrame(({ clock }, dtSurowe) => {
    const g = grupa.current;
    if (!g) return;
    const dt = Math.min(dtSurowe, 0.05);
    const s = ster.current;
    const k = 1 - Math.exp(-dt * 9);
    const tempo = (window as unknown as { __tempo?: number }).__tempo ?? 1;

    // --- chodzenie ---
    const dx = s.x - g.position.x;
    const dz = s.z - g.position.z;
    const dyst = Math.hypot(dx, dz);
    const idzie = dyst > 0.015;
    if (idzie) {
      const krok = Math.min(dyst, dt * predkosc * tempo);
      g.position.x += (dx / dyst) * krok;
      g.position.z += (dz / dyst) * krok;
      faza.current += dt * 8;
    }
    const celObrot = idzie && dyst > 0.12 ? Math.atan2(dx, dz) : s.obrotY;
    let roznica = celObrot - g.rotation.y;
    roznica = Math.atan2(Math.sin(roznica), Math.cos(roznica));
    g.rotation.y += roznica * (1 - Math.exp(-dt * 10));
    const mach = idzie ? Math.sin(faza.current) : 0;
    const p = pochylenie.current;
    p.nogi = tlum(p.nogi, mach, k * 2);
    p.tulow = tlum(p.tulow, idzie ? 0.03 : s.pochyl + Math.sin(clock.elapsedTime * 1.4) * 0.006, k);
    p.glowa = tlum(p.glowa, idzie ? 0 : s.glowa, k);

    // --- kości: zaczynamy od pozy spoczynkowej, potem nakładamy ruch ---
    for (const n of KOSCI) kosci[n].quaternion.copy(spoczynek[n]);
    const obrocX = (n: NazwaKosci, kat: number) => kosci[n].quaternion.multiply(t.q.setFromAxisAngle(OS_X, kat));
    obrocX('Spine', p.tulow * 0.6);
    obrocX('Spine1', p.tulow * 0.4);
    obrocX('Head', p.glowa);
    obrocX('LeftUpLeg', -p.nogi * 0.5);
    obrocX('RightUpLeg', p.nogi * 0.5);
    obrocX('LeftLeg', Math.max(0, p.nogi) * 0.6);
    obrocX('RightLeg', Math.max(0, -p.nogi) * 0.6);
    g.updateWorldMatrix(true, true);

    // --- ramiona (IK dwóch kości w układzie świata) ---
    const { c, d, e } = t;
    ([['LeftArm', 'LeftForeArm', 'LeftHand', s.lewa, 1], ['RightArm', 'RightForeArm', 'RightHand', s.prawa, -1]] as const).forEach(
      ([nRamie, nPrzedramie, nDlon, celSwiat, strona], i) => {
        const ramie = kosci[nRamie];
        const przedramie = kosci[nPrzedramie];
        const dlon = kosci[nDlon];
        // cel w układzie postaci (płynnie doganiany), potem z powrotem do świata
        if (celSwiat && !idzie) g.worldToLocal(c.copy(celSwiat));
        else c.set(strona * 0.25, 0.88, 0.06 - strona * mach * 0.16);
        cele.current[i].lerp(c, k);
        const cel = g.localToWorld(c.copy(cele.current[i]));

        const bark = ramie.getWorldPosition(d);
        const l1 = bark.distanceTo(przedramie.getWorldPosition(e));
        const l2 = e.distanceTo(dlon.getWorldPosition(t.a));
        const kier = e.copy(cel).sub(bark);
        const dl = THREE.MathUtils.clamp(kier.length(), 0.08, l1 + l2 - 0.004);
        kier.normalize();
        const cosA = THREE.MathUtils.clamp((l1 * l1 + dl * dl - l2 * l2) / (2 * l1 * dl), -1, 1);
        const sinA = Math.sqrt(1 - cosA * cosA);
        // biegun łokcia: w dół, na zewnątrz i do tyłu względem postaci
        const biegun = t.b.set(strona * 0.55, -1, -0.5).applyQuaternion(g.quaternion);
        biegun.addScaledVector(kier, -biegun.dot(kier)).normalize();
        const lokiec = c.copy(bark).addScaledVector(kier, l1 * cosA).addScaledVector(biegun, l1 * sinA);
        const nadgarstek = t.a.copy(bark).addScaledVector(kier, dl);

        const kierRamienia = lokiec.clone().sub(bark).normalize();
        const kierPrzedramienia = nadgarstek.clone().sub(lokiec).normalize();
        skieruj(ramie, przedramie, kierRamienia);
        skieruj(przedramie, dlon, kierPrzedramienia);
        dlon.getWorldPosition(i === 0 ? api.current.dlonL : api.current.dlonP);
      },
    );

    api.current.poz.copy(g.position);
    api.current.idzie = idzie;
  });

  return (
    <group ref={grupa} position={[ster.current.x, 0, ster.current.z]} rotation={[0, ster.current.obrotY, 0]}>
      <group scale={SKALA}>
        <primitive object={model} />
      </group>
      {okulary &&
        createPortal(
          <group position={[0, 0.085, 0.025]}>
            <mesh>
              <cylinderGeometry args={[0.098, 0.098, 0.05, 28, 1, true, -1.15, 2.3]} />
              <meshPhysicalMaterial color="#d8f0ff" transmission={0.9} thickness={0.01} roughness={0.05} side={THREE.DoubleSide} envMapIntensity={2} />
            </mesh>
            <mesh position={[0, 0.027, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.008, 28, 1, true, -1.2, 2.4]} />
              <meshStandardMaterial color="#3d7fd9" side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.093, 0.093, 0.012, 28, 1, true, 1.15, 3.98]} />
              <meshStandardMaterial color="#20252a" side={THREE.DoubleSide} />
            </mesh>
          </group>,
          kosci.Head,
        )}
    </group>
  );
}

useGLTF.preload(PLIK);
