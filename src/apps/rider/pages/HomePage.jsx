import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiBriefcase, FiEdit2, FiGift, FiHome, FiMapPin } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'
import { DEFAULT_MAP_CENTER } from '../../../config/appConfig.js'
import { getCurrentPosition, reverseGeocode } from '../../../shared/utils/geoUtils.js'
import MapView from '../../../shared/components/Map/MapView.jsx'
import LocationPicker, { COLOMBO_LOCATIONS } from '../components/LocationPicker.jsx'

const RECENT_DESTINATIONS = [
  COLOMBO_LOCATIONS[0],
  COLOMBO_LOCATIONS[5],
  COLOMBO_LOCATIONS[8],
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pickup, setPickup] = useState({
    ...DEFAULT_MAP_CENTER,
    name: 'Current location',
  })
  const [destination, setDestination] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [savedPlaces, setSavedPlaces] = useState([
    { name: 'Home', detail: 'Nugegoda', icon: FiHome, location: COLOMBO_LOCATIONS[9] },
    { name: 'Work', detail: 'Kollupitiya', icon: FiBriefcase, location: COLOMBO_LOCATIONS[2] },
  ])

  useEffect(() => {
    let mounted = true
    getCurrentPosition()
      .then((location) => {
        if (mounted) {
          setPickup({
            ...location,
            name: reverseGeocode(location.lat, location.lng),
          })
        }
      })
      .catch(() => {})

    return () => { mounted = false }
  }, [])

  const openBooking = (nextDestination = destination) => {
    if (!nextDestination) {
      setPickerOpen(true)
      return
    }

    navigate('/rider/booking', {
      state: { pickup, destination: nextDestination },
    })
  }

  return (
    <main className="rider-home">
      <MapView
        center={pickup}
        markers={[{ id: 'pickup', position: pickup, kind: 'current' }]}
        className="home-map"
        onMapClick={(location) => setPickup({ ...location, name: reverseGeocode(location.lat, location.lng) })}
      />
      <header className="home-topbar">
        <div className="brand-lockup"><span className="brand-mark">G</span><span>GoRide</span></div>
        <div className="home-greeting">
          <span className="eyebrow">GOOD TO SEE YOU</span>
          <strong>{user?.fullName?.split(' ')[0] || 'Rider'}</strong>
        </div>
      </header>

      <section className="home-search-wrap" aria-label="Plan a trip">
        <button type="button" className="home-search" onClick={() => setPickerOpen(true)}>
          <span className="search-dot" />
          <span>{destination?.name || 'Where to?'}</span>
          <FiArrowUpRight aria-hidden="true" />
        </button>
        <p className="pickup-note"><FiMapPin /> Pickup near {pickup.name || 'Colombo'}</p>
      </section>

      <section className="home-discovery" aria-label="Ride shortcuts and destinations">
        <div className="promo-banner">
          <div className="promo-icon"><FiGift /></div>
          <div className="promo-copy">
            <span>YOUR NEXT RIDE, A LITTLE LIGHTER</span>
            <strong>Save 15% on your first trip</strong>
          </div>
          <span className="promo-code">HELLOGO</span>
        </div>

        <div className="home-section-heading">
          <div><span className="eyebrow">ONE TAP AWAY</span><h2>Saved places</h2></div>
        </div>
        <div className="saved-places">
          {savedPlaces.map(({ name, detail, icon: Icon, location }) => (
            <div className="saved-place-entry" key={name}>
              <button type="button" className="saved-place" onClick={() => openBooking(location)}>
                <span className="saved-place-icon"><Icon /></span>
                <span><strong>{name}</strong><small>{detail}</small></span>
                <FiArrowUpRight />
              </button>
              <button
                type="button"
                className="saved-place-edit"
                aria-label={`Edit ${name} location`}
                onClick={() => {
                  setEditingPlace(name)
                  setPickerOpen(true)
                }}
              ><FiEdit2 /></button>
            </div>
          ))}
        </div>

        <div className="home-section-heading recent-heading">
          <div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Recent destinations</h2></div>
        </div>
        <div className="recent-list">
          {RECENT_DESTINATIONS.map((location) => (
            <button type="button" className="recent-place" key={location.name} onClick={() => openBooking(location)}>
              <span className="recent-clock">↗</span>
              <span><strong>{location.name}</strong><small>{location.detail}</small></span>
              <FiArrowUpRight />
            </button>
          ))}
        </div>
        <button type="button" className="plan-ride-button" onClick={() => openBooking()}>
          Plan a ride <FiArrowUpRight />
        </button>
      </section>

      <LocationPicker
        open={pickerOpen}
        title={editingPlace ? `Set your ${editingPlace.toLowerCase()} location` : 'Where are you going?'}
        onClose={() => {
          setPickerOpen(false)
          setEditingPlace(null)
        }}
        onSelect={(location) => {
          if (editingPlace) {
            setSavedPlaces((places) => places.map((place) => (
              place.name === editingPlace ? { ...place, detail: location.name, location } : place
            )))
            setEditingPlace(null)
            return
          }

          setDestination(location)
          openBooking(location)
        }}
      />
    </main>
  )
}