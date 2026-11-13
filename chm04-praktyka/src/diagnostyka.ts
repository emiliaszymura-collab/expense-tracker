// Diagnostyka grafiki 3D – zbiera informacje, które pokazujemy, gdy scena się nie rysuje.
export interface Diagnoza {
  webgl: string;
  renderer: string;
  rozmiarSceny: string;
  bufor: string;
  klatki: number;
  utrataKontekstu: boolean;
  bledy: string[];
  start: number;
}

export const DIAG: Diagnoza = {
  webgl: 'nie sprawdzono',
  renderer: '–',
  rozmiarSceny: '–',
  bufor: '–',
  klatki: 0,
  utrataKontekstu: false,
  bledy: [],
  start: Date.now(),
};

export function zapiszBlad(tekst: string) {
  if (DIAG.bledy.length < 12 && !DIAG.bledy.includes(tekst)) DIAG.bledy.push(tekst.slice(0, 300));
}

/** Sprawdza, czy przeglądarka w ogóle daje WebGL (bez tworzenia sceny). */
export function sprawdzWebgl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl2 = c.getContext('webgl2');
    const gl = gl2 ?? c.getContext('webgl');
    if (!gl) {
      DIAG.webgl = 'BRAK – przeglądarka nie udostępnia WebGL';
      return false;
    }
    DIAG.webgl = gl2 ? 'WebGL 2 dostępny' : 'tylko WebGL 1';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) DIAG.renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch (e) {
    DIAG.webgl = `błąd: ${String(e)}`;
    return false;
  }
}

export const TRYB_AWARYJNY = (() => {
  try {
    return localStorage.getItem('chm04:awaryjny') === '1' || location.hash === '#awaryjny';
  } catch {
    return location.hash === '#awaryjny';
  }
})();

export function ustawTrybAwaryjny(wl: boolean) {
  try {
    if (wl) localStorage.setItem('chm04:awaryjny', '1');
    else localStorage.removeItem('chm04:awaryjny');
  } catch {
    /* bez storage – zostaje hash */
  }
  location.hash = wl ? 'awaryjny' : '';
  location.reload();
}

// Przechwytywanie błędów od pierwszej chwili.
window.addEventListener('error', (e) => zapiszBlad(`błąd: ${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`));
window.addEventListener('unhandledrejection', (e) => zapiszBlad(`odrzucona obietnica: ${String((e as PromiseRejectionEvent).reason)}`));
const oryginalnyError = console.error.bind(console);
console.error = (...a: unknown[]) => {
  zapiszBlad(a.map(String).join(' '));
  oryginalnyError(...a);
};
const oryginalnyWarn = console.warn.bind(console);
console.warn = (...a: unknown[]) => {
  if (String(a[0]).includes('Nie wczytano')) zapiszBlad(a.map(String).join(' '));
  oryginalnyWarn(...a);
};
