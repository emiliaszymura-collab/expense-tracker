export type Tab = 'map' | 'plan' | 'costs'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map', label: 'Mapa', icon: '🗺️' },
  { id: 'plan', label: 'Plan', icon: '📋' },
  { id: 'costs', label: 'Koszty', icon: '💰' },
]

// Dolna nawigacja — jeden ekran = jedna czynność.
export default function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1100] flex border-t border-slate-800 bg-slate-900/95 backdrop-blur safe-bottom">
      {TABS.map((t) => {
        const on = tab === t.id
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
              on ? 'text-sky-400' : 'text-slate-500 active:text-slate-300'
            }`}
          >
            <span className={`text-2xl transition ${on ? 'scale-110' : ''}`}>{t.icon}</span>
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
