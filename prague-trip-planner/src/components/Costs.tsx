import { useState } from 'react'
import type { CostParams, Currency, ExtraCost, Location } from '../types'
import { buildCostRows, totalPln, zl } from '../lib/costs'

interface Props {
  params: CostParams
  onParams: (p: CostParams) => void
  extras: ExtraCost[]
  onExtras: (e: ExtraCost[]) => void
  locations: Location[]
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 focus-within:border-sky-500">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-transparent px-3 py-3 text-base text-white outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-slate-500">{suffix}</span>}
      </div>
    </label>
  )
}

// Kalkulator kosztów — paliwo, przelicznik CZK→PLN, własne pozycje, podział na osoby.
export default function Costs({ params, onParams, extras, onExtras, locations }: Props) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('CZK')

  const rows = buildCostRows(params, locations, extras)
  const total = totalPln(rows)
  const perPerson = total / Math.max(1, params.people)

  const set = (patch: Partial<CostParams>) => onParams({ ...params, ...patch })

  const addExtra = () => {
    const amt = parseFloat(amount)
    if (!label.trim() || !Number.isFinite(amt) || amt <= 0) return
    onExtras([...extras, { id: 'u' + Date.now(), label: label.trim(), amount: amt, currency }])
    setLabel('')
    setAmount('')
  }

  const removeExtra = (id: string) => onExtras(extras.filter((e) => e.id !== id))

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-3 pb-3 pt-3 safe-top">
        <h1 className="text-xl font-bold text-white">Koszty</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3 safe-bottom">
        {/* Paliwo */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            ⛽ Paliwo
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Spalanie"
              value={params.consumption}
              step={0.1}
              suffix="l/100km"
              onChange={(n) => set({ consumption: n })}
            />
            <NumField
              label="Dystans (w obie strony)"
              value={params.distance}
              suffix="km"
              onChange={(n) => set({ distance: n })}
            />
            <NumField
              label="Cena paliwa"
              value={params.fuelPrice}
              step={0.01}
              suffix="zł/l"
              onChange={(n) => set({ fuelPrice: n })}
            />
            <NumField
              label="Liczba osób"
              value={params.people}
              onChange={(n) => set({ people: Math.max(1, Math.round(n)) })}
            />
          </div>
        </section>

        {/* Kurs */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            💱 Przelicznik
          </h2>
          <NumField
            label="Kurs CZK → PLN"
            value={params.rate}
            step={0.001}
            suffix="zł / 1 CZK"
            onChange={(n) => set({ rate: n })}
          />
          <p className="mt-2 text-xs text-slate-500">
            Przykład: 100 CZK = {zl(100 * params.rate)}
          </p>
        </section>

        {/* Własna pozycja */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            ➕ Dodaj koszt
          </h2>
          <div className="space-y-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nazwa (np. bilet do klubu, jedzenie)"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-base text-white outline-none focus:border-sky-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Kwota"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-base text-white outline-none focus:border-sky-500"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-base text-white outline-none focus:border-sky-500"
              >
                <option value="CZK">CZK</option>
                <option value="PLN">PLN</option>
              </select>
              <button
                onClick={addExtra}
                className="shrink-0 rounded-xl bg-sky-500 px-5 text-base font-bold text-white active:scale-95"
              >
                Dodaj
              </button>
            </div>
          </div>
        </section>

        {/* Lista kosztów */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            📋 Podsumowanie
          </h2>
          <ul className="divide-y divide-slate-800">
            {rows.map((r) => {
              const custom = r.id.startsWith('extra-u')
              return (
                <li key={r.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-100">{r.label}</div>
                    {r.original && (
                      <div className="truncate text-xs text-slate-500">{r.original}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-slate-100">{zl(r.pln)}</div>
                  {custom && (
                    <button
                      onClick={() => removeExtra(r.id.replace('extra-', ''))}
                      aria-label="Usuń"
                      className="shrink-0 rounded-full p-1 text-slate-500 hover:text-red-400"
                    >
                      🗑️
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-3 space-y-1 border-t border-slate-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Razem</span>
              <span className="text-2xl font-extrabold text-white">{zl(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Na osobę ({params.people})</span>
              <span className="font-bold text-emerald-400">{zl(perPerson)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
