import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock,
  Grid3X3,
  MessageCircle,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Pencil,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { formatPhone } from '../utils/streamerMode'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

function formatCallTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function CallTypeIcon({ status, outgoing }) {
  if (status === 'missed') return <PhoneMissed size={18} className="call-icon missed" />
  if (outgoing) return <PhoneOutgoing size={18} className="call-icon outgoing" />
  return <PhoneIncoming size={18} className="call-icon incoming" />
}

const PHONE_TABS = [
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'keypad', label: 'Keypad', icon: Grid3X3 },
  { id: 'recent', label: 'Recent', icon: Clock },
]

export default function PhoneApp() {
  const { goBack, navigate, streamerMode, callAnonymous, activeCall, setActiveCall, stopIncomingRing } =
    usePhone()
  const [tab, setTab] = useState('keypad')
  const [contacts, setContacts] = useState([])
  const [history, setHistory] = useState([])
  const [search, setSearch] = useState('')
  const [dial, setDial] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', note: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(false)

  const loadContacts = () => fetchNui('getContacts').then((data) => setContacts(data || []))
  const loadHistory = () => fetchNui('getCallHistory').then((data) => setHistory(data || []))

  useEffect(() => {
    loadContacts()
    loadHistory()
  }, [])

  const filtered = useMemo(
    () =>
      contacts.filter(
        (c) =>
          !search ||
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
      ),
    [contacts, search]
  )

  const formValid = form.name.trim() !== '' && form.phone.trim() !== ''

  const resetForm = () => {
    setForm({ name: '', phone: '', note: '' })
    setAdding(false)
    setEditing(null)
    setConfirmDelete(false)
  }

  const startAdd = () => {
    setForm({ name: '', phone: '', note: '' })
    setAdding(true)
    setEditing(null)
  }

  const startEdit = (contact, e) => {
    e.stopPropagation()
    setEditing(contact)
    setForm({ name: contact.name, phone: contact.phone, note: contact.note || '' })
    setAdding(false)
    setConfirmDelete(false)
  }

  const saveContact = async () => {
    if (!formValid) return
    if (adding) {
      const result = await fetchNui('addContact', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        note: form.note.trim(),
      })
      if (result?.ok) {
        await loadContacts()
        resetForm()
      }
      return
    }
    if (editing) {
      const result = await fetchNui('updateContact', {
        id: editing.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        note: form.note.trim(),
      })
      if (result?.ok) {
        await loadContacts()
        resetForm()
      }
    }
  }

  const deleteContact = async () => {
    if (!editing) return
    const result = await fetchNui('deleteContact', { id: editing.id })
    if (result?.ok) {
      await loadContacts()
      resetForm()
    }
  }

  const beginCall = async (contact) => {
    const result = await fetchNui('startCall', { phone: contact.phone, anonymous: callAnonymous })
    if (result?.ok) {
      setActiveCall({
        callId: result.callId,
        name: result.name || contact.name,
        phone: result.phone || contact.phone,
        ringing: true,
      })
    }
  }

  const endCall = async () => {
    const id = activeCall?.callId
    stopIncomingRing()
    if (id) await fetchNui('endCall', { callId: id })
    setActiveCall(null)
    setMuted(false)
    setSpeaker(false)
    loadHistory()
  }

  const appendKey = (key) => setDial((d) => d + key)
  const deleteKey = () => setDial((d) => d.slice(0, -1))

  const dialCall = async () => {
    if (!dial.trim()) return
    await beginCall({ name: dial, phone: dial })
    setDial('')
  }

  const resolveCallName = (entry) => {
    const phone = entry.outgoing ? entry.receiver_phone : entry.caller_phone
    const match = contacts.find((c) => c.phone === phone)
    return match?.name || phone || 'Unknown'
  }

  if (activeCall) {
    return (
      <div className="phone-app contacts-app">
        <div className={`calling-screen ${activeCall?.ringing ? 'is-outgoing' : 'is-active'}`}>
          <div className="call-info-section">
            <div className="calling-avatar">{(activeCall.name || activeCall.phone || '?')[0]}</div>
            <div className="calling-name">{activeCall.name || formatPhone(activeCall.phone, streamerMode)}</div>
            <div className="calling-number">{formatPhone(activeCall.phone, streamerMode)}</div>
            <div className="calling-status">
              {activeCall?.ringing ? 'Calling...' : 'On call'}
            </div>
          </div>
          <div className="call-controls-section">
            {!activeCall?.ringing && (
              <div className="call-controls">
                <button
                  type="button"
                  className={`call-control-btn ${muted ? 'active' : ''}`}
                  onClick={() => setMuted(!muted)}
                >
                  {muted ? <MicOff size={22} /> : <Mic size={22} />}
                  <span className="control-label">{muted ? 'Muted' : 'Mute'}</span>
                </button>
                <button
                  type="button"
                  className={`call-control-btn ${speaker ? 'active' : ''}`}
                  onClick={() => setSpeaker(!speaker)}
                >
                  {speaker ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  <span className="control-label">Speaker</span>
                </button>
              </div>
            )}
            <button type="button" className="end-call-btn" onClick={endCall}>
              <Phone size={26} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (adding || editing) {
    return (
      <div className="phone-app contacts-app">
        <div className="contacts-header">
          <button type="button" className="back-btn" onClick={resetForm}>
            <ArrowLeft size={24} />
          </button>
          <h2 className="contacts-title">{adding ? 'New Contact' : 'Edit Contact'}</h2>
          <button
            type="button"
            className={`save-btn ${formValid ? '' : 'disabled'}`}
            onClick={saveContact}
            disabled={!formValid}
          >
            <Check size={20} />
          </button>
        </div>
        <div className="edit-contact-form">
          <div className="edit-avatar">{form.name.charAt(0) || '+'}</div>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="text"
              className="form-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{adding ? 'Note (Optional)' : 'Note'}</label>
            <textarea
              className="form-textarea"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Add a note..."
              rows={4}
            />
          </div>
          {editing && (
            <button type="button" className="delete-contact-btn" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} />
              Delete Contact
            </button>
          )}
        </div>
        {confirmDelete && (
          <div className="contact-confirm-overlay" onClick={() => setConfirmDelete(false)}>
            <div className="contact-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="contact-confirm-title">Delete Contact?</h3>
              <p className="contact-confirm-message">
                Are you sure you want to delete {editing?.name}? This action cannot be undone.
              </p>
              <div className="contact-confirm-actions">
                <button type="button" className="contact-confirm-btn cancel" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
                <button type="button" className="contact-confirm-btn delete" onClick={deleteContact}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <AppScreen
      title="Phone"
      onBack={goBack}
      className={`contacts-app phone-app-shell${tab === 'keypad' ? ' phone-keypad-view' : ''}`}
      tabs={PHONE_TABS}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      {tab === 'contacts' && (
        <>
          <div className="contacts-search">
            <input
              type="text"
              className="search-input"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="add-contact-btn" onClick={startAdd}>
            <div className="add-contact-icon">+</div>
            <span>Add New Contact</span>
          </button>
          {filtered.length === 0 ? (
            <div className="no-contacts">
              <p>No contacts found</p>
            </div>
          ) : (
            filtered.map((contact, i) => (
              <div key={contact.id} className="contact-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="contact-avatar">{contact.name.charAt(0)}</div>
                <div className="contact-info">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-phone">{formatPhone(contact.phone, streamerMode)}</div>
                  {contact.note && <div className="contact-note">{contact.note}</div>}
                </div>
                <div className="contact-actions">
                  <button type="button" className="contact-action-btn call" onClick={() => beginCall(contact)} title="Call">
                    <Phone size={18} />
                  </button>
                  <button
                    type="button"
                    className="contact-action-btn message"
                    onClick={() => navigate('chat', { phone: contact.phone, name: contact.name })}
                    title="Message"
                  >
                    <MessageCircle size={18} />
                  </button>
                  <button type="button" className="contact-action-btn edit" onClick={(e) => startEdit(contact, e)} title="Edit">
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'keypad' && (
        <div className="keypad-container">
          <div className="dial-display">
            <input
              type="text"
              className="dial-input"
              value={dial}
              readOnly
              placeholder="Enter number"
              aria-label="Phone number"
            />
          </div>
          <div className="keypad-grid">
            {KEYS.map((key) => (
              <button key={key} type="button" className="keypad-button" onClick={() => appendKey(key)}>
                {key}
              </button>
            ))}
          </div>
          <div className="keypad-actions">
            <button type="button" className="keypad-action-btn delete" onClick={deleteKey} disabled={!dial} aria-label="Delete digit">
              <X size={20} />
            </button>
            <button type="button" className="keypad-action-btn call" onClick={dialCall} disabled={!dial.trim()} aria-label="Call">
              <Phone size={20} />
            </button>
          </div>
        </div>
      )}

      {tab === 'recent' && (
        <>
          {history.length === 0 ? (
            <div className="no-contacts">
              <p>No recent calls</p>
            </div>
          ) : (
            history.map((entry, i) => {
              const phone = entry.outgoing ? entry.receiver_phone : entry.caller_phone
              const name = resolveCallName(entry)
              return (
                <div
                  key={`${phone}-${entry.created_at}-${i}`}
                  className="call-item"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => beginCall({ name, phone })}
                >
                  <div className="call-avatar-small">{name.charAt(0)}</div>
                  <div className="call-info">
                    <div className="call-name-row">
                      <CallTypeIcon status={entry.status} outgoing={!!entry.outgoing} />
                      <div className="call-name-small">{name}</div>
                    </div>
                    <div className="call-details">
                      {formatPhone(phone, streamerMode)}
                      {entry.duration
                        ? ` • ${Math.floor(entry.duration / 60)}:${String(entry.duration % 60).padStart(2, '0')}`
                        : entry.status === 'missed'
                          ? ' • Missed'
                          : ''}
                    </div>
                  </div>
                  <div className="call-time">{formatCallTime(entry.created_at)}</div>
                </div>
              )
            })
          )}
        </>
      )}
    </AppScreen>
  )
}
