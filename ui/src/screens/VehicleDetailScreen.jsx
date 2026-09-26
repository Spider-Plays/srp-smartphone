import { useState } from 'react'
import { Car, Navigation, X } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'

export default function VehicleDetailScreen() {
  const { screenParams, goBack, notify } = usePhone()
  const v = screenParams.vehicle || {}
  const [tracking, setTracking] = useState(false)
  const [trackingLoading, setTrackingLoading] = useState(false)

  const isParked = v.state === 1
  const location =
    v.state === 1 ? v.garage || 'Garage' : v.state === 2 ? 'Impound' : 'Out'

  const trackVehicle = async () => {
    if (!v.plate) return
    setTrackingLoading(true)
    const result = await fetchNui('trackVehicle', { plate: v.plate })
    setTrackingLoading(false)

    if (result?.success) {
      setTracking(true)
      notify('GPS Set', `Tracking ${v.label || v.vehicle}`, 'garage')
    } else {
      notify('Tracking Failed', result?.error || 'Vehicle not found', 'garage')
    }
  }

  const stopTracking = async () => {
    await fetchNui('stopTracking')
    setTracking(false)
    notify('Tracking Stopped', `Stopped tracking ${v.label || v.vehicle}`, 'garage')
  }

  return (
    <AppScreen title={v.label || v.vehicle || 'Vehicle'} onBack={goBack} className="garage-app vehicle-detail-app">
        <div className="vehicle-detail-view">
          <div className="detail-car-icon">
            <Car size={100} />
          </div>

          <div className="detail-info-card">
            <div className="info-row">
              <span className="info-label">Vehicle Name</span>
              <span className="info-value">{v.label || v.vehicle}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Model</span>
              <span className="info-value">{v.vehicle}</span>
            </div>
            <div className="info-row">
              <span className="info-label">License Plate</span>
              <span className="info-value plate-badge">{v.plate}</span>
            </div>
          </div>

          {isParked ? (
            <div className="detail-info-card parked">
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-value parked-status">Parked</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location</span>
                <span className="info-value">{location}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-info-card not-parked">
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value not-parked-status">Not Parked</span>
                </div>
              </div>

              <div className="track-status-card">
                <div className="status-indicator">
                  <div className={`status-dot ${tracking ? 'active' : ''}`} />
                  <span className="status-text">{tracking ? 'Tracking Active' : 'Tracking Inactive'}</span>
                </div>
                {tracking && (
                  <div className="tracking-info">
                    <Navigation size={40} className="tracking-icon" />
                    <p className="tracking-text">Monitoring {v.label || v.vehicle}</p>
                    <p className="tracking-subtext">Last updated: 2 mins ago</p>
                  </div>
                )}
              </div>

              {tracking ? (
                <button type="button" className="action-btn stop" onClick={stopTracking}>
                  <X size={20} />
                  Stop Tracking
                </button>
              ) : (
                <button type="button" className="action-btn" onClick={trackVehicle} disabled={trackingLoading}>
                  <Navigation size={20} />
                  {trackingLoading ? 'Locating...' : 'Track Vehicle'}
                </button>
              )}
            </>
          )}
        </div>
    </AppScreen>
  )
}
