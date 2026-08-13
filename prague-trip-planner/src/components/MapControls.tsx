import type { Category } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/trip'

const ALL_CATS: Category[] = ['sleep', 'shower', 'sightseeing', 'club', 'food', 'parking']

interface Props {
  day: number
  onDay: (d: number) => void
  active: Set<Category>
  onToggle: (c: Category) => void
}

// Nakładka nad mapą: przełącznik dnia + filtr kategorii (checkboxy).
export default function MapControls({ day, onDay, active, onToggle }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 p-2 safe-top">
      {/* Przełącznik dnia */}
      <div className="pointer-events-auto mx-auto flex w-full max-w-md gap-1 rounded-xl bg-slate-800/90 p-1 shadow-lg backdrop-blur">
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

      {/* Filtr kategorii */}
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-wrap gap-1.5 rounded-xl bg-slate-800/90 p-2 shadow-lg backdrop-blur">
        {ALL_CATS.map((c) => {
          const on = active.has(c)
          const color = CATEGORY_COLORS[c]
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                on ? 'text-white' : 'text-slate-400'
              }`}
              style={{
                borderColor: on ? color : '#475569',
                background: on ? color + '33' : 'transparent',
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: on ? color : '#475569' }}
              />
              {CATEGORY_LABELS[c]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
