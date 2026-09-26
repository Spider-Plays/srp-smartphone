import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePhone } from '../../context/PhoneContext'
import {
  Briefcase,
  ChevronLeft,
  Check,
  ImagePlus,
  LayoutGrid,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  User,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { fetchNui, useNuiEvent } from '../../hooks/useNui'
import ChirpMediaPicker from '../chirp/components/ChirpMediaPicker'
import LifeInvaderIcon from './lifeinvader/LifeInvaderIcon'
import LifeInvaderLogo from './lifeinvader/LifeInvaderLogo'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

const CATEGORY_LABELS = {
  vehicles: 'Vehicles',
  items: 'Items',
  services: 'Services',
  misc: 'Misc',
}

function categoryLabel(id) {
  return CATEGORY_LABELS[id] || id
}

function JobCenterTab({ jobs, currentJob, applying, onApply }) {
  const sorted = useMemo(
    () => [...(jobs || [])].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [jobs],
  )

  if (!sorted.length) {
    return (
      <div className="li-empty">
        <Briefcase size={48} className="li-empty-icon" />
        <h3>Job center unavailable</h3>
        <p>Employment listings are not configured on this server.</p>
      </div>
    )
  }

  return (
    <>
      <div className="li-job-current">
        <div className="li-job-current-icon">
          <Briefcase size={22} />
        </div>
        <div className="li-job-current-body">
          <span className="li-job-current-label">Current position</span>
          <strong>{currentJob?.label || 'Unemployed'}</strong>
          {currentJob?.name && currentJob.name !== 'unemployed' && currentJob.grade ? (
            <span className="li-job-current-grade">{currentJob.grade}</span>
          ) : null}
        </div>
      </div>

      <p className="phone-section-label" style={{ padding: '0 16px', marginBottom: 8 }}>
        Available positions
      </p>
      <div className="li-job-list">
        {sorted.map((job) => {
          const isCurrent = currentJob?.name === job.id
          const busy = applying === job.id
          const status = job.applicationStatus || 'none'
          const isPending = status === 'pending'
          const alreadyApplied = status === 'approved'
          const disabled = isCurrent || busy || isPending || alreadyApplied

          let actionLabel = 'Apply'
          if (isCurrent) actionLabel = 'active'
          else if (busy) actionLabel = 'submitting'
          else if (isPending) actionLabel = 'pending'
          else if (alreadyApplied) actionLabel = 'applied'

          return (
            <button
              key={job.id}
              type="button"
              className={`li-job-card ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''} ${alreadyApplied ? 'applied' : ''}`}
              disabled={disabled}
              onClick={() => onApply(job)}
            >
              <div className="li-job-card-main">
                <h3>{job.label}</h3>
                <p>
                  {isPending
                    ? 'Application in process. You will be notified when reviewed.'
                    : alreadyApplied
                      ? 'You have already applied for this position.'
                      : job.description || 'Apply for this position'}
                </p>
              </div>
              <span className="li-job-card-action">
                {actionLabel === 'active' ? (
                  <>
                    <Check size={14} />
                    Active
                  </>
                ) : actionLabel === 'submitting' ? (
                  'Submitting...'
                ) : actionLabel === 'pending' ? (
                  'In process'
                ) : actionLabel === 'applied' ? (
                  'Applied'
                ) : (
                  'Apply'
                )}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

export default function MarketScreen() {
  const { goBack, navigate, notify, bootstrap, screenParams } = usePhone()
  const [tab, setTab] = useState(() => screenParams?.tab || 'browse')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [jobCenter, setJobCenter] = useState(null)
  const [jobsLoading, setJobsLoading] = useState(false)
  const [applyingJob, setApplyingJob] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'misc',
    imageUrl: '',
  })

  const categories = bootstrap?.marketCategories || [{ id: 'all', label: 'All' }]
  const jobCenterEnabled = bootstrap?.jobCenter?.enabled !== false

  const loadJobCenter = useCallback(() => {
    setJobsLoading(true)
    return fetchNui('getJobCenterData')
      .then((d) => setJobCenter(d || { enabled: false, jobs: [] }))
      .finally(() => setJobsLoading(false))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    return fetchNui('getMarketListings', { category: tab === 'my' ? 'all' : category })
      .then((d) => setListings(d || []))
      .finally(() => setLoading(false))
  }, [category, tab])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (tab === 'jobs' && jobCenterEnabled) loadJobCenter()
  }, [tab, jobCenterEnabled, loadJobCenter])

  useEffect(() => {
    if (screenParams?.tab) setTab(screenParams.tab)
  }, [screenParams?.tab])

  useNuiEvent(
    useCallback(
      (msg) => {
        if (msg.action === 'jobApplicationAccepted' || msg.action === 'jobCenterRefresh') {
          if (jobCenterEnabled) loadJobCenter()
        }
      },
      [jobCenterEnabled, loadJobCenter]
    )
  )

  const applyJob = async (job) => {
    if (!job?.id || applyingJob) return
    const status = job.applicationStatus || 'none'
    if (status === 'pending' || status === 'approved') return

    setApplyingJob(job.id)
    try {
      const res = await fetchNui('applyJobCenterJob', { jobId: job.id })
      if (res?.ok) {
        if (res.status === 'pending' || res.applicationStatus === 'pending') {
          notify(
            'LifeInvader',
            `Application submitted for ${job.label}. You will be notified when accepted.`,
            'default'
          )
          setJobCenter((prev) => {
            if (!prev) return prev
            const jobs = (prev.jobs || []).map((j) =>
              j.id === job.id ? { ...j, applicationStatus: 'pending' } : j
            )
            return { ...prev, jobs }
          })
        } else {
          notify('LifeInvader', res.job?.label ? `You are now ${res.job.label}` : 'Position updated', 'default')
          loadJobCenter()
        }
      } else if (res?.error === 'already_job') {
        notify('LifeInvader', 'You already have this job', 'error')
      } else if (res?.error === 'already_pending') {
        notify('LifeInvader', 'Your application is already in process', 'error')
        loadJobCenter()
      } else if (res?.error === 'already_applied') {
        notify('LifeInvader', 'You have already applied for this job', 'error')
        loadJobCenter()
      } else {
        notify('LifeInvader', 'Could not submit application', 'error')
      }
    } finally {
      setApplyingJob(null)
    }
  }

  const filteredListings = useMemo(() => {
    let list = listings
    if (tab === 'my') list = list.filter((l) => l.isMine)
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (l) =>
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.sellerName?.toLowerCase().includes(q)
    )
  }, [listings, search, tab])

  const createListing = async () => {
    if (!form.title.trim() || !form.price) {
      notify('LifeInvader', 'Add a title and price', 'error')
      return
    }
    setPosting(true)
    try {
      const res = await fetchNui('createMarketListing', {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseInt(form.price, 10),
        category: form.category,
        imageUrl: form.imageUrl || '',
      })
      if (res?.ok) {
        notify('LifeInvader', 'Your listing is live', 'default')
        setForm({ title: '', description: '', price: '', category: 'misc', imageUrl: '' })
        setTab('browse')
        load()
      } else {
        notify('LifeInvader', 'Could not post listing', 'error')
      }
    } finally {
      setPosting(false)
    }
  }

  const deleteListing = async (id, e) => {
    e?.stopPropagation()
    await fetchNui('deleteMarketListing', { id })
    notify('LifeInvader', 'Listing removed', 'default')
    setDetail(null)
    load()
  }

  const contactSeller = (listing) => {
    if (listing.sellerPhone) {
      navigate('chat', { phone: listing.sellerPhone, name: listing.sellerName })
      setDetail(null)
    } else {
      notify('LifeInvader', 'Seller is not reachable', 'error')
    }
  }

  const customHeader = (
    <header className="phone-app-header">
      <button type="button" className="phone-app-back" onClick={goBack} aria-label="Back">
        <ChevronLeft size={26} strokeWidth={2} />
      </button>
      <div className="phone-app-header-main li-header">
        <LifeInvaderLogo size={32} />
        <p className="li-tagline">Buy &amp; sell across Los Santos</p>
      </div>
    </header>
  )

  const canPost = form.title.trim() && form.price && !posting

  return (
    <AppScreen
      className="lifeinvader-app"
      customHeader={customHeader}
      tabs={[
        { id: 'browse', label: 'Explore', icon: LayoutGrid },
        ...(jobCenterEnabled ? [{ id: 'jobs', label: 'Jobs', icon: Briefcase }] : []),
        { id: 'sell', label: 'Post', icon: Plus },
        { id: 'my', label: 'My Ads', icon: Tag },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      layer={
        detail ? (
          <div className="li-detail-overlay" role="presentation" onClick={() => setDetail(null)}>
            <div className="li-detail-sheet" role="dialog" onClick={(e) => e.stopPropagation()}>
              <div className="li-detail-handle" />
              <div className="li-detail-hero">
                {detail.imageUrl ? (
                  <img src={detail.imageUrl} alt={detail.title} />
                ) : (
                  <ShoppingBag size={48} className="li-detail-hero-empty" />
                )}
              </div>
              <span className="li-card-badge">{categoryLabel(detail.category)}</span>
              <h2 className="li-detail-title">{detail.title}</h2>
              <div className="li-detail-price">{fmt(detail.price)}</div>
              <p className="li-detail-desc">{detail.description || 'No description provided.'}</p>
              <p className="li-detail-seller">
                <User size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                {detail.sellerName} · {detail.timeAgo}
              </p>
              <div className="li-detail-actions">
                {!detail.isMine ? (
                  <button type="button" className="phone-btn phone-btn-primary" onClick={() => contactSeller(detail)}>
                    <MessageCircle size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
                    Message seller
                  </button>
                ) : (
                  <button type="button" className="phone-btn phone-btn-danger" onClick={() => deleteListing(detail.id)}>
                    <Trash2 size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
                    Remove listing
                  </button>
                )}
                <button type="button" className="phone-btn phone-btn-ghost" onClick={() => setDetail(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <ChirpMediaPicker
        open={mediaOpen}
        title="Add listing photo"
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
      />

      {(tab === 'browse' || tab === 'my') && (
        <>
          <div className="li-search-wrap">
            <input
              type="search"
              placeholder={tab === 'my' ? 'Search your listings...' : 'Search listings...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} className="li-search-icon" />
          </div>

          {tab === 'browse' && (
            <div className="li-categories" role="tablist" aria-label="Categories">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  className={`li-cat-btn ${category === c.id ? 'active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="li-empty">
              <p>Loading listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="li-empty">
              <LifeInvaderIcon size={56} className="li-empty-icon" />
              <h3>{tab === 'my' ? 'No active ads' : 'Nothing for sale yet'}</h3>
              <p>
                {tab === 'my'
                  ? 'Post something from the Post tab to start selling.'
                  : 'Be the first to list an item on LifeInvader.'}
              </p>
              {tab !== 'my' && (
                <button type="button" className="li-post-btn" style={{ maxWidth: 200 }} onClick={() => setTab('sell')}>
                  <Plus size={16} />
                  Post a listing
                </button>
              )}
            </div>
          ) : (
            <div className="li-listings">
              {filteredListings.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`li-card ${tab === 'my' ? 'li-my-card' : ''}`}
                  onClick={() => setDetail(l)}
                >
                  <div className="li-card-thumb">
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt="" />
                    ) : (
                      <ShoppingBag size={32} className="li-card-thumb-placeholder" />
                    )}
                  </div>
                  <div className="li-card-body">
                    <div className="li-card-top">
                      <h3 className="li-card-title">{l.title}</h3>
                      <span className="li-card-price">{fmt(l.price)}</span>
                    </div>
                    <p className="li-card-desc">{l.description}</p>
                    <div className="li-card-meta">
                      <span className="li-card-badge">{categoryLabel(l.category)}</span>
                      <span>{l.sellerName}</span>
                      <span>·</span>
                      <span>{l.timeAgo}</span>
                    </div>
                  </div>
                  {tab === 'my' && (
                    <button
                      type="button"
                      className="li-delete-btn"
                      aria-label="Delete listing"
                      onClick={(e) => deleteListing(l.id, e)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'jobs' && jobCenterEnabled && (
        jobsLoading ? (
          <div className="li-empty">
            <Briefcase size={40} className="li-empty-icon" />
            <p>Loading job center...</p>
          </div>
        ) : (
          <JobCenterTab
            jobs={jobCenter?.jobs?.length ? jobCenter.jobs : bootstrap?.jobCenter?.jobs}
            currentJob={jobCenter?.job}
            applying={applyingJob}
            onApply={applyJob}
          />
        )
      )}

      {tab === 'sell' && (
        <div className="li-sell">
          <div className={`li-photo-zone ${form.imageUrl ? 'has-image' : ''}`}>
            {form.imageUrl ? (
              <>
                <img src={form.imageUrl} alt="Listing preview" />
                <button
                  type="button"
                  className="li-photo-remove"
                  aria-label="Remove photo"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                >
                  ×
                </button>
              </>
            ) : (
              <button type="button" className="li-photo-add" onClick={() => setMediaOpen(true)}>
                <ImagePlus size={28} />
                Add photo
              </button>
            )}
          </div>
          {form.imageUrl ? (
            <button type="button" className="phone-btn phone-btn-ghost" onClick={() => setMediaOpen(true)}>
              Change photo
            </button>
          ) : null}

          <div className="li-field">
            <label htmlFor="li-title">Title</label>
            <input
              id="li-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What are you selling?"
              maxLength={64}
            />
          </div>
          <div className="li-field">
            <label htmlFor="li-desc">Description</label>
            <textarea
              id="li-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Condition, location, extras..."
              maxLength={500}
            />
          </div>
          <div className="li-field-row">
            <div className="li-field">
              <label htmlFor="li-price">Price ($)</label>
              <input
                id="li-price"
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div className="li-field">
              <label htmlFor="li-cat">Category</label>
              <select
                id="li-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories
                  .filter((c) => c.id !== 'all')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button type="button" className="li-post-btn" disabled={!canPost} onClick={createListing}>
            <Plus size={18} />
            {posting ? 'Posting...' : 'Publish on LifeInvader'}
          </button>
        </div>
      )}
    </AppScreen>
  )
}
