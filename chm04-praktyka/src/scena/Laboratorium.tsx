// Scena 3D: sala, stanowisko, laborant i egzaminator. „Reżyser” odtwarza po kolei animacje przyjętych kroków.
import { ContactShadows, Environment, Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import type { ElementBhp, Krok } from '../silnik/typy';
import { CZAS, nowaAnim } from './animacje';
import { STAL, SZKLO } from './materialy';
import { Pomieszczenie } from './Pomieszczenie';
import { Postac, nowePostacApi, nowySter } from './Postac';
import { Butelka, Cylinder, Kolba, PojemnikOdpady, Statyw, Tryskawka, Waga, Zlew, Zlewka } from './Sprzet';
import { BIURETA, BIURETA_GORA, BLAT, NAZWY_SPRZETU, POZYCJE, Z_LABORANTA, gladko } from './uklad';

type StanSceny = Record<string, string | number | boolean>;

interface Props {
  /** Wykonane kroki, w kolejności wykonania. */
  kroki: Krok[];
  bhp: ElementBhp[];
  pokazEtykiety: boolean;
  /** Czy kartka z protokołem zasłania połowę sceny. */
  kartkaOtwarta: boolean;
}

const scal = (kroki: Krok[]): StanSceny => Object.assign({}, ...kroki.map((k) => k.stanSceny ?? {}));

const EGZ = { x: 2.75, z: -1.95, obrot: -0.55 };
const KOLBA_STOL = new THREE.Vector3(...POZYCJE.kolba);
const KOLBA_WAGA = new THREE.Vector3(POZYCJE.waga[0], BLAT + 0.086, POZYCJE.waga[2] - 0.03);
const KOLBA_BIURETA = new THREE.Vector3(POZYCJE.statyw[0], BLAT + 0.023, POZYCJE.statyw[2]);
const MYDLO = new THREE.Vector3(POZYCJE.waga[0] - 0.3, BLAT, 0.12);

/**
 * Dopasowuje kadr do wolnej części sceny: na wąskim ekranie poszerza pole widzenia,
 * a gdy otwarta jest kartka z protokołem – przesuwa obraz w wolną połowę.
 */
function KameraDopasowanie({ kartkaOtwarta }: { kartkaOtwarta: boolean }) {
  const { camera, size } = useThree();
  const biezace = useRef({ x: 0, y: 0, tanPol: Math.tan(THREE.MathUtils.degToRad(42) / 2) });
  useFrame((_, dt) => {
    const kamera = camera as THREE.PerspectiveCamera;
    const { width: w, height: h } = size;
    if (!w || !h) return;
    const telefon = window.innerWidth <= 800;
    const wolneW = kartkaOtwarta && !telefon ? w / 2 : w;
    const wolneH = kartkaOtwarta && telefon ? h / 2 : h;
    const poziomeFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42) / 2) * 2.0);
    const potrzebne = 2 * Math.atan(Math.tan(poziomeFov / 2) / (wolneW / wolneH));
    const ograniczone = THREE.MathUtils.clamp(potrzebne, THREE.MathUtils.degToRad(22), THREE.MathUtils.degToRad(80));
    const celTan = Math.tan(ograniczone / 2) * (h / wolneH);
    const celX = kartkaOtwarta && !telefon ? -w / 4 : 0;
    const celY = kartkaOtwarta && telefon ? -h / 4 : 0;
    const b = biezace.current;
    const k = Math.min(1, dt * 8);
    b.x += (celX - b.x) * k;
    b.y += (celY - b.y) * k;
    b.tanPol += (celTan - b.tanPol) * k;
    kamera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(b.tanPol));
    if (Math.abs(b.x) < 0.5 && Math.abs(b.y) < 0.5) kamera.clearViewOffset();
    else kamera.setViewOffset(w, h, b.x, b.y, w, h);
    kamera.updateProjectionMatrix();
  });
  return null;
}

/**
 * Światło i odbicia z prawdziwego wnętrza (HDRI z Poly Haven, CC0).
 * Plik .hdr ma rozszerzenie .wasm, bo hosting strony nie serwuje plików .hdr.
 */
function Otoczenie() {
  const tekstura = useLoader(RGBELoader, 'zasoby/sala.wasm');
  tekstura.mapping = THREE.EquirectangularReflectionMapping;
  return <Environment map={tekstura} environmentIntensity={0.75} />;
}

function Etykieta({ id }: { id: string }) {
  const [x, , z] = POZYCJE[id];
  return (
    <Html position={[x, BLAT - 0.12, z + 0.45]} center distanceFactor={2.3} zIndexRange={[10, 0]}>
      <span className="etykieta-3d">{NAZWY_SPRZETU[id]}</span>
    </Html>
  );
}

function Scena({ kroki, bhp, pokazEtykiety }: Omit<Props, 'kartkaOtwarta'>) {
  const nRef = useRef(kroki.length);
  const [n, setN] = useState(kroki.length);
  const [wToku, setWToku] = useState(false);
  const [polowa, setPolowa] = useState(false);
  const [ocena, setOcena] = useState(false);
  const akt = useRef<{ krok: Krok; faza: 'idz' | 'rob'; polowa: boolean; ocena: boolean } | null>(null);
  const anim = useRef(nowaAnim());
  const przechyl = useRef(0);

  const sterL = useRef(nowySter(POZYCJE.kolba[0], Z_LABORANTA));
  const apiL = useRef(nowePostacApi());
  const sterE = useRef(nowySter(EGZ.x, EGZ.z, EGZ.obrot));
  const apiE = useRef(nowePostacApi());

  const kolba = useRef<THREE.Group>(null);
  const rekwizyt = useRef<THREE.Group>(null);
  const rekwizytObrot = useRef<THREE.Group>(null);
  const struga = useRef<THREE.Mesh>(null);
  const kropla = useRef<THREE.Mesh>(null);
  const chowane = useRef<Record<string, THREE.Group | null>>({});
  const v = useMemo(() => ({ P: new THREE.Vector3(), L: new THREE.Vector3(), cel: new THREE.Vector3(), k: new THREE.Vector3() }), []);

  // „Od nowa” – cofnięcie stanu bez animacji
  useEffect(() => {
    if (kroki.length < nRef.current) {
      nRef.current = kroki.length;
      akt.current = null;
      anim.current.aktywna = false;
      setN(kroki.length);
      setWToku(false);
      setPolowa(false);
      setOcena(false);
    }
  }, [kroki.length]);

  const stanPrzed = useMemo(() => scal(kroki.slice(0, n)), [kroki, n]);
  const stanPo = useMemo(() => (wToku && n < kroki.length ? scal(kroki.slice(0, n + 1)) : stanPrzed), [kroki, n, wToku, stanPrzed]);
  const stan = polowa ? stanPo : stanPrzed;

  useFrame(({ clock }, dtSurowe) => {
    const dt = Math.min(dtSurowe, 0.05);
    const t = clock.elapsedTime;
    const a = anim.current;
    const sL = sterL.current;
    const sE = sterE.current;
    const { P, L, cel, k: kPoz } = v;

    if (!akt.current && nRef.current < kroki.length) akt.current = { krok: kroki[nRef.current], faza: 'idz', polowa: false, ocena: false };
    const ak = akt.current;

    sL.lewa = null;
    sL.prawa = null;
    sL.pochyl = 0;
    sL.glowa = 0;
    a.rekwizyt = null;
    przechyl.current = 0;
    sE.x = EGZ.x;
    sE.z = EGZ.z;
    sE.obrotY = EGZ.obrot;
    sE.pochyl = 0;
    sE.glowa = 0;
    let kroplaOd: [number, number, number] | null = null;
    let kroplaDo = 0;
    let strugaDo: number | null = null;

    // --- reżyser: kolejka kroków ---
    let typ = '';
    let sprzet = 'stol';
    if (ak) {
      typ = ak.krok.animacja ?? 'siegnij';
      sprzet = ak.krok.sprzet ?? 'stol';
      // przy biurecie laborant staje lekko z boku, żeby rurka nie zasłaniała twarzy
      if (typ !== 'reka') sL.x = (POZYCJE[sprzet] ?? POZYCJE.stol)[0] - (sprzet === 'statyw' ? 0.2 : 0);
      if (ak.faza === 'idz') {
        if (!apiL.current.idzie && Math.abs(apiL.current.poz.x - sL.x) < 0.03) {
          ak.faza = 'rob';
          Object.assign(a, { aktywna: true, typ, p: 0, sprzet, krokId: ak.krok.id });
          setWToku(true);
        }
      } else {
        const zaleglosci = kroki.length - nRef.current;
        // haczyki testowe: __tempo przyspiesza animacje, __stop zatrzymuje postęp na danej wartości
        const dbg = window as unknown as { __tempo?: number; __stop?: number | null };
        a.p += (dt / (CZAS[typ] ?? 2)) * (zaleglosci > 2 ? 2.2 : 1) * (dbg.__tempo ?? 1);
        if (dbg.__stop != null) a.p = Math.min(a.p, dbg.__stop);
        if (a.p >= 0.5 && !ak.polowa) {
          ak.polowa = true;
          setPolowa(true);
        }
        if (a.p >= 1) {
          a.aktywna = false;
          akt.current = null;
          nRef.current++;
          setN(nRef.current);
          setWToku(false);
          setPolowa(false);
          setOcena(false);
        }
      }
    }

    // --- pozy dla bieżącej animacji ---
    const kPos = kolba.current?.position ?? KOLBA_STOL;
    if (a.aktywna) {
      const p = a.p;
      const [sx, , sz] = POZYCJE[sprzet] ?? POZYCJE.stol;
      const wTrakcie = p > 0.08 && p < 0.92;
      switch (typ) {
        case 'montaz':
          sL.pochyl = 0.06;
          sL.prawa = P.set(sx - 0.04, BLAT + 0.62 + Math.sin(t * 7) * 0.03, sz);
          sL.lewa = L.set(sx + 0.14, BLAT + 0.5, sz - 0.05);
          break;
        case 'przelewanie': {
          if (sprzet === 'statyw') cel.set(sx, BIURETA_GORA + 0.06, sz);
          else if (sprzet === 'kolba') cel.set(kPos.x, kPos.y + 0.24, kPos.z);
          else if (sprzet === 'odpady') cel.set(sx, BLAT + 0.33, sz);
          else cel.set(sx, BLAT + 0.14, sz);
          a.rekwizyt = sprzet === 'statyw' ? 'butelka' : sprzet === 'odpady' ? 'kolbaPelna' : 'cylinder';
          const w = gladko(0, 0.22, p) * (1 - gladko(0.84, 1, p));
          przechyl.current = gladko(0.24, 0.4, p) * (1 - gladko(0.72, 0.86, p));
          sL.prawa = P.set(cel.x - 0.14, THREE.MathUtils.lerp(BLAT + 0.22, cel.y + 0.04, w), cel.z);
          if (sprzet === 'statyw') sL.lewa = L.set(sx + 0.03, BLAT + 0.62, sz);
          else if (sprzet !== 'odpady') {
            sL.lewa = L.set(cel.x + 0.06, BLAT + 0.12, cel.z);
            sL.pochyl = 0.08;
            sL.glowa = 0.25;
          }
          if (przechyl.current > 0.85) strugaDo = sprzet === 'statyw' ? cel.y - 0.04 : cel.y - 0.14;
          break;
        }
        case 'wazenie': {
          sL.pochyl = 0.12;
          sL.glowa = 0.3;
          a.rekwizyt = 'lyzeczka';
          const u = THREE.MathUtils.clamp((p - 0.18) / 0.72, 0, 1) * 2;
          const s = 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
          P.set(MYDLO.x + 0.02, BLAT + 0.12, MYDLO.z).lerp(cel.set(KOLBA_WAGA.x - 0.03, KOLBA_WAGA.y + 0.36, KOLBA_WAGA.z), s);
          P.y += Math.sin(s * Math.PI) * 0.08;
          sL.prawa = P;
          if (wTrakcie) sL.lewa = L.set(KOLBA_WAGA.x + 0.07, KOLBA_WAGA.y + 0.12, KOLBA_WAGA.z);
          break;
        }
        case 'pipetowanie':
          sL.pochyl = 0.11;
          sL.glowa = 0.3;
          a.rekwizyt = 'pipeta';
          sL.prawa = P.set(kPos.x - 0.01, kPos.y + 0.4, kPos.z);
          sL.lewa = L.set(kPos.x + 0.04, kPos.y + 0.17, kPos.z);
          if (p > 0.25 && p < 0.8) {
            kroplaOd = [kPos.x, kPos.y + 0.27, kPos.z];
            kroplaDo = kPos.y + 0.07;
          }
          break;
        case 'mieszanie':
          sL.pochyl = 0.1;
          sL.glowa = 0.28;
          if (wTrakcie) sL.prawa = P.set(kPos.x - 0.02, kPos.y + 0.18, kPos.z);
          break;
        case 'miareczkowanie':
          sL.pochyl = 0.11;
          sL.glowa = 0.26;
          sL.lewa = L.set(sx + 0.05, BLAT + BIURETA.dol + 0.045, sz);
          sL.prawa = P.set(kPos.x - 0.03, kPos.y + 0.18, kPos.z);
          if (wTrakcie) {
            kroplaOd = [sx, BLAT + BIURETA.dol, sz];
            kroplaDo = BLAT + 0.1;
          }
          break;
        case 'kranik':
          sL.pochyl = 0.11;
          sL.glowa = 0.2;
          sL.lewa = L.set(sx + 0.05, BLAT + BIURETA.dol + 0.045, sz);
          if (p > 0.3 && p < 0.75) {
            kroplaOd = [sx, BLAT + BIURETA.dol, sz];
            kroplaDo = BLAT + 0.03;
          }
          break;
        case 'odczyt':
          if (sprzet === 'zlewka') {
            a.rekwizyt = 'papierek';
            sL.pochyl = 0.1;
            sL.glowa = 0.3;
            const zanurz = Math.sin(Math.PI * gladko(0.1, 0.55, p));
            sL.prawa = P.set(sx - 0.01 + gladko(0.6, 0.85, p) * 0.1, BLAT + 0.26 - zanurz * 0.1, sz);
          } else {
            sL.pochyl = 0.05;
            sL.glowa = -0.05;
            sL.prawa = P.set(sx - 0.07, BLAT + BIURETA.dol + 0.07 + BIURETA.dlugosc * 0.7, sz + 0.02);
          }
          break;
        case 'reka': {
          const lx = apiL.current.poz.x;
          if (p < 0.55) sL.prawa = P.set(lx - 0.24, 1.98, Z_LABORANTA + 0.08);
          if (p < 0.84) {
            sE.x = lx + 0.85;
            sE.z = Z_LABORANTA + 0.05;
            sE.obrotY = -1.2;
            if (!apiE.current.idzie && p > 0.4) {
              sE.pochyl = 0.16;
              sE.glowa = p > 0.58 && p < 0.76 ? 0.2 + Math.sin(t * 8) * 0.14 : 0.15;
              if (p > 0.6 && !ak!.ocena) {
                ak!.ocena = true;
                setOcena(true);
              }
            }
          }
          break;
        }
        case 'mycie':
          sL.pochyl = 0.12;
          sL.glowa = 0.3;
          if (sprzet === 'zlew') {
            a.rekwizyt = 'kolbaPusta';
            sL.prawa = P.set(sx - 0.05, BLAT + 0.2 + Math.sin(t * 6) * 0.015, sz - 0.03);
            sL.lewa = L.set(sx + 0.06 + Math.sin(t * 10) * 0.025, BLAT + 0.17, sz - 0.03);
          } else {
            a.rekwizyt = 'sciereczka';
            sL.prawa = P.set(sx + Math.sin(t * 5) * 0.28, BLAT + 0.06, sz + Math.cos(t * 10) * 0.05);
          }
          break;
        case 'przycisk':
          sL.pochyl = 0.13;
          if (wTrakcie) sL.prawa = P.set(sx - 0.1, BLAT + 0.07, sz + 0.1);
          break;
        case 'siegnij_gora':
          if (wTrakcie) sL.prawa = P.set(sx - 0.01, BIURETA_GORA + 0.07, sz);
          break;
        default:
          sL.pochyl = 0.1;
          if (wTrakcie) sL.prawa = P.set(sx - 0.03, BLAT + 0.14, sz);
      }
    }

    // --- kolba: gdzie stoi i jak się porusza ---
    if (kolba.current) {
      const cK = stan.kolbaMiejsce === 'biureta' ? KOLBA_BIURETA : KOLBA_STOL;
      kPoz.copy(cK);
      if (a.aktywna && typ === 'wazenie' && a.p > 0.06 && a.p < 0.9) kPoz.copy(KOLBA_WAGA);
      if (a.aktywna && typ === 'miareczkowanie') kPoz.copy(KOLBA_BIURETA);
      const kr = 1 - Math.exp(-dt * 7);
      const pos = kolba.current.position;
      pos.x += (kPoz.x - pos.x) * kr;
      pos.z += (kPoz.z - pos.z) * kr;
      const dyst = Math.hypot(kPoz.x - pos.x, kPoz.z - pos.z);
      pos.y = kPoz.y + Math.min(0.14, dyst * 0.6);
      const wir = a.aktywna && (typ === 'miareczkowanie' || typ === 'mieszanie') && a.p > 0.08 && a.p < 0.92;
      if (wir) {
        pos.x += Math.cos(t * 11) * 0.011;
        pos.z += Math.sin(t * 11) * 0.011;
        if (typ === 'mieszanie') pos.y += 0.03;
      }
      kolba.current.visible = !a.rekwizyt?.startsWith('kolba');
    }

    // --- rekwizyt w prawej dłoni, struga i krople ---
    if (rekwizyt.current && rekwizytObrot.current) {
      const d = apiL.current.dlonP;
      rekwizyt.current.position.set(d.x + 0.02, d.y - 0.03, d.z + 0.05);
      rekwizytObrot.current.rotation.z = -przechyl.current * 1.85;
      for (const dziecko of rekwizytObrot.current.children) dziecko.visible = dziecko.name === a.rekwizyt;
    }
    for (const [nazwa, g] of Object.entries(chowane.current)) if (g) g.visible = a.rekwizyt !== nazwa;
    if (struga.current) {
      struga.current.visible = strugaDo !== null;
      if (strugaDo !== null) {
        const gora = apiL.current.dlonP.y - 0.04;
        const h = Math.max(0.01, gora - strugaDo);
        struga.current.scale.y = h;
        struga.current.position.set(v.cel.x - 0.005, strugaDo + h / 2, v.cel.z + 0.05 * 0);
      }
    }
    if (kropla.current) {
      kropla.current.visible = kroplaOd !== null;
      if (kroplaOd) {
        const f = (t * 2.6) % 1;
        kropla.current.position.set(kroplaOd[0], kroplaOd[1] - f * f * (kroplaOd[1] - kroplaDo), kroplaOd[2]);
      }
    }
  });

  const [zx, , zz] = POZYCJE.statyw;
  const liczbaKolb = Number(stan.kolby ?? 1);

  return (
    <>
      <Pomieszczenie />

      <group position={POZYCJE.zlew}>
        <Zlew anim={anim} />
      </group>
      <group position={POZYCJE.waga}>
        <Waga wlaczona={stan.waga === 'wlaczona'} anim={anim} />
      </group>
      {/* szkiełko z próbką mydła */}
      <group position={MYDLO}>
        <mesh position={[0, 0.006, 0]} material={SZKLO}>
          <cylinderGeometry args={[0.06, 0.045, 0.012, 28]} />
        </mesh>
        <mesh position={[0, 0.022, 0]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.07, 0.022, 0.045]} />
          <meshStandardMaterial color="#efe6c8" roughness={0.65} />
        </mesh>
      </group>

      <group ref={kolba} position={KOLBA_STOL}>
        <Kolba plynOd={stanPrzed.kolba as string | undefined} plynDo={stanPo.kolba as string | undefined} anim={anim} />
      </group>
      {Array.from({ length: Math.max(0, liczbaKolb - 1) }, (_, i) => (
        <group key={i} position={[KOLBA_STOL.x - 0.09 + i * 0.19, BLAT, KOLBA_STOL.z + 0.02]}>
          <Kolba plynOd="pomaranczowy" plynDo="pomaranczowy" />
        </group>
      ))}
      <group ref={(g) => (chowane.current.cylinder = g)} position={[-0.68, BLAT, 0.24]}>
        <Cylinder />
      </group>
      <group position={[-0.16, BLAT, 0.27]}>
        <Butelka napis={['oranż', 'metylowy 0,1%']} braz wys={0.075} r={0.022} zakretka="#111" />
      </group>
      <group ref={(g) => (chowane.current.butelka = g)} position={[0.0, BLAT, 0.24]}>
        <Butelka napis={['HCl', '0,01 mol/dm³']} />
      </group>

      <group position={POZYCJE.statyw}>
        <Statyw
          zestaw={Boolean(stan.zestaw)}
          lejek={Boolean(stan.lejek)}
          poziomOd={Number(stanPrzed.biuretaPoziom ?? 0)}
          poziomDo={Number(stanPo.biuretaPoziom ?? 0)}
          anim={anim}
        />
      </group>
      <group position={[0.66, BLAT, 0.24]}>
        <Tryskawka />
      </group>
      <group position={POZYCJE.zlewka}>
        <Zlewka plyn={stan.zlewka as string | undefined} papierek={stan.papierek as string | undefined} />
      </group>
      {/* pudełko z papierkami wskaźnikowymi */}
      <group position={[1.2, BLAT + 0.012, 0.26]} rotation={[0, -0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.09, 0.024, 0.05]} />
          <meshStandardMaterial color="#fff3bf" roughness={0.7} />
        </mesh>
        {['#e03131', '#f08c00', '#f1d36b', '#2f9e44', '#1971c2', '#5f3dc4'].map((c, i) => (
          <mesh key={c} position={[-0.033 + i * 0.013, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.011, 0.04]} />
            <meshBasicMaterial color={c} />
          </mesh>
        ))}
      </group>
      <group position={POZYCJE.odpady}>
        <PojemnikOdpady />
      </group>

      {/* rekwizyty trzymane w prawej dłoni */}
      <group ref={rekwizyt}>
        <group ref={rekwizytObrot}>
          <group name="butelka" position={[0, -0.09, 0]} visible={false}>
            <Butelka napis={['HCl', '0,01 mol/dm³']} />
          </group>
          <group name="cylinder" position={[0, -0.11, 0]} visible={false}>
            <Cylinder />
          </group>
          <group name="kolbaPelna" position={[0, -0.12, 0]} visible={false}>
            <Kolba plynOd="pomaranczowy" plynDo="pomaranczowy" />
          </group>
          <group name="kolbaPusta" position={[0, -0.12, 0]} visible={false}>
            <Kolba />
          </group>
          <group name="pipeta" visible={false}>
            <mesh position={[0, -0.07, 0]} material={SZKLO}>
              <cylinderGeometry args={[0.004, 0.0015, 0.13, 8]} />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <sphereGeometry args={[0.013, 10, 8]} />
              <meshStandardMaterial color="#a61e4d" roughness={0.5} />
            </mesh>
          </group>
          <group name="lyzeczka" visible={false}>
            <mesh position={[0, -0.06, 0]} material={STAL}>
              <boxGeometry args={[0.008, 0.14, 0.003]} />
            </mesh>
            <mesh position={[0, -0.13, 0.004]}>
              <boxGeometry args={[0.014, 0.012, 0.01]} />
              <meshStandardMaterial color="#efe6c8" />
            </mesh>
          </group>
          <group name="papierek" visible={false}>
            <mesh position={[0, -0.06, 0]}>
              <planeGeometry args={[0.009, 0.08]} />
              <meshStandardMaterial color="#f1d36b" side={THREE.DoubleSide} />
            </mesh>
          </group>
          <group name="sciereczka" visible={false}>
            <mesh position={[0, -0.05, 0]}>
              <boxGeometry args={[0.14, 0.012, 0.1]} />
              <meshStandardMaterial color="#74c0fc" roughness={0.95} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh ref={struga} visible={false}>
        <cylinderGeometry args={[0.004, 0.003, 1, 8]} />
        <meshStandardMaterial color="#cfe9f7" transparent opacity={0.75} roughness={0.05} />
      </mesh>
      <mesh ref={kropla} visible={false}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshStandardMaterial color="#d8eef9" roughness={0.05} />
      </mesh>

      {ocena && (
        <Html position={[zx, BLAT + 1.05, zz]} center distanceFactor={3.2} zIndexRange={[12, 0]}>
          <span className="ocena-3d">✓ Zestaw oceniony</span>
        </Html>
      )}
      {pokazEtykiety && Object.keys(NAZWY_SPRZETU).map((id) => <Etykieta key={id} id={id} />)}

      <Postac ster={sterL} api={apiL} rola="laborant" fartuch={bhp.includes('fartuch')} rekawice={bhp.includes('rekawice')} okulary={bhp.includes('okulary')} />
      <Postac ster={sterE} api={apiE} rola="egzaminator" predkosc={1.9} />
    </>
  );
}

export function Laboratorium({ kartkaOtwarta, ...reszta }: Props) {
  return (
    <Canvas shadows camera={{ position: [-0.1, 1.72, 3.1], fov: 42 }} dpr={[1, 1.75]} gl={{ toneMappingExposure: 0.8 }}>
      <color attach="background" args={['#dfe3e4']} />
      <hemisphereLight args={['#ffffff', '#9aa5ab', 0.3]} />
      <directionalLight
        position={[2.6, 5, 3.6]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-1.5, 2.6, -3.2]} intensity={0.45} color="#eaf4ff" />
      {/* odbicia na szkle i metalu – otoczenie budowane w locie, bez zewnętrznych plików */}
      <Suspense fallback={null}>
        {/* światło i odbicia z prawdziwego wnętrza (HDRI z Poly Haven, CC0) */}
        <Otoczenie />
        <KameraDopasowanie kartkaOtwarta={kartkaOtwarta} />
        <Scena {...reszta} />
      </Suspense>
      <ContactShadows position={[0, 0.002, -0.4]} opacity={0.3} scale={9} blur={2.4} far={1.2} />
      <OrbitControls
        target={[-0.1, 1.24, -0.25]}
        enablePan={false}
        minDistance={1.4}
        maxDistance={5.5}
        minPolarAngle={0.6}
        maxPolarAngle={1.5}
        minAzimuthAngle={-0.8}
        maxAzimuthAngle={0.8}
      />
    </Canvas>
  );
}
