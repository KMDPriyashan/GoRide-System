import { useMemo, useState } from 'react'
import { FiMapPin, FiSearch, FiX } from 'react-icons/fi'

export const COLOMBO_LOCATIONS = [
  { name: 'Colombo Fort', detail: 'Fort Railway Station', lat: 6.9344, lng: 79.8428 },
  { name: 'Pettah', detail: 'Main Street', lat: 6.936, lng: 79.850 },
  { name: 'Kollupitiya', detail: 'Liberty Plaza', lat: 6.9147, lng: 79.852 },
  { name: 'Cinnamon Gardens', detail: 'Independence Square', lat: 6.902, lng: 79.861 },
  { name: 'Borella', detail: 'Borella Junction', lat: 6.9147, lng: 79.877 },
  { name: 'Bambalapitiya', detail: 'Bambalapitiya Railway Station', lat: 6.8887, lng: 79.856 },
  { name: 'Narahenpita', detail: 'Narahenpita Junction', lat: 6.895, lng: 79.883 },
  { name: 'Wellawatte', detail: 'Wellawatte Beach', lat: 6.8741, lng: 79.860 },
  { name: 'Rajagiriya', detail: 'Rajagiriya Junction', lat: 6.906, lng: 79.895 },
  { name: 'Nugegoda', detail: 'Nugegoda Junction', lat: 6.8728, lng: 79.889 },
  { name: 'Dehiwala', detail: 'Dehiwala Zoological Gardens', lat: 6.856, lng: 79.865 },
]

/** Lightweight area picker for the prototype's Colombo mock geocoder. */
export default function LocationPicker({ open, title, onClose, onSelect, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery)
  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return COLOMBO_LOCATIONS

    return COLOMBO_LOCATIONS.filter((location) => {
      return `${location.name} ${location.detail}`.toLowerCase().includes(normalizedQuery)
    })
  }, [query])

  if (!open) return null

  return (
    <div className="picker-scrim" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="location-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <header className="picker-header">
          <div>
            <p className="eyebrow">COLOMBO, SRI LANKA</p>
            <h2 id="picker-title">{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close location picker">
            <FiX />
          </button>
        </header>
        <label className="picker-search">
          <FiSearch aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search an area or landmark"
          />
        </label>
        <div className="picker-results">
          {matches.map((location) => (
            <button
              type="button"
              className="picker-result"
              key={location.name}
              onClick={() => {
                onSelect(location)
                onClose()
              }}
            >
              <span className="picker-pin"><FiMapPin /></span>
              <span><strong>{location.name}</strong><small>{location.detail}</small></span>
              <span className="picker-city">Colombo</span>
            </button>
          ))}
          {matches.length === 0 && <p className="picker-empty">No matching Colombo areas.</p>}
        </div>
      </section>
    </div>
  )
}