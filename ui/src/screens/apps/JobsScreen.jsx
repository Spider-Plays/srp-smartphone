import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  Bell,
  BadgeDollarSign,
  Award,
  Clock,
  UserX,
  Shield,
  Stethoscope,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import { DiamondToggle } from '../settings/components'
import MdtTab from './jobs/MdtTab'
import EmsTab from './jobs/EmsTab'

const TAB_TITLES = {
  job: 'My Job',
  mdt: 'MDT',
  ems: 'EMS',
  alerts: 'Alerts',
}

const JOB_THEMES = {
  police: 'police',
  bcso: 'police',
  sasp: 'police',
  sheriff: 'police',
  ambulance: 'ems',
  doctor: 'ems',
  ems: 'ems',
  mechanic: 'mechanic',
}

function fmtPay(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function JobTab({ job, canToggleDuty, onToggleDuty, toggling }) {
  const theme = JOB_THEMES[job?.name] || ''
  const unemployed = !job || job.name === 'unemployed'

  if (unemployed) {
    return (
      <div className="jobs-empty-card">
        <UserX size={48} strokeWidth={1.5} />
        <h3>No active job</h3>
        <p>Open LifeInvader and go to Jobs to find employment.</p>
      </div>
    )
  }

  return (
    <>
      <div className={`jobs-profile-card ${theme}`.trim()}>
        <div className="jobs-profile-top">
          <div className="jobs-profile-icon">
            <Briefcase size={26} strokeWidth={2} />
          </div>
          <div className="jobs-profile-body">
            <div className="jobs-profile-label">Current position</div>
            <h2 className="jobs-profile-title">{job.label}</h2>
            {job.grade && <span className="jobs-profile-grade">{job.grade}</span>}
          </div>
        </div>
      </div>

      <div className="jobs-stats">
        <div className="jobs-stat-card">
          <div className="jobs-stat-label">Pay rate</div>
          <div className="jobs-stat-value pay">{fmtPay(job.payment)}</div>
        </div>
        <div className="jobs-stat-card">
          <div className="jobs-stat-label">Rank level</div>
          <div className="jobs-stat-value">{job.gradeLevel ?? 0}</div>
        </div>
      </div>

      <p className="phone-section-label">Shift status</p>
      <div className={`jobs-duty-card ${job.onDuty ? 'on-duty' : ''}`}>
        <div className="jobs-duty-icon">
          {job.onDuty ? <Clock size={22} /> : <BadgeDollarSign size={22} />}
        </div>
        <div className="jobs-duty-body">
          <h3>{job.onDuty ? 'On duty' : 'Off duty'}</h3>
          <p>
            {job.onDuty
              ? 'You are clocked in and receiving pay'
              : canToggleDuty
                ? 'Clock in when your shift starts'
                : 'Duty toggle unavailable'}
          </p>
        </div>
        {canToggleDuty && (
          <div
            className="jobs-duty-toggle"
            style={{ opacity: toggling ? 0.45 : 1, pointerEvents: toggling ? 'none' : 'auto' }}
          >
            <DiamondToggle
              checked={job.onDuty}
              onChange={() => onToggleDuty()}
              ariaLabel={job.onDuty ? 'Clock out' : 'Clock in'}
            />
          </div>
        )}
      </div>

      {job.grade && (
        <div className="jobs-stat-card" style={{ marginBottom: 0 }}>
          <div className="jobs-stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={12} />
            Department rank
          </div>
          <div className="jobs-stat-value" style={{ fontSize: 16 }}>
            {job.grade}
          </div>
        </div>
      )}
    </>
  )
}

function AlertsTab({ notifications, onMarkRead }) {
  if (!notifications.length) {
    return (
      <div className="jobs-empty-card">
        <Bell size={48} strokeWidth={1.5} />
        <h3>No alerts</h3>
        <p>Job updates and shift reminders will appear here.</p>
      </div>
    )
  }

  const unread = notifications.filter((n) => n.read_flag === 0).length

  return (
    <>
      <div className="jobs-alerts-header">
        <p className="phone-section-label" style={{ margin: 0 }}>
          Notifications
        </p>
        {unread > 0 && (
          <span className="jobs-alerts-count">{unread} unread</span>
        )}
      </div>
      {notifications.map((n) => {
        const isUnread = n.read_flag === 0
        return (
          <button
            key={n.id}
            type="button"
            className={`jobs-alert-card ${isUnread ? 'unread' : ''}`}
            onClick={() => isUnread && onMarkRead(n.id)}
          >
            <div className="jobs-alert-top">
              <span className="jobs-alert-dot" aria-hidden />
              <h3 className="jobs-alert-title">{n.title}</h3>
              {isUnread && <span className="jobs-alert-badge">New</span>}
            </div>
            <p className="jobs-alert-body">{n.body}</p>
            {n.timeAgo && <span className="jobs-alert-time">{n.timeAgo}</span>}
          </button>
        )
      })}
      {unread > 0 && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 8 }}>
          Tap a notification to mark as read
        </p>
      )}
    </>
  )
}

export default function JobsScreen() {
  const { goBack, notify } = usePhone()
  const [tab, setTab] = useState('job')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const load = () => {
    setLoading(true)
    fetchNui('getJobsData').then((d) => {
      setData(d)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const navTabs = useMemo(() => {
    const tabs = [{ id: 'job', label: 'My Job', icon: Briefcase }]
    if (data?.mdtAllowed) tabs.push({ id: 'mdt', label: 'MDT', icon: Shield })
    if (data?.emsAllowed) tabs.push({ id: 'ems', label: 'EMS', icon: Stethoscope })
    tabs.push({ id: 'alerts', label: 'Alerts', icon: Bell })
    return tabs
  }, [data?.mdtAllowed, data?.emsAllowed])

  useEffect(() => {
    if (!navTabs.some((t) => t.id === tab)) setTab('job')
  }, [navTabs, tab])

  const unreadCount = useMemo(
    () => (data?.notifications || []).filter((n) => n.read_flag === 0).length,
    [data?.notifications],
  )

  const toggleDuty = async () => {
    setToggling(true)
    const res = await fetchNui('toggleJobDuty')
    setToggling(false)
    if (res?.ok) {
      notify('Jobs', res.onDuty ? 'Clocked in' : 'Clocked out', 'default')
      load()
    } else {
      notify('Jobs', 'Could not toggle duty', 'error')
    }
  }

  const markRead = async (id) => {
    await fetchNui('markJobNotificationRead', { id })
    load()
  }

  const subtitle = useMemo(() => {
    if (loading) return undefined
    if (tab === 'alerts' && unreadCount > 0) return `${unreadCount} unread`
    if (tab === 'job' && data?.job?.name && data.job.name !== 'unemployed') {
      return data.job.onDuty ? 'On duty' : 'Off duty'
    }
    return undefined
  }, [tab, loading, unreadCount, data?.job])

  return (
    <AppScreen
      className="jobs-app"
      title={TAB_TITLES[tab] || 'Jobs'}
      subtitle={subtitle}
      onBack={goBack}
      tabs={navTabs}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      {loading ? (
        <div className="jobs-loading">
          <Briefcase size={48} />
          <p>Loading job data...</p>
        </div>
      ) : tab === 'job' ? (
        <JobTab
          job={data?.job}
          canToggleDuty={data?.canToggleDuty}
          onToggleDuty={toggleDuty}
          toggling={toggling}
        />
      ) : tab === 'mdt' ? (
        <MdtTab />
      ) : tab === 'ems' ? (
        <EmsTab />
      ) : (
        <AlertsTab notifications={data?.notifications || []} onMarkRead={markRead} />
      )}
    </AppScreen>
  )
}
