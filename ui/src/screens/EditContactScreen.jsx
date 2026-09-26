import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import './EditContact.css'

export default function EditContactScreen() {
  const { screenParams, goBack } = usePhone()
  const contact = screenParams.contact
  const isNew = !contact

  const [name, setName] = useState(contact?.name || '')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [note, setNote] = useState(contact?.note || '')

  const save = async () => {
    if (isNew) {
      await fetchNui('addContact', { name, phone, note })
    } else {
      await fetchNui('updateContact', { id: contact.id, name, phone, note })
    }
    goBack()
  }

  const remove = async () => {
    if (contact?.id) {
      await fetchNui('deleteContact', { id: contact.id })
      goBack()
    }
  }

  return (
    <AppScreen
      title={isNew ? 'New Contact' : 'Edit Contact'}
      onBack={goBack}
      className="edit-contact"
      headerRight={
        <button type="button" className="phone-app-back save-pill" onClick={save} aria-label="Save contact">
          <Save size={18} />
        </button>
      }
    >
      <div className="edit-avatar">{(name || '?')[0].toUpperCase()}</div>

      <div className="phone-form-group">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="phone-form-group">
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="phone-form-group">
        <label>Note</label>
        <textarea
          placeholder="Add a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
        />
      </div>

      {!isNew && (
        <button type="button" className="phone-btn phone-btn-danger" onClick={remove}>
          <Trash2 size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
          Delete Contact
        </button>
      )}
    </AppScreen>
  )
}
