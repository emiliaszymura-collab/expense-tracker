// Typy danych poziomu – odpowiadają strukturze plików src/procedury/*.json

/** Grupa synonimów: wystarczy, że wpis zawiera JEDNO z tych słów/fraz. Prefiks "=" = bez tolerancji literówek. */
export type GrupaSlow = string[];

export type ElementBhp = 'fartuch' | 'rekawice' | 'okulary';

export interface Krok {
  id: string;
  /** Krótki opis wyświetlany w dzienniku po poprawnym wykonaniu. */
  opis: string;
  /** Wszystkie grupy muszą zostać dopasowane (każda grupa = lista synonimów). */
  wymagane: GrupaSlow[];
  /** Jeśli wpis zawiera któreś z tych słów (dokładnie, bez literówek), krok NIE jest dopasowany. */
  wykluczajace?: string[];
  /** Id kroków, które muszą być wykonane wcześniej. Brak pola = poprzedni krok na liście. */
  wymaga?: string[];
  /** Czy krok wymaga pełnych środków ochrony (praca z odczynnikami). */
  wymagaBhp?: boolean;
  /** Co zrobić (tryb ćwiczenia) – pokazywane, gdy gracz utknie przed tym krokiem. */
  podpowiedz: string;
  /** Dlaczego ten krok jest ważny / co sprawdza egzaminator. */
  dlaczego: string;
  /** Element sceny, przy którym laborant wykonuje czynność. */
  sprzet?: string;
  /** Nazwa animacji (etap 4). */
  animacja?: string;
  /** Zmiany stanu sceny po wykonaniu kroku. */
  stanSceny?: Record<string, string | number | boolean>;
}

export interface BladTypowy {
  /** Wpis zawierający wszystkie te słowa jest błędem. */
  slowa: string[];
  /** Jeśli wpis zawiera któreś z tych słów, to nie jest ten błąd (np. "zlewka" ≠ "zlew"). */
  wykluczajace?: string[];
  /** Dopasowanie bez tolerancji literówek – dla krótkich, mylących się słów. */
  dokladnie?: boolean;
  komunikat: string;
}

export interface Poziom {
  id: string;
  tytul: string;
  /** Np. "CHM.04 – styczeń 2026". */
  zrodlo: string;
  metoda: string;
  /** Czas egzaminu w minutach (tryb egzaminu – etap 7). */
  czasMinut: number;
  /** Treść zadania i procedury jak w arkuszu (markdown-lite: akapity i listy "- "). */
  protokol: { tytul: string; tresc: string }[];
  kroki: Krok[];
  bledy?: BladTypowy[];
}
