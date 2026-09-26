import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { formatPhone } from '../utils/streamerMode'

export default function ContactsScreen() {
  const { navigate, goBack, streamerMode, phoneFlipped, screen, screenParams } = usePhone()
  const openId = phoneFlipped && screen === 'edit-contact' ? screenParams?.contact?.id : null
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    fetchNui('getContacts').then(setContacts)
  }, [])

  return (
    <AppScreen
      title="Contacts"
      onBack={goBack}
      className="contacts-app"
      headerRight={
        <button
          type="button"
          className="phone-app-back"
          onClick={() => navigate('edit-contact', { contact: null })}
          aria-label="Add contact"
        >
          <Plus size={22} />
        </button>
      }
    >
      {contacts.length === 0 ? (
        <div className="phone-empty">
          <p>No contacts yet</p>
        </div>
      ) : (
        contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`conversation-item${openId != null && openId === c.id ? ' is-active' : ''}`}
            onClick={() => navigate('edit-contact', { contact: c })}
          >
            <div className="conversation-avatar">{c.name[0]}</div>
            <div className="conversation-info">
              <div className="conversation-name">{c.name}</div>
              <div className="conversation-last-message">{formatPhone(c.phone, streamerMode)}</div>
            </div>
          </button>
        ))
      )}
    </AppScreen>
  )
}
