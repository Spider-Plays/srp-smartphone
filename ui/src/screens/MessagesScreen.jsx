import { useEffect, useState } from 'react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { formatPhone } from '../utils/streamerMode'

function formatConversationTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesScreen() {
  const { navigate, goBack, streamerMode, phoneFlipped, screen, screenParams } = usePhone()
  const openPhone = phoneFlipped && screen === 'chat' ? screenParams?.phone : null
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNui('getConversations').then((data) => {
      setConversations(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <AppScreen title="Messages" onBack={goBack} className="messages-app">
      {loading && (
        <div className="phone-empty">
          <p>Loading...</p>
        </div>
      )}
      {!loading && conversations.length === 0 && (
        <div className="phone-empty">
          <p>No conversations yet</p>
        </div>
      )}
      {!loading &&
        conversations.map((c) => (
          <button
            key={c.phone}
            type="button"
            className={`conversation-item${openPhone && openPhone === c.phone ? ' is-active' : ''}`}
            onClick={() => navigate('chat', { phone: c.phone, name: c.name })}
          >
            <div className="conversation-avatar">{(c.name || c.phone || '?').charAt(0)}</div>
            <div className="conversation-info">
              <div className="conversation-header">
                <div className="conversation-name">{c.name || formatPhone(c.phone, streamerMode)}</div>
                <div className="conversation-time">{c.time || formatConversationTime(c.lastAt)}</div>
              </div>
              <div className="conversation-preview">
                <div className="conversation-last-message">{c.lastMessage}</div>
                {c.unread > 0 && <div className="unread-badge">{c.unread}</div>}
              </div>
            </div>
          </button>
        ))}
    </AppScreen>
  )
}
