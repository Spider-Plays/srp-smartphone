import { useEffect, useState } from 'react'
import { Car, ChevronRight } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'

export default function GarageScreen() {
  const { navigate, goBack, phoneFlipped, screen, screenParams } = usePhone()
  const openPlate = phoneFlipped && screen === 'vehicle-detail' ? screenParams?.vehicle?.plate : null
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await Promise.race([
          fetchNui('getVehicles'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ])
        if (!cancelled) {
          setVehicles(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setVehicles([])
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppScreen title="My Garage" onBack={goBack} className="garage-app">
        {loading ? (
          <div className="empty-state">
            <Car size={48} />
            <p>Loading vehicles...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <Car size={48} />
            <p>No vehicles found</p>
          </div>
        ) : (
          <div className="vehicles-list">
            <div className="list-header">
              <h3 className="list-title">My Vehicles</h3>
              <span className="vehicle-count">
                {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
              </span>
            </div>
            {vehicles.map((v, i) => (
              <div
                key={v.plate || v.id || i}
                className={`vehicle-card${openPlate && openPlate === v.plate ? ' is-active' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
                onClick={() => navigate('vehicle-detail', { vehicle: v })}
              >
                <div className="vehicle-icon">
                  <Car size={32} />
                </div>
                <div className="vehicle-info">
                  <div className="vehicle-name">{v.label || v.vehicle}</div>
                  <div className="vehicle-model">{v.vehicle}</div>
                  <div className="vehicle-plate">{v.plate}</div>
                </div>
                <div className="vehicle-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
    </AppScreen>
  )
}
