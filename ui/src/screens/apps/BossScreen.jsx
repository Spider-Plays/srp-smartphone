import { useEffect, useState } from 'react'
import { Briefcase, Building2, DollarSign, Users } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import { DiamondToggle } from '../settings/components'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function BossScreen() {
  const { goBack, notify } = usePhone()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchNui('getBossData').then((d) => {
      setData(d)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const toggleEmployeeDuty = async (emp) => {
    if (emp.isSelf) return
    const res = await fetchNui('bossSetDuty', { targetSource: emp.source, onDuty: !emp.onDuty })
    if (res?.ok) {
      notify('Company', `${emp.name} ${res.onDuty ? 'clocked in' : 'clocked out'}`, 'default')
      load()
    } else {
      notify('Company', 'Could not update duty', 'error')
    }
  }

  return (
    <AppScreen className="boss-app" title="Company" subtitle={data?.job?.label} onBack={goBack}>
      {loading ? (
        <div className="phone-empty">
          <Building2 size={48} />
          <p>Loading company...</p>
        </div>
      ) : !data?.isBoss ? (
        <div className="jobs-empty-card">
          <Briefcase size={48} strokeWidth={1.5} />
          <h3>Not a manager</h3>
          <p>You need a senior rank to access company management.</p>
          {data?.job?.label && (
            <p className="phone-card-meta" style={{ marginTop: 8 }}>
              Current: {data.job.label} — {data.job.grade || 'Staff'}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="boss-balance-card">
            <DollarSign size={24} />
            <div>
              <span className="jobs-stat-label">Society balance</span>
              <div className="jobs-stat-value pay">{fmt(data.societyBalance)}</div>
            </div>
          </div>

          <div className="jobs-stats">
            <div className="jobs-stat-card">
              <div className="jobs-stat-label">Department</div>
              <div className="jobs-stat-value" style={{ fontSize: 16 }}>{data.job.label}</div>
            </div>
            <div className="jobs-stat-card">
              <div className="jobs-stat-label">Online staff</div>
              <div className="jobs-stat-value">{(data.employees || []).length}</div>
            </div>
          </div>

          <p className="phone-section-label">
            <Users size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            Employees online
          </p>
          {(data.employees || []).length === 0 ? (
            <div className="properties-section-empty">No employees online</div>
          ) : (
            data.employees.map((emp) => (
              <div key={emp.source} className="boss-employee-row">
                <div className="boss-employee-info">
                  <strong>{emp.name}{emp.isSelf ? ' (You)' : ''}</strong>
                  <span>{emp.grade}</span>
                  <span className={`boss-duty-pill ${emp.onDuty ? 'on' : ''}`}>
                    {emp.onDuty ? 'On duty' : 'Off duty'}
                  </span>
                </div>
                {!emp.isSelf && (
                  <DiamondToggle
                    checked={emp.onDuty}
                    onChange={() => toggleEmployeeDuty(emp)}
                    ariaLabel={`Toggle duty for ${emp.name}`}
                  />
                )}
              </div>
            ))
          )}
        </>
      )}
    </AppScreen>
  )
}
