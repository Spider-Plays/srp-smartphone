import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Paperclip, Send, X } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { formatPhone } from '../utils/streamerMode'

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatScreen() {
  const { screenParams, navigate, attachedImage, setAttachedImage, setGallerySelectionMode, streamerMode } =
    usePhone()
  const { phone, name } = screenParams
  const displayPhone = formatPhone(phone, streamerMode)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [viewerImage, setViewerImage] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!phone) return
    fetchNui('getMessages', { phone }).then((data) => setMessages(data || []))
  }, [phone])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() && !attachedImage) return
    const imageUrl = attachedImage?.url || null
    const payload = { phone, message: text.trim(), image: imageUrl }
    const result = await fetchNui('sendMessage', payload)
    if (result?.ok) {
      setMessages((m) => [
        ...m,
        {
          id: result.id,
          message: text.trim(),
          is_mine: 1,
          created_at: new Date().toISOString(),
          image: imageUrl,
        },
      ])
      setText('')
      setAttachedImage(null)
    }
  }

  const openGallery = () => {
    setGallerySelectionMode(true)
    navigate('gallery')
  }

  const chatHeader = (
    <header className="phone-app-header messages-header">
      <button
        type="button"
        className="phone-app-back"
        onClick={() => navigate('messages', {}, true)}
        aria-label="Back"
      >
        <ChevronLeft size={26} strokeWidth={2} />
      </button>
      <div className="messages-contact-info">
        <div className="messages-contact-avatar">{(name || phone || '?').charAt(0)}</div>
        <div className="phone-app-header-main">
          <h1 className="phone-app-title messages-title">{name || displayPhone}</h1>
          <p className="phone-app-subtitle messages-subtitle">{displayPhone}</p>
        </div>
      </div>
    </header>
  )

  const chatFooter = (
    <div className="messages-input-container">
      {attachedImage && (
        <div className="attachment-preview">
          <img src={attachedImage.url} alt={attachedImage.name || 'Attachment'} className="preview-image" />
          <button type="button" className="remove-attachment-btn" onClick={() => setAttachedImage(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="input-row">
        <button type="button" className="attach-btn" onClick={openGallery} title="Attach photo">
          <Paperclip size={20} />
        </button>
        <input
          type="text"
          className="messages-input"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button type="button" className="send-btn" onClick={send}>
          <Send size={20} />
        </button>
      </div>
    </div>
  )

  return (
    <AppScreen className="messages-app chat-app" customHeader={chatHeader} footer={chatFooter}>
      {messages.length === 0 ? (
        <div className="phone-empty">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.is_mine ? 'sent' : 'received'}`}>
            <div className="message-bubble">
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Attachment"
                  className="message-image"
                  onClick={() => setViewerImage(msg.image)}
                />
              )}
              {msg.message && <div className="message-text">{msg.message}</div>}
              <div className="message-time">{formatTime(msg.created_at)}</div>
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />

      {viewerImage && (
        <div className="image-viewer" onClick={() => setViewerImage(null)}>
          <div className="image-viewer-header">
            <button type="button" className="close-viewer-btn" onClick={() => setViewerImage(null)}>
              <X size={24} />
            </button>
          </div>
          <div className="image-viewer-content">
            <img src={viewerImage} alt="Full size" className="viewer-image" />
          </div>
        </div>
      )}
    </AppScreen>
  )
}
