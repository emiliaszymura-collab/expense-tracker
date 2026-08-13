import type { CostParams, ExtraCost, Location } from '../types'

/** Przelicza dowolną kwotę na PLN wg kursu CZK->PLN. */
export function toPln(amount: number, currency: 'CZK' | 'PLN', rate: number): number {
  return currency === 'PLN' ? amount : amount * rate
}

/** Koszt paliwa w PLN: spalanie/100 × dystans × cena. */
export function fuelCostPln(p: CostParams): number {
  return (p.consumption / 100) * p.distance * p.fuelPrice
}

export interface CostRow {
  id: string
  label: string
  pln: number
  original?: string
}

/** Buduje pełną listę pozycji kosztowych w PLN. */
export function buildCostRows(
  params: CostParams,
  locations: Location[],
  extras: ExtraCost[]
): CostRow[] {
  const rows: CostRow[] = []

  rows.push({
    id: 'fuel',
    label: 'Paliwo (tam i z powrotem)',
    pln: fuelCostPln(params),
    original: `${params.consumption} l/100km × ${params.distance} km × ${params.fuelPrice} zł/l`,
  })

  for (const loc of locations) {
    if (loc.cost.amount <= 0) continue
    rows.push({
      id: 'loc-' + loc.id,
      label: loc.name,
      pln: toPln(loc.cost.amount, loc.cost.currency, params.rate),
      original: `${loc.cost.amount} ${loc.cost.currency}`,
    })
  }

  for (const ex of extras) {
    rows.push({
      id: 'extra-' + ex.id,
      label: ex.label,
      pln: toPln(ex.amount, ex.currency, params.rate),
      original: `${ex.amount} ${ex.currency}`,
    })
  }

  return rows
}

export function totalPln(rows: CostRow[]): number {
  return rows.reduce((s, r) => s + r.pln, 0)
}

export const zl = (n: number) =>
  n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'
