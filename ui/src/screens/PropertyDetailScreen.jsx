import { useState } from 'react'
import { Key, MapPin, Navigation } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { formatPurchasedAt } from '../utils/formatDate'

export default function PropertyDetailScreen() {
  const { screenParams, goBack, notify } = usePhone()
  const property = screenParams.property || {}
  const [waypointLoading, setWaypointLoading] = useState(false)

  const statusLabel =
    property.ownership === 'rented'
      ? 'Rented'
      : property.category === 'apartment'
        ? 'Owned Apartment'
        : 'Owned'

  const setWaypoint = async () => {
    if (!property.id && (!property.enter?.x || !property.enter?.y)) {
      notify('GPS Failed', 'No entrance location available', 'properties')
      return
    }

    setWaypointLoading(true)
    const result = await fetchNui('setPropertyWaypoint', {
      id: property.id,
      provider: property.provider,
      x: property.enter?.x,
      y: property.enter?.y,
    })
    setWaypointLoading(false)

    if (result?.ok) {
      notify('GPS Set', `Route to ${property.buildingLabel || property.label}`, 'properties')
    } else {
      notify('GPS Failed', 'Could not set waypoint', 'properties')
    }
  }

  return (
    <AppScreen
      title={property.label || property.buildingLabel || 'Property'}
      subtitle={statusLabel}
      onBack={goBack}
      className="properties-app"
      footer={
        <button type="button" className="props-primary-btn" onClick={setWaypoint} disabled={waypointLoading}>
          <Navigation size={18} />
          {waypointLoading ? 'Setting GPS…' : 'Navigate to property'}
        </button>
      }
    >
      <div className="props-agent-profile">
        <div className="props-place-icon" style={{ width: 64, height: 64, borderRadius: '50%' }}>
          <Key size={28} />
        </div>
        <div>
          {(property.address || property.buildingLabel) && (
            <div className="props-agent-phone">
              <MapPin size={14} />
              {property.address || property.buildingLabel}
            </div>
          )}
          {property.unitLabel || property.apartmentNumber ? (
            <p className="props-agent-subtitle" style={{ marginTop: 8 }}>
              {property.unitLabel || `Unit ${property.apartmentNumber}`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="props-stats-row">
        <div className="props-stat">
          <div className="props-stat-label">STATUS</div>
          <div className="props-stat-value" style={{ fontSize: 14 }}>
            {statusLabel}
          </div>
        </div>
        <div className="props-stat">
          <div className="props-stat-label">UNIT</div>
          <div className="props-stat-value" style={{ fontSize: 14 }}>
            {property.apartmentNumber || property.unitLabel || '—'}
          </div>
        </div>
        <div className="props-stat">
          <div className="props-stat-label">SINCE</div>
          <div className="props-stat-value" style={{ fontSize: 13 }}>
            {property.purchasedAt ? formatPurchasedAt(property.purchasedAt) : '—'}
          </div>
        </div>
      </div>
    </AppScreen>
  )
}
