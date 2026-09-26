import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Check,
  Heart,
  Inbox,
  Key,
  List,
  Map as MapIcon,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Tag,
  UserRound,
} from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { gtaCoordsToPercent, MAP_TILE_CONFIG, mapTileUrl } from '../utils/gtaMapCoords'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

const NAV_TABS = [
  { id: 'browse', label: 'Browse', icon: Search },
  { id: 'agents', label: 'Agents', icon: UserRound },
  { id: 'places', label: 'Places', icon: Key },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
]

const TAB_TITLES = {
  browse: 'Market',
  agents: 'Realtors',
  places: 'My Properties',
  inbox: 'Inbox',
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function normalizeList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data.filter(Boolean)
  if (typeof data === 'object') return Object.values(data).filter((item) => item && typeof item === 'object')
  return []
}

function normalizeSections(data) {
  if (!data || typeof data !== 'object') return { apartments: [], houses: [] }
  if (data.apartments || data.houses) {
    return { apartments: normalizeList(data.apartments), houses: normalizeList(data.houses) }
  }
  return { apartments: normalizeList(data), houses: [] }
}

function favStorageKey(citizenid) {
  return `sr_props_favs_${citizenid || 'local'}`
}

function loadFavorites(citizenid) {
  try {
    const raw = localStorage.getItem(favStorageKey(citizenid))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveFavorites(citizenid, set) {
  try {
    localStorage.setItem(favStorageKey(citizenid), JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

function MapCanvas({ listings, favorites, onSelect }) {
  const { zoom, grid } = MAP_TILE_CONFIG

  return (
    <div className="props-map-wrap">
      <div className="props-map-canvas">
        <div className="props-map-tiles" style={{ '--map-grid': grid }}>
          {Array.from({ length: grid }, (_, x) =>
            Array.from({ length: grid }, (_, y) => (
              <img
                key={`${x}-${y}`}
                className="props-map-tile"
                src={mapTileUrl(zoom, x, y)}
                alt=""
                draggable={false}
                loading="lazy"
              />
            ))
          )}
        </div>
        {listings.map((listing) => {
          if (!listing.coords?.x || !listing.coords?.y) return null
          const pos = gtaCoordsToPercent(listing.coords.x, listing.coords.y)
          const isFav = favorites.has(listing.id)
          return (
            <button
              key={listing.id}
              type="button"
              className={`props-map-marker ${isFav ? 'props-map-marker--fav' : ''}`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              onClick={() => onSelect(listing)}
              title={listing.label}
            >
              {Math.round((listing.price || 0) / 1000)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BrowseView({ notify, citizenid, onSelectListing }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('map')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(() => loadFavorites(citizenid))

  useEffect(() => {
    fetchNui('getRealEstateListings').then((res) => {
      setListings(res?.listings || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setFavorites(loadFavorites(citizenid))
  }, [citizenid])

  const toggleFavorite = (id, e) => {
    e?.stopPropagation()
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavorites(citizenid, next)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((l) => {
      if (filter === 'buy' && l.listingType !== 'buy') return false
      if (filter === 'rent' && l.listingType !== 'rent') return false
      if (filter === 'favorites' && !favorites.has(l.id)) return false
      if (!q) return true
      return [l.label, l.address, l.category].some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [listings, filter, query, favorites])

  if (loading) return <div className="props-loading">Loading market…</div>

  return (
    <>
      <div className="props-view-toggle">
        <button type="button" className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
          <MapIcon size={16} /> Map
        </button>
        <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
          <List size={16} /> List
        </button>
      </div>

      <div className="maps-search">
        <Search size={16} className="maps-search-icon" />
        <input
          className="maps-search-input"
          placeholder="Search address, district, or listing"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="props-filters-row">
        {[
          { id: 'all', label: 'All' },
          { id: 'buy', label: 'Buy', icon: Tag },
          { id: 'rent', label: 'Rent', icon: Key },
          { id: 'favorites', label: 'Favorites', icon: Heart },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`props-chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
            {Icon ? <Icon size={14} /> : null}
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'map' ? (
        filtered.length === 0 ? (
          <div className="props-empty-center">
            <MapPin size={40} strokeWidth={1.5} />
            <h3>No listings</h3>
            <p>Try a different filter or search term.</p>
          </div>
        ) : (
          <MapCanvas listings={filtered} favorites={favorites} onSelect={onSelectListing} />
        )
      ) : (
        <div className="props-listings">
          {filtered.length === 0 ? (
            <div className="props-empty">
              <MapPin size={40} className="props-empty-icon" />
              <h3>No listings</h3>
              <p>Try a different filter or search term.</p>
            </div>
          ) : (
            filtered.map((listing) => (
              <div key={listing.id} className="props-listing-card" onClick={() => onSelectListing(listing)}>
                <div className="props-listing-top">
                  <h3>{listing.label}</h3>
                  <span className="props-listing-price">{fmt(listing.price)}</span>
                </div>
                <div className="props-listing-meta">
                  <MapPin size={12} /> {listing.address}
                </div>
                <div className="props-listing-tags">
                  <span className={`props-tag props-tag--${listing.listingType || 'buy'}`}>
                    {listing.listingType === 'rent' ? 'Rent' : 'Buy'}
                  </span>
                  <span className="props-tag props-tag--cat">{listing.category}</span>
                  <span className="props-tag props-tag--cat">
                    {listing.beds} bed · {listing.baths} bath
                  </span>
                </div>
                <button
                  type="button"
                  className={`props-fav-btn ${favorites.has(listing.id) ? 'active' : ''}`}
                  onClick={(e) => toggleFavorite(listing.id, e)}
                >
                  <Heart size={16} fill={favorites.has(listing.id) ? 'currentColor' : 'none'} />
                  {favorites.has(listing.id) ? 'Saved' : 'Save listing'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}

function AgentsView({ onSelectAgent }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [sort, setSort] = useState('listings')

  useEffect(() => {
    fetchNui('getRealEstateAgents').then((res) => {
      setAgents(res?.agents || [])
      setLoading(false)
    })
  }, [])

  const companies = useMemo(() => {
    const set = new Set(agents.map((a) => a.company).filter(Boolean))
    return ['all', ...[...set].sort()]
  }, [agents])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = agents.filter((a) => {
      if (companyFilter !== 'all' && a.company !== companyFilter) return false
      if (!q) return true
      return [a.name, a.company, a.role, a.specialty].some((v) => (v || '').toLowerCase().includes(q))
    })
    if (sort === 'listings') list = [...list].sort((a, b) => (b.activeListings || 0) - (a.activeListings || 0))
    else if (sort === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return list
  }, [agents, query, companyFilter, sort])

  if (loading) return <div className="props-loading">Loading realtors…</div>

  return (
    <>
      <div className="maps-search">
        <Search size={16} className="maps-search-icon" />
        <input
          className="maps-search-input"
          placeholder="Name, company, specialty, zone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="props-filters-row">
        <button type="button" className={`props-chip ${companyFilter === 'all' ? 'active' : ''}`} onClick={() => setCompanyFilter('all')}>
          All
        </button>
        {companies.slice(1, 4).map((co) => (
          <button
            key={co}
            type="button"
            className={`props-chip ${companyFilter === co ? 'active' : ''}`}
            onClick={() => setCompanyFilter(co)}
          >
            <span className="props-chip-dot" />
            {co.slice(0, 8)}
            {co.length > 8 ? '…' : ''}
          </button>
        ))}
        <div className="props-sort">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="listings">Most listings</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="props-agents-list">
        {filtered.length === 0 ? (
          <div className="props-empty-center">
            <UserRound size={40} strokeWidth={1.5} />
            <h3>No realtors</h3>
            <p>No agents match your search.</p>
          </div>
        ) : (
          filtered.map((agent) => (
            <div key={agent.id} className="props-agent-card" onClick={() => onSelectAgent(agent)}>
              <div className="props-agent-avatar">
                {agent.avatar ? <img src={agent.avatar} alt="" /> : initials(agent.name)}
              </div>
              <div className="props-agent-body">
                <div className="props-agent-name">{agent.name}</div>
                <div className="props-agent-tags">
                  <span className="props-role-tag props-role-tag--agent">AGENT</span>
                  {agent.isBroker ? <span className="props-role-tag props-role-tag--broker">BROKER</span> : null}
                  {agent.company ? (
                    <span className="props-company-badge">
                      <span>{agent.company.slice(0, 2).toUpperCase()}</span>
                      {agent.company}
                    </span>
                  ) : null}
                </div>
                <div className="props-agent-stats">
                  <strong>{agent.activeListings ?? 0}</strong> active ·{' '}
                  {agent.available ? 'Available' : 'Unavailable'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function AgentDetailView({ agent }) {
  return (
    <>
      <div className="props-agent-profile">
        <div className="props-agent-avatar">
          {agent.avatar ? <img src={agent.avatar} alt="" /> : initials(agent.name)}
        </div>
        <div>
          <h2 className="phone-app-title" style={{ fontSize: 22 }}>
            {agent.name}
          </h2>
          <p className="props-agent-subtitle">
            {agent.role || 'Agent'}
            {agent.company ? ` · ${agent.company}` : ''}
          </p>
          {agent.phone ? (
            <div className="props-agent-phone">
              <Phone size={14} />
              {agent.phone}
            </div>
          ) : null}
        </div>
      </div>

      <div className="props-stats-row">
        <div className="props-stat">
          <div className="props-stat-label">ACTIVE</div>
          <div className="props-stat-value props-stat-value--accent">{agent.activeListings ?? 0}</div>
        </div>
        <div className="props-stat">
          <div className="props-stat-label">SALES</div>
          <div className="props-stat-value">{agent.sales ?? 0}</div>
        </div>
        <div className="props-stat">
          <div className="props-stat-label">ROLE</div>
          <div className="props-stat-value" style={{ fontSize: 15 }}>
            {agent.isBroker ? 'Broker' : 'Agent'}
          </div>
        </div>
      </div>
    </>
  )
}

function ListingDetailView({ listing, citizenid }) {
  const [favorites, setFavorites] = useState(() => loadFavorites(citizenid))
  const isFav = favorites.has(listing.id)

  const toggleFavorite = () => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(listing.id)) next.delete(listing.id)
      else next.add(listing.id)
      saveFavorites(citizenid, next)
      return next
    })
  }

  return (
    <div className="props-detail-hero">
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{listing.label}</h2>
      <div className="props-detail-price">{fmt(listing.price)}</div>
      <div className="props-listing-meta">
        <MapPin size={12} /> {listing.address}
      </div>
      <div className="props-listing-tags" style={{ marginTop: 10 }}>
        <span className={`props-tag props-tag--${listing.listingType || 'buy'}`}>
          {listing.listingType === 'rent' ? 'For rent' : 'For sale'}
        </span>
        <span className="props-tag props-tag--cat">{listing.category}</span>
      </div>
      <div className="props-detail-grid">
        <div className="props-detail-stat">
          <span>BEDS</span>
          <strong>{listing.beds ?? '—'}</strong>
        </div>
        <div className="props-detail-stat">
          <span>BATHS</span>
          <strong>{listing.baths ?? '—'}</strong>
        </div>
        <div className="props-detail-stat">
          <span>TYPE</span>
          <strong style={{ fontSize: 13, textTransform: 'capitalize' }}>{listing.category || '—'}</strong>
        </div>
      </div>
      <button type="button" className={`props-fav-btn ${isFav ? 'active' : ''}`} onClick={toggleFavorite}>
        <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        {isFav ? 'Saved to favorites' : 'Save to favorites'}
      </button>
    </div>
  )
}

function PlacesView({ sections, loading, onSelect }) {
  const items = [...sections.apartments, ...sections.houses]

  if (loading) return <div className="props-loading">Loading your properties…</div>

  if (items.length === 0) {
    return (
      <div className="props-empty-center">
        <Key size={48} strokeWidth={1.5} />
        <h3>Nothing held yet</h3>
        <p>Buy or rent a property and it&apos;ll appear here.</p>
      </div>
    )
  }

  return (
    <div className="props-listings">
      {items.map((property, i) => (
        <div
          key={`${property.provider || 'property'}-${property.id || i}`}
          className="props-place-card"
          onClick={() => onSelect(property)}
        >
          <div className="props-place-icon">
            <Key size={22} />
          </div>
          <div className="props-place-info">
            <div className="props-place-name">{property.label || property.buildingLabel}</div>
            <div className="props-place-address">
              {property.address || property.buildingLabel || property.type}
              {property.ownership === 'rented' ? ' · Rented' : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function InboxView() {
  return (
    <div className="props-empty-center">
      <Bell size={36} strokeWidth={1.5} />
      <h3>All caught up</h3>
      <p>No approvals, offers, auction updates, or alerts.</p>
    </div>
  )
}

export default function PropertiesScreen() {
  const { bootstrap, navigate, goBack, notify } = usePhone()
  const [tab, setTab] = useState('browse')
  const [subView, setSubView] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [sections, setSections] = useState({ apartments: [], houses: [] })
  const [loadingPlaces, setLoadingPlaces] = useState(true)

  const cid = bootstrap?.citizenid

  useEffect(() => {
    let cancelled = false
    const bootstrapSections = normalizeSections(bootstrap?.properties)

    if (bootstrapSections.apartments.length > 0 || bootstrapSections.houses.length > 0) {
      setSections(bootstrapSections)
      setLoadingPlaces(false)
    }

    const load = async () => {
      try {
        const data = await fetchNui('getProperties')
        if (cancelled) return
        const next = normalizeSections(data)
        if (next.apartments.length > 0 || next.houses.length > 0) {
          setSections(next)
        } else if (bootstrapSections.apartments.length === 0 && bootstrapSections.houses.length === 0) {
          setSections({ apartments: [], houses: [] })
        }
      } catch {
        if (!cancelled && bootstrapSections.apartments.length === 0 && bootstrapSections.houses.length === 0) {
          setSections({ apartments: [], houses: [] })
        }
      } finally {
        if (!cancelled) setLoadingPlaces(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [bootstrap?.properties])

  const changeTab = useCallback((id) => {
    setTab(id)
    setSubView(null)
    setSelectedAgent(null)
    setSelectedListing(null)
  }, [])

  const openAgent = (agent) => {
    setSelectedAgent(agent)
    setSubView('agent')
  }

  const openListing = (listing) => {
    setSelectedListing(listing)
    setSubView('listing')
  }

  const openPlace = (property) => {
    navigate('property-detail', { property })
  }

  const closeSubView = useCallback(() => {
    setSubView(null)
    setSelectedAgent(null)
    setSelectedListing(null)
  }, [])

  const messageAgent = useCallback(() => {
    if (!selectedAgent?.phone) {
      notify('Properties', 'No contact number for this agent', 'error')
      return
    }
    navigate('chat', { phone: selectedAgent.phone, name: selectedAgent.name })
  }, [selectedAgent, navigate, notify])

  const contactListing = useCallback(async () => {
    if (!selectedListing) return
    const res = await fetchNui('contactRealEstateAgent', { listingId: selectedListing.id })
    if (res?.ok) {
      notify('Properties', `Agent notified about ${selectedListing.label}`, 'default')
      if (res.coords?.x) {
        await fetchNui('setMapWaypoint', { x: res.coords.x, y: res.coords.y })
      }
    }
  }, [selectedListing, notify])

  const headerRight = useMemo(() => {
    if (subView) return null
    if (tab === 'browse') {
      return (
        <div className="props-header-actions">
          <button type="button" className="phone-app-back" aria-label="Filters">
            <SlidersHorizontal size={18} />
          </button>
          <button type="button" className="phone-app-back" aria-label="Alerts">
            <Bell size={18} />
          </button>
        </div>
      )
    }
    if (tab === 'inbox') {
      return (
        <button type="button" className="phone-app-back" aria-label="Mark all read">
          <Check size={18} />
        </button>
      )
    }
    return (
      <button type="button" className="phone-app-back" aria-label="Open maps" onClick={() => navigate('maps')}>
        <MapIcon size={18} />
      </button>
    )
  }, [subView, tab, navigate])

  const screenTitle =
    subView === 'agent'
      ? selectedAgent?.name || 'Realtor'
      : subView === 'listing'
        ? selectedListing?.label || 'Listing'
        : TAB_TITLES[tab]

  const screenSubtitle =
    subView === 'agent' && selectedAgent
      ? `${selectedAgent.role || 'Agent'}${selectedAgent.company ? ` · ${selectedAgent.company}` : ''}`
      : subView === 'listing' && selectedListing
        ? selectedListing.address
        : undefined

  const footer =
    subView === 'agent' ? (
      <button type="button" className="props-primary-btn" onClick={messageAgent}>
        Message realtor
      </button>
    ) : subView === 'listing' ? (
      <button type="button" className="props-primary-btn" onClick={contactListing}>
        Contact agent
      </button>
    ) : null

  return (
    <AppScreen
      title={screenTitle}
      subtitle={screenSubtitle}
      onBack={subView ? closeSubView : goBack}
      className="properties-app"
      headerRight={headerRight}
      tabs={subView ? undefined : NAV_TABS}
      activeTab={tab}
      onTabChange={changeTab}
      tabStyle="bottom"
      footer={footer}
    >
      {subView === 'agent' && selectedAgent ? (
        <AgentDetailView agent={selectedAgent} />
      ) : subView === 'listing' && selectedListing ? (
        <ListingDetailView listing={selectedListing} citizenid={cid} />
      ) : tab === 'browse' ? (
        <BrowseView notify={notify} citizenid={cid} onSelectListing={openListing} />
      ) : tab === 'agents' ? (
        <AgentsView onSelectAgent={openAgent} />
      ) : tab === 'places' ? (
        <PlacesView sections={sections} loading={loadingPlaces} onSelect={openPlace} />
      ) : (
        <InboxView />
      )}
    </AppScreen>
  )
}
