import { useEffect, useMemo, useState } from 'react'
import {
  MapPin,
  Navigation,
  Share2,
  Trash2,
  Bookmark,
  Crosshair,
  Search,
  Plus,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import ShareLocationPanel from './maps/ShareLocationPanel'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const CATEGORY_LABELS = {
  services: 'Services',
  landmarks: 'Landmarks',
  travel: 'Travel',
  custom: 'Custom',
}

function formatCategory(category) {
  if (!category) return 'Location'
  return CATEGORY_LABELS[category] || category.replace(/_/g, ' ')
}

function groupPinsByCategory(pins) {
  const groups = new Map()
  for (const pin of pins) {
    const key = pin.category || 'other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(pin)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function MapsPinRow({ pin, onGo, onShare, onDelete, sharePanel }) {
  const expanded = !!sharePanel
  return (
    <div className={`maps-pin-card${expanded ? ' maps-pin-card--expanded' : ''}`}>
      <div className={`maps-pin-icon maps-pin-icon--${pin.category || 'default'}`}>
        <MapPin size={20} strokeWidth={2} />
      </div>
      <div className="maps-pin-info">
        <div className="maps-pin-label">{pin.label}</div>
        <div className="maps-pin-category">{formatCategory(pin.category)}</div>
      </div>
      <div className="maps-pin-actions">
        <button
          type="button"
          className="maps-action-btn maps-action-btn--go"
          onClick={() => onGo(pin)}
          aria-label={`Navigate to ${pin.label}`}
        >
          <Navigation size={18} />
        </button>
        <button
          type="button"
          className="maps-action-btn maps-action-btn--share"
          onClick={() => onShare(pin)}
          aria-label={`Share ${pin.label}`}
        >
          <Share2 size={18} />
        </button>
        {onDelete && (
          <button
            type="button"
            className="maps-action-btn maps-action-btn--delete"
            onClick={() => onDelete(pin.id)}
            aria-label={`Delete ${pin.label}`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {sharePanel}
    </div>
  )
}

export default function MapsScreen() {
  const { goBack, notify } = usePhone()
  const [tab, setTab] = useState('places')
  const [data, setData] = useState({ defaultPins: [], saved: [] })
  const [contacts, setContacts] = useState([])
  const [sharePin, setSharePin] = useState(null)
  const [currentSharePin, setCurrentSharePin] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [query, setQuery] = useState('')
  const [loadingShare, setLoadingShare] = useState(false)
  const [loadingCurrentShare, setLoadingCurrentShare] = useState(false)

  const load = () => fetchNui('getMapsData').then((d) => setData(d || { defaultPins: [], saved: [] }))

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setSharePin(null)
    setCurrentSharePin(null)
    setQuery('')
  }, [tab])

  const setWaypoint = async (pin) => {
    await fetchNui('setMapWaypoint', { x: pin.x, y: pin.y })
    notify('Maps', `Waypoint: ${pin.label}`, 'default')
  }

  const saveCurrent = async () => {
    const coords = await fetchNui('getPlayerCoords')
    if (!coords || !newLabel.trim()) return
    const res = await fetchNui('saveMapPin', {
      label: newLabel.trim(),
      x: coords.x,
      y: coords.y,
      z: coords.z,
      category: 'custom',
    })
    if (res?.ok) {
      setNewLabel('')
      notify('Maps', 'Location saved', 'default')
      load()
      setTab('saved')
    }
  }

  const goToCurrent = async () => {
    const coords = await fetchNui('getPlayerCoords')
    if (!coords) {
      notify('Maps', 'Could not get your location', 'error')
      return
    }
    await setWaypoint({ label: 'My location', x: coords.x, y: coords.y })
  }

  const openSharePanel = async (pin) => {
    if (sharePin?.label === pin.label && sharePin?.x === pin.x) {
      setSharePin(null)
      return
    }

    setLoadingShare(true)
    const contactList = await fetchNui('getContacts')
    setLoadingShare(false)
    setContacts(contactList || [])
    setSharePin(pin)
    setCurrentSharePin(null)
  }

  const openCurrentSharePanel = async () => {
    if (currentSharePin) {
      setCurrentSharePin(null)
      return
    }

    setLoadingCurrentShare(true)
    const [coords, contactList] = await Promise.all([fetchNui('getPlayerCoords'), fetchNui('getContacts')])
    setLoadingCurrentShare(false)

    if (!coords) {
      notify('Maps', 'Could not get your location', 'error')
      return
    }

    setContacts(contactList || [])
    setSharePin(null)
    setCurrentSharePin({ label: 'My location', x: coords.x, y: coords.y, z: coords.z })
  }

  const deletePin = async (id) => {
    await fetchNui('deleteMapPin', { id })
    if (sharePin?.id === id) setSharePin(null)
    load()
  }

  const filterPins = (pins) => {
    const q = query.trim().toLowerCase()
    if (!q) return pins
    return pins.filter(
      (p) =>
        (p.label || '').toLowerCase().includes(q) ||
        formatCategory(p.category).toLowerCase().includes(q)
    )
  }

  const groupedPlaces = useMemo(
    () => groupPinsByCategory(filterPins(data.defaultPins || [])),
    [data.defaultPins, query]
  )

  const filteredSaved = useMemo(() => filterPins(data.saved || []), [data.saved, query])

  const renderSharePanel = (pin, onClose) => (
    <ShareLocationPanel
      pin={pin}
      contacts={contacts}
      notify={notify}
      onCancel={onClose}
      onSent={onClose}
    />
  )

  const renderLocationCard = () => (
    <div className={`maps-location-card${currentSharePin ? ' maps-location-card--expanded' : ''}`}>
      <div className="maps-location-main">
        <div className="maps-location-icon">
          <Crosshair size={22} strokeWidth={2} />
        </div>
        <div className="maps-location-info">
          <div className="maps-location-label">My location</div>
          <div className="maps-location-sub">Set GPS to your current position</div>
        </div>
        <div className="maps-pin-actions">
          <button
            type="button"
            className="maps-action-btn maps-action-btn--go"
            onClick={goToCurrent}
            aria-label="Navigate to my location"
          >
            <Navigation size={18} />
          </button>
          <button
            type="button"
            className="maps-action-btn maps-action-btn--share"
            onClick={openCurrentSharePanel}
            disabled={loadingCurrentShare}
            aria-label="Share my location"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {currentSharePin && renderSharePanel(currentSharePin, () => setCurrentSharePin(null))}
    </div>
  )

  const renderPin = (pin, canDelete) => {
    const isSharing =
      sharePin &&
      sharePin.label === pin.label &&
      sharePin.x === pin.x &&
      (!pin.id || sharePin.id === pin.id)

    return (
      <MapsPinRow
        key={pin.id || pin.label}
        pin={pin}
        onGo={setWaypoint}
        onShare={openSharePanel}
        onDelete={canDelete ? deletePin : undefined}
        sharePanel={
          isSharing ? renderSharePanel(sharePin, () => setSharePin(null)) : null
        }
      />
    )
  }

  return (
    <AppScreen
      title="Maps"
      subtitle="GPS waypoints & saved pins"
      onBack={goBack}
      className="maps-app"
      tabs={[
        { id: 'places', label: 'Places', icon: MapPin },
        { id: 'saved', label: 'Saved', icon: Bookmark },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      <div className="maps-search">
        <Search size={16} className="maps-search-icon" aria-hidden />
        <input
          type="search"
          className="maps-search-input"
          placeholder={tab === 'places' ? 'Search places...' : 'Search saved pins...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {renderLocationCard()}

      {tab === 'places' && (
        <>
          <div className="phone-hero-card maps-hero">
            <div className="phone-hero-label">City guide</div>
            <div className="phone-hero-value">Quick waypoints</div>
            <p className="maps-hero-meta">Tap → on a place to set GPS</p>
          </div>

          {groupedPlaces.length === 0 ? (
            <div className="phone-empty maps-empty">
              <MapPin size={48} strokeWidth={1.5} />
              <p>{query.trim() ? 'No places match your search' : 'No places configured'}</p>
            </div>
          ) : (
            groupedPlaces.map(([category, pins]) => (
              <section key={category} className="maps-section">
                <p className="phone-section-label">{formatCategory(category)}</p>
                {pins.map((pin) => renderPin(pin, false))}
              </section>
            ))
          )}
        </>
      )}

      {tab === 'saved' && (
        <>
          <div className="maps-save-card">
            <div className="maps-save-header">
              <div className="maps-save-icon">
                <Plus size={20} strokeWidth={2.5} />
              </div>
              <div className="maps-save-info">
                <div className="maps-save-title">Save current spot</div>
                <div className="maps-save-sub">Store your position as a pin</div>
              </div>
            </div>
            <div className="phone-form-group maps-save-form">
              <label htmlFor="maps-pin-label">Label</label>
              <input
                id="maps-pin-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Home, stash, meetup..."
              />
            </div>
            <button
              type="button"
              className="phone-btn phone-btn-primary maps-save-btn"
              onClick={saveCurrent}
              disabled={!newLabel.trim()}
            >
              Save location
            </button>
          </div>

          {(data.saved || []).length > 0 && (
            <p className="phone-section-label maps-section">Your pins</p>
          )}

          {filteredSaved.length === 0 ? (
            <div className="phone-empty maps-empty">
              <Bookmark size={48} strokeWidth={1.5} />
              <p>{query.trim() ? 'No saved pins match your search' : 'No saved pins yet'}</p>
            </div>
          ) : (
            filteredSaved.map((pin) => renderPin(pin, true))
          )}
        </>
      )}

      {loadingShare && <p className="maps-loading-hint">Loading contacts...</p>}
    </AppScreen>
  )
}
