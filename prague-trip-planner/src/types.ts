export type Category =
  | 'sleep'
  | 'shower'
  | 'sightseeing'
  | 'club'
  | 'food'
  | 'parking'

export type Currency = 'CZK' | 'PLN'

export interface Cost {
  amount: number
  currency: Currency
  note?: string
}

export interface Location {
  id: string
  name: string
  category: Category
  lat: number
  lng: number
  cost: Cost
  openHours?: string
  /** Orientacyjna godzina w planie dnia, np. "10:00". */
  time?: string
  notes?: string
  day: number
}

/** Dodatkowa pozycja kosztowa (nie na mapie), np. winieta, bilet do klubu. */
export interface ExtraCost {
  id: string
  label: string
  amount: number
  currency: Currency
  builtIn?: boolean
}

/** Parametry kalkulatora paliwa i podziału kosztów. */
export interface CostParams {
  consumption: number // l/100km
  distance: number // km
  fuelPrice: number // zł/l
  people: number
  /** Kurs CZK -> PLN, edytowalny. */
  rate: number
}
