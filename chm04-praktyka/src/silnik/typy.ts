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
  /** Przykładowy wpis gracza, który zalicza ten krok (używany w testach poziomu). */
  przyklad?: string;
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
  /** Napisy i ustawienia sceny dla tego poziomu. */
  scena?: {
    /** Etykieta butelki z titrantem, np. ["HCl", "0,01 mol/dm³"]. */
    titrant?: string[];
    wskaznik?: string[];
    /** Id pomiaru pokazywanego na wadze podczas ważenia. */
    masaWagi?: string;
    /** Id pomiaru pokazywanego w powiększeniu biurety podczas odczytu. */
    odczytBiureta?: string;
    /** Id kroku, po którym można otworzyć kartę wyników (domyślnie: po ukończeniu). */
    kartaPo?: string;
  };
  /** Karta wyników: losowane pomiary, tabele do wypełnienia i kryteria oceny. */
  karta?: KartaSpec;
}

export interface Losowanie {
  id: string;
  /** Losowa wartość z przedziału od–do … */
  od?: number;
  do?: number;
  /** … albo jedna z listy … */
  wybierz?: number[];
  /** … albo obliczona ze wzoru z wcześniejszych wartości. */
  wzor?: string;
  /** Losowa odchyłka ± (błąd pomiaru). */
  szum?: number;
  /** Zaokrąglenie do wielokrotności (np. 0.05 cm³ dla biurety). */
  krok?: number;
  miejsca?: number;
}

export type Odczyt =
  | { typ: 'waga' | 'wyswietlacz'; id: string; etykieta: string; jednostka: string; miejsca: number }
  | { typ: 'biureta'; id: string; etykieta: string }
  | { typ: 'papierek'; id: string; etykieta: string }
  /** Krzywa miareczkowania słabego kwasu mocną zasadą; id = pomiar z objętością w punkcie końcowym. */
  | { typ: 'krzywa'; id: string; etykieta: string }
  | { typ: 'info'; etykieta: string; tekst: string };

export interface PoleKarty {
  id: string;
  etykieta: string;
  jednostka?: string;
  /** kr | sr | dl | max */
  szer?: string;
}

export interface SekcjaKarty {
  tytul: string;
  opis?: string;
  /** Tabela: w nazwie pola "{i}" zamienia się na numer wiersza. */
  tabela?: { kolumny: { naglowek: string; pole: string }[]; wiersze: number };
  pola?: PoleKarty[];
}

export type Sprawdzenie =
  /** Wpis liczbowy równy wzorowi ± tol. We wzorze "m1" to pomiar, "$m1" to wpis gracza. */
  | { typ: 'liczba'; pole: string; wzor: string; tol: number }
  | { typ: 'miejsca'; pole: string; ile: number }
  | { typ: 'tekst'; pole: string; zawiera: string[] }
  | { typ: 'rownanie'; pole: string; lewa: string[]; prawa: string[] }
  | { typ: 'rozrzut'; pola: string[]; max: number }
  /** Wniosek zależny od wyniku: gdy wzór > 0, wpis ma zawierać frazę z „tak”, w przeciwnym razie z „nie”. */
  | { typ: 'wybor'; pole: string; wzor: string; tak: string[]; nie: string[] }
  /** Jedno z pól zawiera słowo z „zawiera” i wszystkie z „oraz” (np. nazwa sprzętu i pojemność). */
  | { typ: 'tekstRazem'; pola: string[]; zawiera: string[]; oraz: string[] }
  | { typ: 'niepuste'; pole: string };

export interface KryteriumSpec {
  opis: string;
  uwaga?: string;
  /** Dopisek do uwagi: wynik policzony z danych gracza. */
  pokaz?: { wzor: string; miejsca: number; jednostka?: string };
  sprawdz: Sprawdzenie[];
}

export interface KartaSpec {
  tytul: string;
  losuj: Losowanie[];
  odczyty: Odczyt[];
  sekcje: SekcjaKarty[];
  /** Linie brudnopisu; linia zaczynająca się od "~" to proporcja (wiersze rozdzielone " | "). */
  brudnopis?: string[];
  kryteria: KryteriumSpec[];
}
