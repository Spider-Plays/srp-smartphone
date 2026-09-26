import { useEffect, useState } from 'react'
import { HeartPulse, Search, Stethoscope } from 'lucide-react'
import { fetchNui } from '../../../hooks/useNui'
import { usePhone } from '../../../context/PhoneContext'

export default function EmsTab() {
  const { notify } = usePhone()
  const [data, setData] = useState(null)
  const [serverId, setServerId] = useState('')
  const [patient, setPatient] = useState(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchNui('getEmsData').then(setData)
  }, [])

  const runLookup = async () => {
    const id = parseInt(serverId, 10)
    if (!id) return
    setSearching(true)
    const res = await fetchNui('emsPatientLookup', { targetSource: id })
    setSearching(false)
    if (res?.ok) setPatient(res)
    else notify('EMS', 'Patient not found', 'error')
  }

  if (!data?.allowed) {
    return (
      <div className="jobs-empty-card">
        <Stethoscope size={48} strokeWidth={1.5} />
        <h3>Hospital chart unavailable</h3>
        <p>EMS tools are only available for medical personnel.</p>
      </div>
    )
  }

  return (
    <>
      <div className="mdt-officer-card ems">
        <Stethoscope size={22} />
        <div>
          <span className="jobs-stat-label">Medic</span>
          <strong>{data.medic}</strong>
          <span className="phone-card-meta">{data.facility}</span>
        </div>
      </div>

      <p className="phone-section-label">Patient lookup (server ID)</p>
      <div className="mdt-search-row">
        <input
          className="doc-search"
          value={serverId}
          onChange={(e) => setServerId(e.target.value.replace(/\D/g, ''))}
          placeholder="Server ID"
          inputMode="numeric"
        />
        <button type="button" className="mdt-search-btn" onClick={runLookup} disabled={searching}>
          <Search size={18} />
        </button>
      </div>

      {patient && (
        <div className="mdt-result-card ems">
          <h3>{patient.name}</h3>
          <p>Citizen ID: {patient.citizenid}</p>
          <p>Phone: {patient.phone}</p>
          <p>Blood type: {patient.bloodType}</p>
          <p>Health: {patient.health}% · Armor: {patient.armor}%</p>
          {patient.isDead && (
            <span className="jobs-alert-badge" style={{ marginTop: 8, display: 'inline-block' }}>
              Critical / Incapacitated
            </span>
          )}
        </div>
      )}

      <div className="jobs-empty-card" style={{ marginTop: 16, padding: 20 }}>
        <HeartPulse size={32} />
        <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.7 }}>
          Enter a nearby player&apos;s server ID to pull basic vitals.
        </p>
      </div>
    </>
  )
}
