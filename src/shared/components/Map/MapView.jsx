import { useEffect } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { FiCrosshair, FiMinus, FiPlus } from 'react-icons/fi'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../../config/appConfig.js'
import 'leaflet/dist/leaflet.css'

function getLatLng(location) {
  if (Array.isArray(location)) return location
  return [location.lat ?? location.latitude, location.lng ?? location.longitude]
}

function markerIcon(kind = 'destination') {
  const supportedKinds = ['pickup', 'dropoff', 'driver', 'current']
  const safeKind = supportedKinds.includes(kind) ? kind : 'destination'

  return L.divIcon({
    className: 'goride-marker-shell',
    html: `<span class="goride-marker goride-marker--${safeKind}"></span>`,
    iconSize: [28, 38],
    iconAnchor: [14, 34],
  })
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function CenterUpdater({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (!center) return
    map.setView(getLatLng(center), zoom, { animate: true })
  }, [center, map, zoom])

  return null
}

function MapControls({ center, zoom }) {
  const map = useMap()

  return (
    <div className="map-controls" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>
        <FiPlus />
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>
        <FiMinus />
      </button>
      <button type="button" aria-label="Recenter map" onClick={() => map.setView(getLatLng(center), zoom)}>
        <FiCrosshair />
      </button>
    </div>
  )
}

/** Responsive Leaflet wrapper with typed markers, optional route, and controls. */
export default function MapView({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  markers = [],
  polyline = [],
  polylines = [],
  onMapClick,
  className = '',
}) {
  const routePositions = Array.isArray(polyline) ? polyline.map(getLatLng) : []

  return (
    <div className={`map-view ${className}`}>
      <MapContainer center={getLatLng(center)} zoom={zoom} zoomControl={false} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterUpdater center={center} zoom={zoom} />
        <MapClickHandler onMapClick={onMapClick} />
        <MapControls center={center} zoom={zoom} />
        {markers.map((marker, index) => {
          const position = marker.position ?? marker.location ?? marker
          const markerKey = marker.id ?? `${marker.kind ?? 'marker'}-${index}`
          return (
            <Marker key={markerKey} position={getLatLng(position)} icon={markerIcon(marker.kind)} />
          )
        })}
        {routePositions.length > 1 && (
          <Polyline positions={routePositions} pathOptions={{ color: '#10B981', weight: 5, opacity: 0.9 }} />
        )}
        {polylines.map((route) => {
          const positions = Array.isArray(route.positions) ? route.positions.map(getLatLng) : []
          return positions.length > 1 ? (
            <Polyline key={route.id} positions={positions} pathOptions={{ color: '#3388ff', weight: 4, opacity: 0.78 }} />
          ) : null
        })}
      </MapContainer>
    </div>
  )
}