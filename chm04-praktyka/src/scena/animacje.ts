// Wspólny stan bieżącej animacji – zapisywany przez reżysera sceny, czytany przez sprzęt i postacie.
export interface Anim {
  aktywna: boolean;
  /** Nazwa animacji z pola "animacja" kroku. */
  typ: string;
  /** Postęp 0..1. */
  p: number;
  sprzet: string;
  /** Co laborant trzyma w prawej ręce (ukrywa egzemplarz stojący na stole). */
  rekwizyt: string | null;
  krokId: string;
}

export const nowaAnim = (): Anim => ({ aktywna: false, typ: '', p: 0, sprzet: '', rekwizyt: null, krokId: '' });

/** Czas trwania animacji w sekundach. */
export const CZAS: Record<string, number> = {
  montaz: 3,
  przelewanie: 3.6,
  wazenie: 4.4,
  pipetowanie: 3.2,
  miareczkowanie: 5.5,
  odczyt: 2.8,
  reka: 7.5,
  mycie: 3.2,
  kranik: 2.4,
  przycisk: 1.6,
  mieszanie: 2.6,
  siegnij_gora: 2,
  siegnij: 1.8,
};
