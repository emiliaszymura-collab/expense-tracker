import type { Location } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_EMOJI } from '../data/trip'
import { googleMapsNavUrl } from '../lib/geo'

interface Props {
  loc: Location
  onClose: () => void
}

// Dolna karta miejsca — pojawia się po tapnięciu markera.
export default function LocationCard({ loc, onClose }: Props) {
  const color = CATEGORY_COLORS[loc.category]
  const free = loc.cost.amount <= 0
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-[1000] flex justify-center px-3 safe-bottom">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: color + '33', border: `1px solid ${color}` }}
          >
            {CATEGORY_EMOJI[loc.category]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ background: color + '33', color }}
              >
                {CATEGORY_LABELS[loc.category]}
              </span>
              <span className="text-xs text-slate-400">Dzień {loc.day}</span>
            </div>
            <h3 className="mt-1 truncate text-lg font-bold text-white">{loc.name}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="-mr-1 -mt-1 rounded-full p-2 text-slate-400 hover:text-white active:scale-95"
          >
            ✕
          </button>
        </div>

        <dl className="mt-3 space-y-2 text-sm">
          {loc.openHours && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-400">🕑 Godziny</dt>
              <dd className="text-slate-100">{loc.openHours}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-slate-400">💰 Koszt</dt>
            <dd className="text-slate-100">
              {free ? (
                <span className="text-emerald-400">Bezpłatnie</span>
              ) : (
                <>
                  <span className="font-semibold">
                    {loc.cost.amount} {loc.cost.currency}
                  </span>
                  {loc.cost.note && <span className="text-slate-400"> · {loc.cost.note}</span>}
                </>
              )}
            </dd>
          </div>
          {loc.notes && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-400">📝 Notatka</dt>
              <dd className="text-slate-200">{loc.notes}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={googleMapsNavUrl(loc, 'walking')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-base font-bold text-white active:scale-[0.98]"
          >
            🧭 Nawiguj
          </a>
          <a
            href={googleMapsNavUrl(loc, 'driving')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 py-3 text-base font-semibold text-slate-100 active:scale-[0.98]"
          >
            🚗 Autem
          </a>
        </div>
      </div>
    </div>
  )
}
