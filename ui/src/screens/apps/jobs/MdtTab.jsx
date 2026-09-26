import { useEffect, useState } from 'react'
import { Radio, Search, Shield } from 'lucide-react'
import { fetchNui } from '../../../hooks/useNui'
import { usePhone } from '../../../context/PhoneContext'

export default function MdtTab() {
  const { notify } = usePhone()
  const [data, setData] = useState(null)
  const [plate, setPlate] = useState('')
  const [lookup, setLookup] = useState(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchNui('getMdtData').then(setData)
  }, [])

  const runLookup = async () => {
    if (!plate.trim()) return
    setSearching(true)
    const res = await fetchNui('mdtPlateLookup', { plate: plate.trim() })
    setSearching(false)
    setLookup(res)
    if (!res?.ok) notify('MDT', 'Lookup failed', 'error')
  }

  if (!data?.allowed) {
    return (
      <div className="jobs-empty-card">
        <Shield size={48} strokeWidth={1.5} />
        <h3>MDT unavailable</h3>
        <p>Police MDT is only available while on duty as law enforcement.</p>
      </div>
    )
  }

  return (
    <>
      <div className="mdt-officer-card">
        <Shield size={22} />
        <div>
          <span className="jobs-stat-label">Officer</span>
          <strong>{data.officer}</strong>
          <span className="phone-card-meta">Badge #{data.badge}</span>
        </div>
      </div>

      <p className="phone-section-label">Plate lookup</p>
      <div className="mdt-search-row">
        <input
          className="doc-search"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="Enter plate"
          maxLength={8}
        />
        <button type="button" className="mdt-search-btn" onClick={runLookup} disabled={searching}>
          <Search size={18} />
        </button>
      </div>
      {lookup?.ok && (
        <div className="mdt-result-card">
          {lookup.found ? (
            <>
              <h3>{lookup.plate}</h3>
              <p>Vehicle: {lookup.vehicle}</p>
              <p>Owner: {lookup.owner}</p>
            </>
          ) : (
            <p>No registration found for {lookup.plate}</p>
          )}
        </div>
      )}

      <p className="phone-section-label">Active BOLOs</p>
      {(data.bolos || []).map((b) => (
        <div key={b.id} className="mdt-bolo-card">
          <div className="mdt-bolo-plate">{b.plate}</div>
          <p>{b.reason}</p>
          <span className="phone-card-meta">{b.officer}</span>
        </div>
      ))}

      <p className="phone-section-label">Warrants</p>
      {(data.warrants || []).map((w) => (
        <div key={w.id} className="jobs-alert-card">
          <h3 className="jobs-alert-title">{w.name}</h3>
          <p className="jobs-alert-body">{w.charge}</p>
          <span className="jobs-alert-badge">{w.status}</span>
        </div>
      ))}
    </>
  )
}
