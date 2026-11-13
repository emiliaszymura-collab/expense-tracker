// Wspólne materiały i etykiety rysowane na canvasie (bez zewnętrznych plików – gra działa offline).
import * as THREE from 'three';

export const SZKLO = new THREE.MeshPhysicalMaterial({
  color: '#ffffff',
  transmission: 1,
  thickness: 0.012,
  roughness: 0.03,
  ior: 1.47,
  side: THREE.DoubleSide,
  envMapIntensity: 1.5,
});

export const SZKLO_BRAZ = new THREE.MeshPhysicalMaterial({
  color: '#8a4a17',
  transmission: 0.55,
  thickness: 0.03,
  roughness: 0.08,
  ior: 1.5,
  envMapIntensity: 1.2,
});

export const CHROM = new THREE.MeshStandardMaterial({ color: '#dfe3e6', metalness: 1, roughness: 0.16 });
export const STAL = new THREE.MeshStandardMaterial({ color: '#b9c0c5', metalness: 0.9, roughness: 0.32 });
export const PLASTIK_BIALY = new THREE.MeshStandardMaterial({ color: '#f1f3f4', roughness: 0.45 });
export const PLASTIK_CIEMNY = new THREE.MeshStandardMaterial({ color: '#22272b', roughness: 0.5 });
export const SZAFKA = new THREE.MeshStandardMaterial({ color: '#eef0ee', roughness: 0.42, metalness: 0.02 });
export const BLAT_MAT = new THREE.MeshStandardMaterial({ color: '#414c53', roughness: 0.32, metalness: 0.05 });

export function plyn(kolor: string) {
  return new THREE.MeshPhysicalMaterial({ color: kolor, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1 });
}

interface OpcjeEtykiety {
  w?: number;
  h?: number;
  tlo?: string;
  kolor?: string;
  rozmiar?: number;
  ramka?: string;
  pasek?: string;
}

/** Tekstura z napisem (etykieta butelki, wyświetlacz, tabliczka). */
export function etykieta(linie: string[], o: OpcjeEtykiety = {}): THREE.CanvasTexture {
  const w = o.w ?? 256;
  const h = o.h ?? 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  rysujEtykiete(g, w, h, linie, o);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function rysujEtykiete(g: CanvasRenderingContext2D, w: number, h: number, linie: string[], o: OpcjeEtykiety = {}) {
  g.fillStyle = o.tlo ?? '#ffffff';
  g.fillRect(0, 0, w, h);
  if (o.pasek) {
    g.fillStyle = o.pasek;
    g.fillRect(0, 0, w, h * 0.16);
  }
  if (o.ramka) {
    g.strokeStyle = o.ramka;
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  }
  const rozmiar = o.rozmiar ?? Math.floor(h / (linie.length + 1.2));
  g.fillStyle = o.kolor ?? '#1b2329';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const start = h / 2 - ((linie.length - 1) * rozmiar * 1.15) / 2 + (o.pasek ? h * 0.06 : 0);
  linie.forEach((l, i) => {
    g.font = `${i === 0 ? 700 : 500} ${i === 0 ? rozmiar : rozmiar * 0.8}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    g.fillText(l, w / 2, start + i * rozmiar * 1.15, w - 16);
  });
}
