import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Plus, Skull, Trash2 } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function DarkWebScreen() {
  const { goBack, notify } = usePhone()
  const [tab, setTab] = useState('browse')
  const [category, setCategory] = useState('all')
  const [data, setData] = useState({ listings: [], mine: [], categories: [] })
  const [compose, setCompose] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'contraband' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetchNui('getDarkWebListings', { category }).then((res) => {
      setData(res || { listings: [], mine: [] })
      setLoading(false)
    })
  }, [category])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(() => data.categories?.length ? data.categories : [{ id: 'all', label: 'All' }], [data.categories])

  const submitListing = async () => {
    const res = await fetchNui('createDarkWebListing', {
      ...form,
      price: parseInt(form.price, 10) || 0,
    })
    if (res?.ok) {
      notify('Onion', 'Listing posted anonymously', 'default')
      setCompose(false)
      setForm({ title: '', description: '', price: '', category: 'contraband' })
      load()
    } else {
      notify('Onion', res?.error === 'insufficient' ? 'Not enough cash for listing fee' : 'Could not post', 'error')
    }
  }

  const removeListing = async (id) => {
    await fetchNui('deleteDarkWebListing', { id })
    notify('Onion', 'Listing removed', 'default')
    load()
  }

  return (
    <AppScreen
      className="darkweb-app"
      title="Onion"
      subtitle="Anonymous market"
      onBack={goBack}
      headerRight={
        <button type="button" className="doc-header-add" onClick={() => setCompose(true)} aria-label="New listing">
          <Plus size={20} />
        </button>
      }
      tabs={[
        { id: 'browse', label: 'Browse', icon: Eye },
        { id: 'mine', label: 'Mine', icon: Skull },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      {compose ? (
        <div className="darkweb-compose">
          <input className="doc-search" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="darkweb-textarea" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          <input className="doc-search" placeholder="Price ($)" inputMode="numeric" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          <select className="doc-search" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {categories.filter((c) => c.id !== 'all').map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <div className="darkweb-compose-actions">
            <button type="button" className="notes-empty-btn" onClick={() => setCompose(false)}>Cancel</button>
            <button type="button" className="notes-empty-btn primary" onClick={submitListing}>Post ($100 fee)</button>
          </div>
        </div>
      ) : tab === 'browse' ? (
        <>
          <div className="darkweb-cats">
            {categories.map((c) => (
              <button key={c.id} type="button" className={category === c.id ? 'active' : ''} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="phone-empty"><Skull size={48} /><p>Connecting...</p></div>
          ) : data.listings.length === 0 ? (
            <div className="phone-empty"><Skull size={48} /><p>No listings</p></div>
          ) : (
            data.listings.map((item) => (
              <div key={item.id} className="darkweb-listing">
                <div className="darkweb-listing-top">
                  <h3>{item.title}</h3>
                  <span>{fmt(item.price)}</span>
                </div>
                <p>{item.description}</p>
                <span className="phone-card-meta">{item.seller_alias} · {item.timeAgo}</span>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          {(data.mine || []).length === 0 ? (
            <div className="phone-empty"><Skull size={48} /><p>No active listings</p></div>
          ) : (
            data.mine.map((item) => (
              <div key={item.id} className="darkweb-listing">
                <div className="darkweb-listing-top">
                  <h3>{item.title}</h3>
                  <button type="button" className="darkweb-delete" onClick={() => removeListing(item.id)} aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p>{item.description}</p>
                <span className="phone-card-meta">{fmt(item.price)} · {item.active ? 'Active' : 'Removed'}</span>
              </div>
            ))
          )}
        </>
      )}
    </AppScreen>
  )
}
