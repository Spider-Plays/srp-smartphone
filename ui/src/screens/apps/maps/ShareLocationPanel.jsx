import { useState } from 'react'
import { X } from 'lucide-react'
import { fetchNui } from '../../../hooks/useNui'

export default function ShareLocationPanel({ pin, contacts, onCancel, onSent, notify }) {
  const [selected, setSelected] = useState([])
  const [pickId, setPickId] = useState('')
  const [sending, setSending] = useState(false)

  const available = (contacts || []).filter((c) => !selected.some((s) => s.phone === c.phone))

  const addContact = () => {
    if (!pickId) return
    const contact = contacts.find((c) => String(c.id) === String(pickId))
    if (!contact) return
    setSelected((list) => [...list, contact])
    setPickId('')
  }

  const removeContact = (phone) => {
    setSelected((list) => list.filter((c) => c.phone !== phone))
  }

  const sendAll = async () => {
    if (!selected.length || !pin) return
    setSending(true)
    let okCount = 0
    for (const contact of selected) {
      const res = await fetchNui('shareMapLocation', {
        phone: contact.phone,
        label: pin.label,
        x: pin.x,
        y: pin.y,
      })
      if (res?.ok) okCount += 1
    }
    setSending(false)

    if (okCount === selected.length) {
      notify('Maps', `Location sent to ${okCount} contact${okCount > 1 ? 's' : ''}`, 'default')
      onSent()
    } else if (okCount > 0) {
      notify('Maps', `Sent to ${okCount} of ${selected.length} contacts`, 'default')
      onSent()
    } else {
      notify('Maps', 'Could not send location', 'error')
    }
  }

  return (
    <div className="maps-share-panel">
      <p className="maps-share-panel-title">Send “{pin.label}”</p>

      <div className="phone-form-group maps-share-form">
        <label>Add contact</label>
        <div className="maps-share-contact-row">
          <select
            className="maps-share-select"
            aria-label="Select contact"
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            disabled={!available.length || sending}
          >
            <option value="">{available.length ? 'Select contact...' : 'No more contacts'}</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="phone-btn phone-btn-ghost maps-share-add-btn"
            onClick={addContact}
            disabled={!pickId || sending}
          >
            Add
          </button>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="maps-share-recipients">
          {selected.map((c) => (
            <span key={c.phone} className="maps-share-chip">
              <span className="maps-share-chip-label">{c.name}</span>
              <button
                type="button"
                className="maps-share-chip-remove"
                onClick={() => removeContact(c.phone)}
                disabled={sending}
                aria-label={`Remove ${c.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="maps-share-hint">Select one or more contacts to share with.</p>
      )}

      <div className="maps-share-actions">
        <button
          type="button"
          className="phone-btn phone-btn-primary"
          onClick={sendAll}
          disabled={!selected.length || sending}
        >
          {sending ? 'Sending...' : 'Send location'}
        </button>
        <button type="button" className="phone-btn phone-btn-ghost" onClick={onCancel} disabled={sending}>
          Cancel
        </button>
      </div>
    </div>
  )
}
