// Cienka warstwa nad localStorage — offline-first, brak backendu.
const PREFIX = 'praga:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // np. brak miejsca / tryb prywatny — ignorujemy, apka działa dalej.
  }
}
