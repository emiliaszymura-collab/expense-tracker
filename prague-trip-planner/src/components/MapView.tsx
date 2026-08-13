import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Location } from '../types'
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '../data/trip'
import { PRAGUE_CENTER, type LatLng } from '../lib/geo'

// Kolorowy pin jako divIcon — kolor wg kategorii, emoji w środku.
function makeIcon(loc: Location, active: boolean): L.DivIcon {
  const color = CATEGORY_COLORS[loc.category]
  const size = active ? 44 : 36
  return L.divIcon({
    className: 'praga-pin',
    html: `
      <div style="
        width:${size}px;height:${size}px;transform:translate(-50%,-100%);
        display:flex;align-items:center;justify-content:center;
        border-radius:50% 50% 50% 0;background:${color};
        border:2px solid ${active ? '#fff' : 'rgba(255,255,255,.65)'};
        box-shadow:0 3px 8px rgba(0,0,0,.5);
        rotate:-45deg;font-size:${active ? 20 : 16}px;">
        <span style="rotate:45deg;line-height:1">${CATEGORY_EMOJI[loc.category]}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [0, 0],
  })
}

function Recenter({ target }: { target?: { lat: number; lng: number; k: number } }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 16, { duration: 0.6 })
  }, [target, map])
  return null
}

interface Props {
  locations: Location[]
  route: LatLng[]
  activeId?: string
  onSelect: (loc: Location) => void
  centerTarget?: { lat: number; lng: number; k: number }
}

export default function MapView({ locations, route, activeId, onSelect, centerTarget }: Props) {
  const markers = useMemo(
    () =>
      locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={makeIcon(loc, loc.id === activeId)}
          eventHandlers={{ click: () => onSelect(loc) }}
        />
      )),
    [locations, activeId, onSelect]
  )

  return (
    <MapContainer
      center={PRAGUE_CENTER}
      zoom={14}
      zoomControl={false}
      className="map-dark h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
        maxZoom={19}
      />
      {route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }}
        />
      )}
      {markers}
      <Recenter target={centerTarget} />
    </MapContainer>
  )
}
