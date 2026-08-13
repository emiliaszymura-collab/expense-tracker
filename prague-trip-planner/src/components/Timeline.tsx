import { useState } from 'react'
import type { Location } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_EMOJI } from '../data/trip'
import { googleMapsNavUrl } from '../lib/geo'

interface Props {
  locations: Location[]
  day: number
  onDay: (d: number) => void
  onFocus: (loc: Location) => void
}

// Oś czasu dnia — lista miejsc w kolejności zwiedzania z godziną orientacyjną.
export default function Timeline({ locations, day, onDay, onFocus }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const dayLocs = locations.filter((l) => l.day === day)

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-3 pb-2 pt-3 safe-top">
        <h1 className="text-xl font-bold text-white">Plan dnia</h1>
        <div className="mt-2 flex gap-1 rounded-xl bg-slate-800 p-1">
          {[1, 2].map((d) => (
            <button
              key={d}
              onClick={() => onDay(d)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                day === d ? 'bg-sky-500 text-white' : 'text-slate-300 active:bg-slate-700'
              }`}
            >
              Dzień {d}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 safe-bottom">
        <ol className="relative ml-3 border-l-2 border-slate-700">
          {dayLocs.map((loc) => {
            const color = CATEGORY_COLORS[loc.category]
            const open = expanded === loc.id
            return (
              <li key={loc.id} className="mb-3 ml-4">
                <span
                  className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-slate-900"
                  style={{ background: color }}
                />
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                  <button
                    onClick={() => {
                      onFocus(loc)
                      setExpanded(open ? null : loc.id)
                    }}
                    className="flex w-full items-center gap-3 p-3 text-left active:bg-slate-700/50"
                  >
                    <div className="w-12 shrink-0 text-center">
                      <div className="text-sm font-bold text-sky-300">{loc.time ?? '—'}</div>
                    </div>
                    <div className="text-xl">{CATEGORY_EMOJI[loc.category]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{loc.name}</div>
                      <div className="text-xs text-slate-400">
                        {CATEGORY_LABELS[loc.category]}
                        {loc.openHours ? ` · ${loc.openHours}` : ''}
                      </div>
                    </div>
                    <span className="text-slate-500">{open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-700 px-3 pb-3 pt-2 text-sm">
                      {loc.notes && <p className="text-slate-200">{loc.notes}</p>}
                      <p className="mt-2 text-slate-400">
                        💰{' '}
                        {loc.cost.amount <= 0
                          ? 'Bezpłatnie'
                          : `${loc.cost.amount} ${loc.cost.currency}`}
                        {loc.cost.note ? ` · ${loc.cost.note}` : ''}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onFocus(loc)}
                          className="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-semibold text-slate-100 active:scale-[0.98]"
                        >
                          📍 Pokaż na mapie
                        </button>
                        <a
                          href={googleMapsNavUrl(loc, 'walking')}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded-lg bg-sky-500 py-2 text-center text-sm font-bold text-white active:scale-[0.98]"
                        >
                          🧭 Nawiguj
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        {dayLocs.length === 0 && (
          <p className="mt-8 text-center text-slate-500">Brak miejsc dla tego dnia.</p>
        )}
      </div>
    </div>
  )
}
