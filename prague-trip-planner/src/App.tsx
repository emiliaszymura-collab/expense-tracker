import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Category, CostParams, ExtraCost, Location } from './types'
import { BUILTIN_EXTRA_COSTS, LOCATIONS } from './data/trip'
import { fetchOsrmRoute, type LatLng } from './lib/geo'
import { load, save } from './lib/storage'
import MapView from './components/MapView'
import MapControls from './components/MapControls'
import LocationCard from './components/LocationCard'
import Timeline from './components/Timeline'
import Costs from './components/Costs'
import BottomNav, { type Tab } from './components/BottomNav'

const ALL_CATS: Category[] = ['sleep', 'shower', 'sightseeing', 'club', 'food', 'parking']

const DEFAULT_PARAMS: CostParams = {
  consumption: 7,
  distance: 1000, // Warszawa–Praga–Warszawa ~1000 km
  fuelPrice: 6.4,
  people: 2,
  rate: 0.183,
}

export default function App() {
  const [tab, setTab] = useState<Tab>('map')
  const [day, setDay] = useState<number>(() => load('day', 1))
  const [activeCats, setActiveCats] = useState<Set<Category>>(
    () => new Set(load<Category[]>('cats', ALL_CATS))
  )
  const [selected, setSelected] = useState<Location | null>(null)
  const [centerTarget, setCenterTarget] = useState<{ lat: number; lng: number; k: number }>()
  const [route, setRoute] = useState<LatLng[]>([])

  const [params, setParams] = useState<CostParams>(() => load('params', DEFAULT_PARAMS))
  const [extras, setExtras] = useState<ExtraCost[]>(() => load('extras', BUILTIN_EXTRA_COSTS))

  // Persist do localStorage.
  useEffect(() => save('day', day), [day])
  useEffect(() => save('cats', [...activeCats]), [activeCats])
  useEffect(() => save('params', params), [params])
  useEffect(() => save('extras', extras), [extras])

  const dayLocs = useMemo(() => LOCATIONS.filter((l) => l.day === day), [day])
  const visible = useMemo(
    () => dayLocs.filter((l) => activeCats.has(l.category)),
    [dayLocs, activeCats]
  )

  // Trasa dnia: OSRM (pieszo), fallback do prostych linii między punktami.
  useEffect(() => {
    let cancelled = false
    const straight: LatLng[] = dayLocs.map((l) => [l.lat, l.lng])
    setRoute(straight)
    fetchOsrmRoute(dayLocs).then((r) => {
      if (!cancelled && r) setRoute(r)
    })
    return () => {
      cancelled = true
    }
  }, [dayLocs])

  const toggleCat = useCallback((c: Category) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }, [])

  const focusOnMap = useCallback((loc: Location) => {
    setDay(loc.day)
    setSelected(loc)
    setCenterTarget({ lat: loc.lat, lng: loc.lng, k: Date.now() })
    setTab('map')
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-900">
      <main className="relative flex-1 overflow-hidden pb-16">
        {/* Mapa jest zawsze zamontowana (żeby nie przeładowywać kafli), tylko ukrywana. */}
        <div className={tab === 'map' ? 'absolute inset-0' : 'hidden'}>
          <MapView
            locations={visible}
            route={route}
            activeId={selected?.id}
            onSelect={setSelected}
            centerTarget={centerTarget}
          />
          <MapControls day={day} onDay={setDay} active={activeCats} onToggle={toggleCat} />
          {selected && tab === 'map' && (
            <LocationCard loc={selected} onClose={() => setSelected(null)} />
          )}
        </div>

        {tab === 'plan' && (
          <div className="absolute inset-0">
            <Timeline locations={LOCATIONS} day={day} onDay={setDay} onFocus={focusOnMap} />
          </div>
        )}

        {tab === 'costs' && (
          <div className="absolute inset-0">
            <Costs
              params={params}
              onParams={setParams}
              extras={extras}
              onExtras={setExtras}
              locations={LOCATIONS}
            />
          </div>
        )}
      </main>

      <BottomNav tab={tab} onTab={setTab} />
    </div>
  )
}
