import type { Location } from '../types'

export type LatLng = [number, number]

/** Bounding box wokół Pragi (Stare Miasto + Holešovice). */
export const PRAGUE_CENTER: LatLng = [50.088, 14.42]
export const PRAGUE_BOUNDS: [LatLng, LatLng] = [
  [50.04, 14.36],
  [50.13, 14.48],
]

/**
 * Deep link do Google Maps — nawigacja live (pieszo).
 * Fallback gdy nie ma internetu do OSRM lub user woli natywną nawigację.
 */
export function googleMapsNavUrl(loc: Location, mode: 'walking' | 'driving' = 'walking'): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}&travelmode=${mode}`
}

/**
 * Pobiera trasę pieszą z demo-serwera OSRM. Zwraca listę punktów [lat,lng].
 * W razie błędu (offline) zwraca null — mapa narysuje wtedy proste linie.
 */
export async function fetchOsrmRoute(points: Location[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    const line = data?.routes?.[0]?.geometry?.coordinates
    if (!Array.isArray(line)) return null
    return line.map((c: [number, number]) => [c[1], c[0]] as LatLng)
  } catch {
    return null
  }
}

/** Odległość Haversine w km — do prostego oszacowania dystansu tras. */
export function haversineKm(a: Location, b: Location): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
  return 2 * R * Math.asin(Math.sqrt(h))
}
