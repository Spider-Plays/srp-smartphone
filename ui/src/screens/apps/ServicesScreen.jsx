import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wrench,
  Car,
  Truck,
  MapPin,
  ChevronRight,
  ClipboardList,
  History,
  MessageSquare,
  Briefcase,
  Navigation,
  CheckCircle2,
  Star,
  FileText,
  TrendingUp,
  Award,
  X,
  Route,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui, useNuiEvent } from '../../hooks/useNui'
import { DiamondToggle } from '../settings/components'

const TAB_TITLES = {
  request: 'Request',
  history: 'History',
  jobs: 'Live Calls',
  work: 'My Shift',
  contracts: 'Contracts',
}

const SERVICE_META = {
  taxi: {
    icon: Car,
    accent: '#ffcc00',
    bg: 'rgba(255, 204, 0, 0.15)',
  },
  mechanic: {
    icon: Wrench,
    accent: '#ff9f0a',
    bg: 'rgba(255, 159, 10, 0.15)',
  },
  tow: {
    icon: Truck,
    accent: '#5e5ce6',
    bg: 'rgba(94, 92, 230, 0.15)',
  },
}

const DEFAULT_META = {
  icon: Wrench,
  accent: '#ff9f0a',
  bg: 'rgba(255, 159, 10, 0.15)',
}

function getMeta(id) {
  return SERVICE_META[id] || DEFAULT_META
}

function formatStatus(status) {
  const s = (status || 'open').toLowerCase()
  if (s === 'open') return 'Open'
  if (s === 'accepted' || s === 'active') return 'Active'
  if (s === 'completed' || s === 'closed' || s === 'done') return 'Done'
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatusBadge({ status }) {
  const key = (status || 'open').toLowerCase()
  return <span className={`services-status ${key}`}>{formatStatus(status)}</span>
}

function ServiceTypeCard({ type, selected, onSelect }) {
  const meta = getMeta(type.id)
  const Icon = meta.icon
  return (
    <button
      type="button"
      className={`services-type-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(type.id)}
      aria-pressed={selected}
    >
      <div className="services-type-icon" style={{ background: meta.bg, color: meta.accent }}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3>{type.label}</h3>
      <p>{type.description}</p>
    </button>
  )
}

function RequestTab({ types, selected, onSelect, message, setMessage, onRequest, sending }) {
  const selectedType = types.find((t) => t.id === selected)
  const meta = selected ? getMeta(selected) : null
  const SelectedIcon = meta?.icon

  return (
    <>
      <div className="services-hero">
        <div className="services-hero-top">
          <div className="services-hero-icon">
            <Wrench size={26} strokeWidth={2} />
          </div>
          <div className="services-hero-body">
            <div className="services-hero-label">City services</div>
            <h2 className="services-hero-title">Get help on the way</h2>
            <p className="services-hero-desc">
              Request a taxi, mechanic, or tow truck. Your location is shared automatically.
            </p>
            <span className="services-location-pill">
              <MapPin size={12} />
              GPS shared with provider
            </span>
          </div>
        </div>
      </div>

      <p className="phone-section-label">Available services</p>
      {!types.length ? (
        <div className="services-empty-card">
          <Wrench size={48} strokeWidth={1.5} />
          <h3>No services configured</h3>
          <p>Ask your server admin to set up Config.Services.</p>
        </div>
      ) : (
        <div className="services-grid">
          {types.map((t) => (
            <ServiceTypeCard
              key={t.id}
              type={t}
              selected={selected === t.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {selectedType && meta && (
        <div className="services-request-card">
          <div className="services-request-header">
            <div
              className="services-type-icon"
              style={{ background: meta.bg, color: meta.accent, marginBottom: 0 }}
            >
              {SelectedIcon && <SelectedIcon size={20} strokeWidth={2} />}
            </div>
            <div>
              <h3>{selectedType.label}</h3>
              <p>{selectedType.description}</p>
            </div>
          </div>
          <textarea
            className="services-message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Where are you? Describe what you need..."
            rows={3}
            maxLength={255}
          />
          <div className="services-request-footer">
            <span className="services-request-hint">
              <MessageSquare size={13} />
              Optional note
            </span>
            <button
              type="button"
              className="services-send-btn"
              disabled={sending}
              onClick={onRequest}
            >
              {sending ? 'Sending...' : 'Request'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function HistoryTab({ requests, typeLabels }) {
  if (!requests.length) {
    return (
      <div className="services-empty-card">
        <History size={48} strokeWidth={1.5} />
        <h3>No requests yet</h3>
        <p>Your service requests will appear here after you send one.</p>
      </div>
    )
  }

  const openCount = requests.filter((r) => (r.status || 'open').toLowerCase() === 'open').length

  return (
    <>
      <div className="services-history-header">
        <p className="phone-section-label" style={{ margin: 0 }}>
          Your requests
        </p>
        {openCount > 0 && (
          <span className="services-history-count">{openCount} open</span>
        )}
      </div>
      {requests.map((req) => {
        const meta = getMeta(req.service_type)
        const Icon = meta.icon
        const label = typeLabels[req.service_type] || req.service_type
        const isOpen = (req.status || 'open').toLowerCase() === 'open'
        return (
          <div key={req.id} className={`services-history-card ${isOpen ? 'open' : ''}`}>
            <div className="services-history-top">
              <div className="services-history-icon" style={{ background: meta.bg, color: meta.accent }}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <div className="services-history-info">
                <div className="services-history-row">
                  <h3 className="services-history-title">{label}</h3>
                  <StatusBadge status={req.status} />
                </div>
                {req.message && <p className="services-history-message">{req.message}</p>}
                <span className="services-history-time">{req.timeAgo || formatTimeAgo(req.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

function WorkerJobPage({ profile, meta, togglingNpc, onToggleNpc }) {
  if (!profile) {
    return (
      <div className="services-empty-card">
        <Briefcase size={48} strokeWidth={1.5} />
        <h3>Not on a service job</h3>
        <p>Apply for Taxi, Mechanic, or Tow Truck via LifeInvader Jobs.</p>
      </div>
    )
  }

  const Icon = meta?.icon || Wrench
  const xpPct = profile.xpPerLevel
    ? Math.min(100, Math.round((profile.xpIntoLevel / profile.xpPerLevel) * 100))
    : 0
  const repPct = profile.maxReputation
    ? Math.min(100, Math.round((profile.reputation / profile.maxReputation) * 100))
    : 0

  return (
    <>
      <div className="services-work-hero" style={{ borderColor: `${meta?.accent}44` }}>
        <div className="services-work-hero-icon" style={{ background: meta?.bg, color: meta?.accent }}>
          <Icon size={28} strokeWidth={2} />
        </div>
        <div>
          <span className="services-work-hero-label">{profile.serviceLabel} · {profile.rankLabel}</span>
          <h2 className="services-work-hero-title">Level {profile.level}</h2>
          <p className="services-work-hero-desc">
            {profile.totalNpcJobs} contracts completed · Market reputation {profile.reputation}%
          </p>
        </div>
      </div>

      <div className="services-work-stats">
        <div className="services-work-stat">
          <TrendingUp size={14} />
          <span>Experience</span>
          <strong>{profile.xp} XP</strong>
          <div className="services-work-bar">
            <div className="services-work-bar-fill xp" style={{ width: `${xpPct}%`, background: meta?.accent }} />
          </div>
          <small>
            {profile.xpIntoLevel} / {profile.xpPerLevel} to next level
          </small>
        </div>
        <div className="services-work-stat">
          <Award size={14} />
          <span>Market reputation</span>
          <strong>{profile.reputation}%</strong>
          <div className="services-work-bar">
            <div className="services-work-bar-fill rep" style={{ width: `${repPct}%` }} />
          </div>
          <small>Higher rep improves visibility in LifeInvader services</small>
        </div>
      </div>

      <p className="phone-section-label">NPC contracts</p>
      <div className={`services-npc-toggle-card ${profile.npcJobsEnabled ? 'active' : ''}`}>
        <div className="services-npc-toggle-icon" style={{ background: meta?.bg, color: meta?.accent }}>
          <Star size={20} />
        </div>
        <div className="services-npc-toggle-body">
          <h3>Receive NPC jobs</h3>
          <p>
            {profile.onDuty
              ? profile.npcJobsEnabled
                ? 'Contracts will appear in the Contracts tab while on duty'
                : 'Enable to receive automated taxi, repair, and tow calls'
              : 'Clock in on duty to receive NPC contracts'}
          </p>
        </div>
        <div style={{ opacity: togglingNpc ? 0.45 : 1, pointerEvents: togglingNpc || !profile.onDuty ? 'none' : 'auto' }}>
          <DiamondToggle
            checked={profile.npcJobsEnabled}
            onChange={onToggleNpc}
            ariaLabel="Toggle NPC jobs"
          />
        </div>
      </div>
    </>
  )
}

function NpcContractsTab({ jobs, meta, onAccept, onComplete, onDecline, onDropoffGps, busyId }) {
  if (!jobs.length) {
    return (
      <div className="services-empty-card">
        <FileText size={48} strokeWidth={1.5} />
        <h3>No contracts available</h3>
        <p>
          Turn on NPC jobs on your job page and stay on duty. New contracts arrive every minute or so.
        </p>
      </div>
    )
  }

  const openCount = jobs.filter((j) => (j.status || 'open').toLowerCase() === 'open').length

  return (
    <>
      <div className="services-worker-banner">
        <FileText size={18} />
        <div>
          <strong>NPC contracts</strong>
          <p>{openCount} available · Complete jobs for pay, XP & reputation</p>
        </div>
      </div>
      {jobs.map((job) => {
        const status = (job.status || 'open').toLowerCase()
        const isOpen = status === 'open'
        const isActive = status === 'accepted'
        const busy = busyId === job.id
        const hasDrop = job.hasDropoff || (job.dest_x != null && Number(job.dest_x) !== 0)

        return (
          <div key={job.id} className={`services-npc-card ${isActive ? 'active' : ''}`}>
            <div className="services-npc-card-top">
              <div>
                <h3>{job.title}</h3>
                <p className="services-npc-customer">{job.customer_name || 'Customer'}</p>
              </div>
              <span className="services-npc-payout">{fmtMoney(job.payout)}</span>
            </div>
            <p className="services-history-message">{job.description}</p>
            {hasDrop && (
              <span className="services-npc-route">
                <Route size={12} />
                Pickup → {job.dest_label || 'Drop-off'}
              </span>
            )}
            <span className="services-history-time">{job.timeAgo}</span>
            <div className="services-worker-actions">
              {isOpen && (
                <>
                  <button
                    type="button"
                    className="services-accept-btn"
                    disabled={busy}
                    onClick={() => onAccept(job.id)}
                  >
                    <Navigation size={16} />
                    {busy ? 'Working...' : 'Accept & GPS'}
                  </button>
                  <button
                    type="button"
                    className="services-npc-decline-btn"
                    disabled={busy}
                    onClick={() => onDecline(job.id)}
                    aria-label="Decline"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
              {isActive && (
                <>
                  {hasDrop && (
                    <button
                      type="button"
                      className="services-npc-dropoff-btn"
                      onClick={() => onDropoffGps(job)}
                    >
                      <MapPin size={16} />
                      Drop-off GPS
                    </button>
                  )}
                  <button
                    type="button"
                    className="services-complete-btn"
                    disabled={busy}
                    onClick={() => onComplete(job.id)}
                  >
                    <CheckCircle2 size={16} />
                    {busy ? 'Working...' : hasDrop ? 'Complete at drop-off' : 'Complete job'}
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

function WorkerJobsTab({ jobs, typeLabels, onAccept, onComplete, busyId }) {
  if (!jobs.length) {
    return (
      <div className="services-empty-card">
        <Briefcase size={48} strokeWidth={1.5} />
        <h3>No open jobs</h3>
        <p>New service requests for your job will appear here while you are on duty.</p>
      </div>
    )
  }

  const openCount = jobs.filter((j) => (j.status || 'open').toLowerCase() === 'open').length
  const activeCount = jobs.filter((j) => (j.status || '').toLowerCase() === 'accepted').length

  return (
    <>
      <div className="services-worker-banner">
        <Briefcase size={18} />
        <div>
          <strong>On-duty jobs</strong>
          <p>
            {openCount} available · {activeCount} assigned to you
          </p>
        </div>
      </div>
      {jobs.map((job) => {
        const meta = getMeta(job.service_type)
        const Icon = meta.icon
        const label = typeLabels[job.service_type] || job.service_type
        const status = (job.status || 'open').toLowerCase()
        const isOpen = status === 'open'
        const isActive = status === 'accepted'
        const busy = busyId === job.id

        return (
          <div key={job.id} className={`services-worker-card ${isActive ? 'active' : ''}`}>
            <div className="services-worker-top">
              <div className="services-history-icon" style={{ background: meta.bg, color: meta.accent }}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <div className="services-history-info">
                <div className="services-history-row">
                  <h3 className="services-history-title">{label}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <p className="services-worker-requester">{job.requester_name || 'Citizen'}</p>
                {job.message && <p className="services-history-message">{job.message}</p>}
                <span className="services-history-time">{job.timeAgo || formatTimeAgo(job.created_at)}</span>
              </div>
            </div>
            <div className="services-worker-actions">
              {isOpen && (
                <button
                  type="button"
                  className="services-accept-btn"
                  disabled={busy}
                  onClick={() => onAccept(job.id)}
                >
                  <Navigation size={16} />
                  {busy ? 'Working...' : 'Accept & GPS'}
                </button>
              )}
              {isActive && (
                <button
                  type="button"
                  className="services-complete-btn"
                  disabled={busy}
                  onClick={() => onComplete(job.id)}
                >
                  <CheckCircle2 size={16} />
                  {busy ? 'Working...' : 'Mark complete'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function ServicesScreen() {
  const { goBack, notify, screenParams } = usePhone()
  const [tab, setTab] = useState('request')
  const [types, setTypes] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [workerJobs, setWorkerJobs] = useState([])
  const [npcJobs, setNpcJobs] = useState([])
  const [workerProfile, setWorkerProfile] = useState(null)
  const [workerServiceType, setWorkerServiceType] = useState(null)
  const [isWorker, setIsWorker] = useState(false)
  const [isServiceWorker, setIsServiceWorker] = useState(false)
  const [npcJobsFeature, setNpcJobsFeature] = useState(true)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [busyJobId, setBusyJobId] = useState(null)
  const [togglingNpc, setTogglingNpc] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchNui('getServicesData').then((d) => {
      setTypes(d?.types || [])
      setMyRequests(d?.myRequests || [])
      setWorkerJobs(d?.workerJobs || [])
      setNpcJobs(d?.npcJobs || [])
      setWorkerProfile(d?.workerProfile || null)
      setWorkerServiceType(d?.workerServiceType || null)
      setIsWorker(!!d?.isWorker)
      setIsServiceWorker(!!d?.isServiceWorker)
      setNpcJobsFeature(d?.npcJobsEnabled !== false)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useNuiEvent(
    useCallback(
      (msg) => {
        if (msg.action === 'npcServiceJob') load()
      },
      [load]
    )
  )

  useEffect(() => {
    if (screenParams?.tab) setTab(screenParams.tab)
  }, [screenParams?.tab])

  const workMeta = useMemo(
    () => (workerServiceType ? getMeta(workerServiceType) : null),
    [workerServiceType]
  )

  const workTabLabel = useMemo(() => {
    if (workerProfile?.serviceLabel) return workerProfile.serviceLabel
    if (workerServiceType) {
      const t = types.find((x) => x.id === workerServiceType)
      return t?.label || 'My Shift'
    }
    return 'My Shift'
  }, [workerProfile, workerServiceType, types])

  const navTabs = useMemo(() => {
    const tabs = [
      { id: 'request', label: 'Request', icon: ClipboardList },
      { id: 'history', label: 'History', icon: History },
    ]
    if (isServiceWorker) {
      tabs.push({
        id: 'work',
        label: workTabLabel,
        icon: workMeta?.icon || Briefcase,
      })
      if (isWorker) {
        tabs.push({ id: 'jobs', label: 'Live Calls', icon: Briefcase })
      }
      if (npcJobsFeature) {
        tabs.push({ id: 'contracts', label: 'Contracts', icon: FileText })
      }
    } else if (isWorker) {
      tabs.push({ id: 'jobs', label: 'Live Calls', icon: Briefcase })
    }
    return tabs
  }, [isWorker, isServiceWorker, workTabLabel, workMeta, npcJobsFeature])

  useEffect(() => {
    if (tab === 'jobs' && !isWorker) setTab(isServiceWorker ? 'work' : 'request')
    if (tab === 'contracts' && !isServiceWorker) setTab('request')
    if (tab === 'work' && !isServiceWorker) setTab('request')
  }, [tab, isWorker, isServiceWorker])

  const typeLabels = useMemo(
    () => Object.fromEntries(types.map((t) => [t.id, t.label])),
    [types],
  )

  const openCount = useMemo(
    () => myRequests.filter((r) => (r.status || 'open').toLowerCase() === 'open').length,
    [myRequests],
  )

  const workerOpenCount = useMemo(
    () => workerJobs.filter((j) => (j.status || 'open').toLowerCase() === 'open').length,
    [workerJobs],
  )

  const npcOpenCount = useMemo(
    () => npcJobs.filter((j) => (j.status || 'open').toLowerCase() === 'open').length,
    [npcJobs],
  )

  const toggleNpcJobs = async (enabled) => {
    setTogglingNpc(true)
    const res = await fetchNui('toggleNpcServiceJobs', { enabled })
    setTogglingNpc(false)
    if (res?.ok) {
      notify('Services', enabled ? 'NPC jobs enabled' : 'NPC jobs disabled', 'default')
      load()
      if (enabled) setTab('contracts')
    } else {
      notify('Services', 'Could not update NPC jobs', 'error')
    }
  }

  const acceptNpcJob = async (id) => {
    setBusyJobId(id)
    const res = await fetchNui('acceptNpcServiceJob', { id })
    setBusyJobId(null)
    if (res?.ok) {
      notify('Services', 'Contract accepted — GPS set', 'default')
      load()
    } else if (res?.error === 'already_active') {
      notify('Services', 'Finish your current contract first', 'error')
    } else {
      notify('Services', 'Could not accept contract', 'error')
    }
  }

  const completeNpcJob = async (id) => {
    setBusyJobId(id)
    const res = await fetchNui('completeNpcServiceJob', { id })
    setBusyJobId(null)
    if (res?.ok) {
      notify('Services', `Contract complete — ${fmtMoney(res.payout)}`, 'default')
      if (res.profile) setWorkerProfile(res.profile)
      load()
    } else if (res?.error === 'too_far') {
      notify('Services', 'Get closer to the job location to complete', 'error')
    } else {
      notify('Services', 'Could not complete contract', 'error')
    }
  }

  const declineNpcJob = async (id) => {
    setBusyJobId(id)
    await fetchNui('declineNpcServiceJob', { id })
    setBusyJobId(null)
    load()
  }

  const dropoffGps = (job) => {
    if (job.dest_x == null) return
    fetchNui('setMapWaypoint', { x: job.dest_x, y: job.dest_y })
    notify('Services', 'Drop-off GPS set', 'default')
  }

  const request = async () => {
    if (!selected) return
    setSending(true)
    const res = await fetchNui('requestService', { serviceType: selected, message })
    setSending(false)
    if (res?.ok) {
      notify('Services', 'Request sent — help is on the way', 'default')
      setMessage('')
      setSelected(null)
      load()
      setTab('history')
    } else {
      notify('Services', 'Could not send request', 'error')
    }
  }

  const acceptJob = async (id) => {
    setBusyJobId(id)
    const res = await fetchNui('acceptServiceRequest', { id })
    setBusyJobId(null)
    if (res?.ok) {
      notify('Services', 'Job accepted — GPS set', 'default')
      load()
    } else {
      notify('Services', 'Could not accept job', 'error')
    }
  }

  const completeJob = async (id) => {
    setBusyJobId(id)
    const res = await fetchNui('completeServiceRequest', { id })
    setBusyJobId(null)
    if (res?.ok) {
      notify('Services', 'Job marked complete', 'default')
      load()
    } else {
      notify('Services', 'Could not complete job', 'error')
    }
  }

  const screenTitle = useMemo(() => {
    if (tab === 'work') return workTabLabel
    return TAB_TITLES[tab] || 'Services'
  }, [tab, workTabLabel])

  const subtitle = useMemo(() => {
    if (loading) return undefined
    if (tab === 'history' && openCount > 0) return `${openCount} open`
    if (tab === 'jobs' && workerOpenCount > 0) return `${workerOpenCount} live`
    if (tab === 'contracts' && npcOpenCount > 0) return `${npcOpenCount} new`
    if (tab === 'work' && workerProfile) {
      return workerProfile.onDuty
        ? workerProfile.npcJobsEnabled
          ? 'NPC jobs on'
          : 'On duty'
        : 'Off duty'
    }
    if (tab === 'request' && selected) {
      return typeLabels[selected] || undefined
    }
    return undefined
  }, [tab, loading, openCount, workerOpenCount, npcOpenCount, selected, typeLabels, workerProfile])

  return (
    <AppScreen
      className="services-app"
      title={screenTitle}
      subtitle={subtitle}
      onBack={goBack}
      tabs={navTabs}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      {loading ? (
        <div className="services-loading">
          <Wrench size={48} />
          <p>Loading services...</p>
        </div>
      ) : tab === 'request' ? (
        <RequestTab
          types={types}
          selected={selected}
          onSelect={setSelected}
          message={message}
          setMessage={setMessage}
          onRequest={request}
          sending={sending}
        />
      ) : tab === 'history' ? (
        <HistoryTab requests={myRequests} typeLabels={typeLabels} />
      ) : tab === 'work' ? (
        <WorkerJobPage
          profile={workerProfile}
          meta={workMeta}
          togglingNpc={togglingNpc}
          onToggleNpc={toggleNpcJobs}
        />
      ) : tab === 'contracts' ? (
        <NpcContractsTab
          jobs={npcJobs}
          meta={workMeta}
          onAccept={acceptNpcJob}
          onComplete={completeNpcJob}
          onDecline={declineNpcJob}
          onDropoffGps={dropoffGps}
          busyId={busyJobId}
        />
      ) : (
        <WorkerJobsTab
          jobs={workerJobs}
          typeLabels={typeLabels}
          onAccept={acceptJob}
          onComplete={completeJob}
          busyId={busyJobId}
        />
      )}
    </AppScreen>
  )
}
