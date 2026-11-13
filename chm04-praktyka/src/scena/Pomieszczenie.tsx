// Sala laboratoryjna: jasne ściany, okna ze światłem dziennym, panele LED, szafki, dygestorium, wyspa.
import { useGLTF, useTexture } from '@react-three/drei';
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
      {/* ciemne szczeliny między frontami – bez nich szafki wyglądają jak jeden klocek */}
      {Array.from({ length: fronty + 1 }, (_, i) => (
        <mesh key={`s${i}`} position={[-szer / 2 + w * i, wys / 2 + 0.05, gl / 2 + 0.002]}>
          <boxGeometry args={[0.006, wys - 0.12, 0.004]} />
          <meshStandardMaterial color="#8d9497" roughness={0.8} />
        </mesh>
      ))}
      {/* stalowa listwa przypodłogowa cokołu */}
      <mesh position={[0, 0.05, gl / 2 - 0.028]}>
        <boxGeometry args={[szer - 0.02, 0.1, 0.004]} />
        <meshStandardMaterial color="#9aa2a6" metalness={0.8} roughness={0.35} />
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
      {/* żaluzje pionowe, częściowo rozsunięte – typowe w pracowniach */}
      {Array.from({ length: 18 }, (_, i) => {
        const x = -0.82 + i * 0.096;
        const zsuniete = i < 4 || i > 13;
        return (
          <mesh key={`z${i}`} position={[x, 0.02, 0.07]} rotation={[0, zsuniete ? 0.15 : 1.25, 0]}>
            <boxGeometry args={[0.089, 1.38, 0.004]} />
            <meshStandardMaterial color="#f1f0ea" roughness={0.85} transparent opacity={0.96} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.72, 0.07]}>
        <boxGeometry args={[1.8, 0.035, 0.05]} />
        <meshStandardMaterial color="#e8e8e4" roughness={0.5} />
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

/** Podłoga z płytek – tekstury PBR z Poly Haven (CC0), przyciemnione do szarości. */
function Podloga() {
  const mapy = useTexture({ map: 'zasoby/podloga/diff.jpg', normalMap: 'zasoby/podloga/nor_gl.jpg', roughnessMap: 'zasoby/podloga/rough.jpg' });
  useMemo(() => {
    for (const t of Object.values(mapy)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(7, 6);
      t.anisotropy = 8;
    }
    mapy.map.colorSpace = THREE.SRGBColorSpace;
  }, [mapy]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 12]} />
      <meshStandardMaterial {...mapy} roughness={0.75} metalness={0.02} />
    </mesh>
  );
}

/** Zestaw szkła laboratoryjnego – model 3D z Poly Haven (CC0). */
export function ZestawSzkla(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('zasoby/chemia/chemistry_set.json');
  const kopia = useMemo(() => {
    const k = scene.clone(true);
    k.traverse((o) => {
      o.castShadow = true;
    });
    return k;
  }, [scene]);
  return (
    <group {...props}>
      <primitive object={kopia} />
    </group>
  );
}

/** Ładuje teksturę PBR (kolor, normalne, chropowatość) z powtarzaniem. */
function usePbr(folder: string, rx: number, ry: number) {
  const mapy = useTexture({ map: `zasoby/${folder}/diff.jpg`, normalMap: `zasoby/${folder}/nor_gl.jpg`, roughnessMap: `zasoby/${folder}/rough.jpg` });
  return useMemo(() => {
    const k = Object.fromEntries(
      Object.entries(mapy).map(([n, t]) => {
        const c = t.clone();
        c.wrapS = c.wrapT = THREE.RepeatWrapping;
        c.repeat.set(rx, ry);
        c.anisotropy = 8;
        if (n === 'map') c.colorSpace = THREE.SRGBColorSpace;
        c.needsUpdate = true;
        return [n, c];
      }),
    ) as typeof mapy;
    return k;
  }, [mapy, rx, ry]);
}

/** Ściany z prawdziwym tynkiem (Poly Haven, CC0) i lamperią do wysokości blatów. */
function Sciany() {
  const dluga = usePbr('sciana', 5, 1.1);
  const krotka = usePbr('sciana', 4.3, 1.1);
  const material = (m: ReturnType<typeof usePbr>) => <meshStandardMaterial {...m} color="#fbfaf6" roughness={0.92} normalScale={new THREE.Vector2(0.25, 0.25)} emissive="#5a5852" emissiveIntensity={0.55} />;
  return (
    <group>
      <mesh position={[0, SUFIT / 2, Z_SCIANY]} receiveShadow>
        <planeGeometry args={[14, SUFIT]} />
        {material(dluga)}
      </mesh>
      <mesh position={[0, SUFIT / 2, 5.6]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[14, SUFIT]} />
        {material(dluga)}
      </mesh>
      {[-5.6, 5.6].map((x) => (
        <mesh key={x} position={[x, SUFIT / 2, 0]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[12, SUFIT]} />
          {material(krotka)}
        </mesh>
      ))}
      {/* pas płytek ściennych nad blatem przyściennym */}
      <mesh position={[0.2, 1.22, Z_SCIANY + 0.006]}>
        <planeGeometry args={[6.46, 0.62]} />
        <meshStandardMaterial map={useMemo(teksturaPlytek, [])} roughness={0.25} />
      </mesh>
    </group>
  );
}

function teksturaPlytek() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9cfd1';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 2; j++) {
      const ton = 236 + ((i * 7 + j * 3) % 5);
      g.fillStyle = `rgb(${ton},${ton + 1},${ton + 1})`;
      g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(6.46 / (16 * 0.15) / 1, 1);
  return t;
}

/** Sufit podwieszany z płyt 60 × 60 cm w metalowym rastrze. */
function SufitPodwieszany() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f4f4f1';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const v = 225 + Math.random() * 25;
      g.fillStyle = `rgb(${v},${v},${v - 3})`;
      g.fillRect(Math.random() * 128, Math.random() * 128, 1.3, 1.3);
    }
    g.fillStyle = '#c4c8ca';
    g.fillRect(0, 0, 128, 3);
    g.fillRect(0, 0, 3, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14 / 0.6, 12 / 0.6);
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <mesh position={[0, SUFIT, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[14, 12]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

/** Instalacje na ścianie: kanał kablowy, gaśnica, kran gazowy – detale, które widać w prawdziwych pracowniach. */
function Instalacje() {
  return (
    <group>
      <mesh position={[0.2, 1.56, Z_SCIANY + 0.03]}>
        <boxGeometry args={[6.46, 0.07, 0.05]} />
        <meshStandardMaterial color="#eef0ee" roughness={0.45} />
      </mesh>
      {/* gaśnica */}
      <group position={[-5.4, 0, -1.3]}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.5, 24]} />
          <meshStandardMaterial color="#c92a2a" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.04, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.08, 16]} />
          <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.85, -0.09]}>
          <boxGeometry args={[0.1, 0.4, 0.02]} />
          <meshStandardMaterial color="#9aa1a5" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
      {/* rura wyciągu dygestorium biegnąca pod sufitem */}
      <mesh position={[-3.9, SUFIT - 0.12, Z_SCIANY + 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 20]} />
        <meshStandardMaterial color="#cfd4d6" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Model z Poly Haven (CC0) wczytany z public/zasoby/modele/<plik>/model.json. */
export function Model({ plik, ...props }: { plik: string } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(`zasoby/modele/${plik}/model.json`);
  const kopia = useMemo(() => {
    const k = scene.clone(true);
    k.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    return k;
  }, [scene]);
  return (
    <group {...props}>
      <primitive object={kopia} />
    </group>
  );
}

/** Blaty z ciemnej żywicy epoksydowej: tekstura z granitu (Poly Haven) przyciemniona do czerni. */
function BlatyPbr() {
  const m = usePbr('blat', 6, 1);
  useMemo(() => {
    Object.assign(BLAT_MAT, { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap });
    BLAT_MAT.color.set('#ffffff');
    BLAT_MAT.roughness = 0.55;
    BLAT_MAT.normalScale.set(0.35, 0.35);
    BLAT_MAT.needsUpdate = true;
  }, [m]);
  return null;
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
      <Podloga />
      <BlatyPbr />
      <Sciany />
      <SufitPodwieszany />
      <Instalacje />
      <group position={[2.6, 0, 5.57]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.95, 2.04, 0.05]} />
          <meshStandardMaterial color="#d9dcd7" roughness={0.6} />
        </mesh>
        <mesh position={[0.36, 1.0, 0.04]} material={CHROM}>
          <boxGeometry args={[0.12, 0.02, 0.04]} />
        </mesh>
      </group>
      <group position={[-1.2, 1.6, 5.57]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <boxGeometry args={[2.4, 1.2, 0.03]} />
          <meshStandardMaterial color="#fdfdfd" roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.63, 0.03]} material={STAL}>
          <boxGeometry args={[2.4, 0.03, 0.08]} />
        </mesh>
      </group>
      {/* listwa przypodłogowa */}
      <mesh position={[0, 0.05, Z_SCIANY + 0.01]}>
        <boxGeometry args={[14, 0.1, 0.02]} />
        <meshStandardMaterial color="#9aa3a7" roughness={0.6} />
      </mesh>
      {/* panele LED */}
      {[[-2.2, -1.2], [1.8, -1.2], [-2.2, 1.6], [1.8, 1.6]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, SUFIT - 0.012, z]}>
          <mesh>
            <boxGeometry args={[1.22, 0.02, 0.62]} />
            <meshStandardMaterial color="#e9ebec" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.011, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.16, 0.56]} />
            <meshBasicMaterial color="#fffdf8" toneMapped={false} />
          </mesh>
        </group>
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
        <ZestawSzkla position={[-1.2, 0.915, 0.0]} scale={1.6} />
        <Model plik="industrial_microscope" position={[-2.0, 0.915, 0.0]} rotation={[0, 0.5, 0]} />
        <Model plik="bunsen_burner" position={[0.55, 0.915, 0.05]} />
        {/* gniazda elektryczne nad blatem */}
        {[-2.6, -1.4, -0.2, 1.0, 2.2].map((x) => (
          <group key={x} position={[x, 1.08, -0.3]}>
            <mesh>
              <boxGeometry args={[0.16, 0.08, 0.025]} />
              <meshStandardMaterial color="#f2f3f1" roughness={0.4} />
            </mesh>
            {[-0.04, 0.04].map((dx) => (
              <mesh key={dx} position={[dx, 0, 0.013]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.004, 20]} />
                <meshStandardMaterial color="#e4e6e3" roughness={0.5} />
              </mesh>
            ))}
          </group>
        ))}
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
        <Model plik="clipboard" position={[0.3, 0.75, 0.05]} rotation={[0, -0.3, 0]} />
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
