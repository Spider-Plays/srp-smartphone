import { useCallback, useEffect, useState } from 'react'
import { Calendar, MapPin, Plus, Trash2 } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

function formatEventDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CalendarScreen() {
  const { goBack, notify } = usePhone()
  const [events, setEvents] = useState([])
  const [serverEvents, setServerEvents] = useState([])
  const [compose, setCompose] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetchNui('getCalendarEvents').then((res) => {
      setEvents(res?.events || [])
      setServerEvents(res?.serverEvents || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveEvent = async () => {
    if (!form.title.trim()) {
      notify('Calendar', 'Title is required', 'error')
      return
    }
    const res = await fetchNui('saveCalendarEvent', form)
    if (res?.ok) {
      notify('Calendar', 'Event saved', 'default')
      setCompose(false)
      setForm({ title: '', description: '', location: '', starts_at: '' })
      load()
    }
  }

  const deleteEvent = async (id) => {
    await fetchNui('deleteCalendarEvent', { id })
    load()
  }

  return (
    <AppScreen
      className="calendar-app"
      title="Calendar"
      onBack={goBack}
      headerRight={
        <button type="button" className="doc-header-add" onClick={() => setCompose(true)} aria-label="New event">
          <Plus size={20} />
        </button>
      }
    >
      {compose ? (
        <div className="darkweb-compose">
          <input className="doc-search" placeholder="Event title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className="doc-search" placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <input className="doc-search" type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value.replace('T', ' ') + ':00' }))} />
          <textarea className="darkweb-textarea" placeholder="Notes" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="darkweb-compose-actions">
            <button type="button" className="notes-empty-btn" onClick={() => setCompose(false)}>Cancel</button>
            <button type="button" className="notes-empty-btn primary" onClick={saveEvent}>Save</button>
          </div>
        </div>
      ) : loading ? (
        <div className="phone-empty"><Calendar size={48} /><p>Loading events...</p></div>
      ) : (
        <>
          {serverEvents.length > 0 && (
            <>
              <p className="phone-section-label">City events</p>
              {serverEvents.map((ev) => (
                <div key={ev.id} className="calendar-event server">
                  <div className="calendar-event-date">{formatEventDate(ev.starts_at)}</div>
                  <h3>{ev.title}</h3>
                  <p>{ev.description}</p>
                  {ev.location && (
                    <span className="calendar-location"><MapPin size={12} /> {ev.location}</span>
                  )}
                </div>
              ))}
            </>
          )}

          <p className="phone-section-label">My events</p>
          {events.length === 0 ? (
            <div className="phone-empty" style={{ padding: '24px 0' }}>
              <p>No personal events</p>
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="calendar-event">
                <div className="calendar-event-row">
                  <div className="calendar-event-date">{formatEventDate(ev.starts_at)}</div>
                  <button type="button" className="darkweb-delete" onClick={() => deleteEvent(ev.id)} aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3>{ev.title}</h3>
                {ev.description && <p>{ev.description}</p>}
                {ev.location && (
                  <span className="calendar-location"><MapPin size={12} /> {ev.location}</span>
                )}
              </div>
            ))
          )}
        </>
      )}
    </AppScreen>
  )
}
