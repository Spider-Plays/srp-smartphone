import { useCallback, useEffect, useState } from 'react'
import {
  ArchiveRestore,
  ChevronLeft,
  Inbox,
  Mail,
  Paperclip,
  PenSquare,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import ChirpMediaPicker from '../chirp/components/ChirpMediaPicker'
import FoldEmpty from '../../components/FoldEmpty'
import FoldSplit from '../../components/FoldSplit'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui, useNuiEvent } from '../../hooks/useNui'

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash2 },
]

function avatarLetter(label) {
  const t = (label || '?').trim()
  return (t[0] || '?').toUpperCase()
}

const SEND_ERRORS = {
  not_found: 'No account found for that address.',
  invalid_email: 'Enter a valid spider.mail address.',
  system_address: 'You cannot email system addresses.',
  self: 'You cannot email yourself.',
  empty: 'Add a subject and a message or at least one image.',
  rate_limit: 'Slow down — try again shortly.',
}

const EMPTY_COMPOSE = { to: '', subject: '', body: '', attachments: [] }

function MailAttachmentGrid({ attachments, onView }) {
  if (!attachments?.length) return null
  return (
    <div className="mail-attachments">
      <p className="mail-attachments-label">
        {attachments.length === 1 ? '1 attachment' : `${attachments.length} attachments`}
      </p>
      <div className="mail-attachments-grid">
        {attachments.map((url) => (
          <button key={url} type="button" className="mail-attachment-thumb" onClick={() => onView(url)}>
            <img src={url} alt="Attachment" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MailScreen() {
  const { goBack, notify, bootstrap, phoneFlipped, foldLayout } = usePhone()
  const folded = phoneFlipped && foldLayout?.mode === 'span'
  const domain = bootstrap?.mailConfig?.domain || 'spider.mail'
  const maxAttachments = bootstrap?.mailConfig?.maxAttachments ?? 5

  const [view, setView] = useState('list')
  const [folder, setFolder] = useState('inbox')
  const [search, setSearch] = useState('')
  const [account, setAccount] = useState(null)
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [compose, setCompose] = useState(EMPTY_COMPOSE)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState(null)

  const loadAccount = useCallback(() => fetchNui('getMailAccount').then(setAccount), [])

  const loadMessages = useCallback(() => {
    setLoading(true)
    return fetchNui('getMail', { folder, search: search.trim() }).then((rows) => {
      setMessages(rows || [])
      setLoading(false)
    })
  }, [folder, search])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useNuiEvent(
    useCallback(
      (msg) => {
        if (msg.action === 'mailUpdated' && (view === 'list' || folded)) {
          loadMessages()
          loadAccount()
        }
      },
      [view, folded, loadMessages, loadAccount]
    )
  )

  const openMail = async (id) => {
    const res = await fetchNui('readMail', { id })
    if (res?.mail) {
      setSelected(res.mail)
      setView('detail')
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_flag: 1 } : m))
      )
      loadAccount()
    }
  }

  const toggleStar = async (e, mail, inList) => {
    e?.stopPropagation?.()
    const next = !mail.starred
    await fetchNui('starMail', { id: mail.id, starred: next })
    if (inList) {
      setMessages((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, starred: next ? 1 : 0 } : m))
      )
    } else if (selected?.id === mail.id) {
      setSelected({ ...selected, starred: next ? 1 : 0 })
    }
  }

  const moveToTrash = async (id) => {
    await fetchNui('deleteMail', { id })
    notify('Mail', folder === 'trash' ? 'Deleted permanently' : 'Moved to trash', 'default')
    setView('list')
    setSelected(null)
    loadMessages()
    loadAccount()
  }

  const restoreFromTrash = async (id) => {
    await fetchNui('restoreMail', { id })
    notify('Mail', 'Restored', 'default')
    setView('list')
    setSelected(null)
    loadMessages()
  }

  const markUnread = async (id) => {
    await fetchNui('markMailUnread', { id })
    setView('list')
    setSelected(null)
    loadMessages()
    loadAccount()
  }

  const startCompose = (replyTo) => {
    if (replyTo) {
      setCompose({
        to: replyTo.sender_email || '',
        subject: replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject || ''}`,
        body: `\n\n—\nOn ${replyTo.formattedDate || replyTo.timeAgo}, ${replyTo.sender_label} wrote:\n${replyTo.body || ''}`,
        attachments: [],
      })
    } else {
      setCompose(EMPTY_COMPOSE)
    }
    setView('compose')
  }

  const addAttachment = (url) => {
    if (!url) return
    setCompose((c) => {
      const list = c.attachments || []
      if (list.includes(url)) {
        notify('Mail', 'Image already attached', 'default')
        return c
      }
      if (list.length >= maxAttachments) {
        notify('Mail', `Maximum ${maxAttachments} images per email`, 'default')
        return c
      }
      return { ...c, attachments: [...list, url] }
    })
  }

  const removeAttachment = (url) => {
    setCompose((c) => ({
      ...c,
      attachments: (c.attachments || []).filter((u) => u !== url),
    }))
  }

  const canSendMail =
    compose.to.trim() &&
    compose.subject.trim() &&
    (compose.body.trim() || (compose.attachments?.length || 0) > 0)

  const sendMessage = async () => {
    setSending(true)
    const res = await fetchNui('sendMail', {
      to: compose.to,
      subject: compose.subject,
      body: compose.body,
      attachments: compose.attachments || [],
    })
    setSending(false)
    if (res?.ok) {
      notify('Mail', 'Message sent', 'default')
      setCompose(EMPTY_COMPOSE)
      setFolder('sent')
      setView('list')
    } else {
      notify('Mail', SEND_ERRORS[res?.error] || 'Could not send message', 'default')
    }
  }

  const backFromSub = () => {
    setView('list')
    setSelected(null)
    loadMessages()
  }

  const attachCount = compose.attachments?.length || 0
  const composePane = view === 'compose' ? (
      <div className="mail-app phone-app">
        <header className="phone-app-header">
          <button type="button" className="phone-app-back" onClick={() => setView('list')} aria-label="Back">
            <ChevronLeft size={26} strokeWidth={2} />
          </button>
          <div className="phone-app-header-main">
            <h1 className="phone-app-title">New Message</h1>
          </div>
        </header>
        <div className="mail-compose-form">
          <div className="mail-field">
            <label>To</label>
            <input
              type="email"
              placeholder={`5551234@${domain}`}
              value={compose.to}
              onChange={(e) => setCompose({ ...compose, to: e.target.value })}
            />
            <p className="mail-hint">Use a player&apos;s phone digits + @{domain} (e.g. 5550101@{domain})</p>
          </div>
          <div className="mail-field">
            <label>Subject</label>
            <input
              value={compose.subject}
              onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
              placeholder="Subject"
            />
          </div>
          <div className="mail-field">
            <div className="mail-field-row">
              <label>Message</label>
              <button
                type="button"
                className="mail-attach-btn"
                onClick={() => setPickerOpen(true)}
                disabled={attachCount >= maxAttachments}
                title="Attach from gallery"
              >
                <Paperclip size={16} />
                Attach
                {attachCount > 0 ? ` (${attachCount}/${maxAttachments})` : ''}
              </button>
            </div>
            <textarea
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              placeholder="Write your message…"
            />
          </div>
          {attachCount > 0 && (
            <div className="mail-compose-attachments">
              {compose.attachments.map((url) => (
                <div key={url} className="mail-compose-attachment">
                  <img src={url} alt="Attached" />
                  <button
                    type="button"
                    className="mail-compose-attachment-remove"
                    onClick={() => removeAttachment(url)}
                    aria-label="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="mail-send-btn"
            disabled={sending || !canSendMail}
            onClick={sendMessage}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <ChirpMediaPicker
          open={pickerOpen}
          title="Attach image"
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => addAttachment(url)}
        />
        {viewerImage && (
          <div className="mail-image-viewer" role="dialog" onClick={() => setViewerImage(null)}>
            <img src={viewerImage} alt="Full size" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
  ) : null

  const isTrash = selected?.folder === 'trash'
  const peer = selected?.folder === 'sent' ? selected.recipient_email : selected?.sender_label
  const peerEmail = selected?.folder === 'sent' ? selected.recipient_email : selected?.sender_email

  const detailPane = view === 'detail' && selected ? (
      <div className="mail-app phone-app">
        <header className="phone-app-header">
          <button type="button" className="phone-app-back" onClick={backFromSub} aria-label="Back">
            <ChevronLeft size={26} strokeWidth={2} />
          </button>
          <div className="phone-app-header-main">
            <h1 className="phone-app-title">Message</h1>
          </div>
          <div className="mail-header-actions">
            <button
              type="button"
              className={`mail-icon-btn mail-star-btn ${selected.starred ? 'starred' : ''}`}
              onClick={() => toggleStar(null, selected, false)}
              aria-label="Star"
            >
              <Star size={18} fill={selected.starred ? 'currentColor' : 'none'} />
            </button>
          </div>
        </header>
        <div className="mail-detail">
          <div className="mail-detail-head">
            <h2 className="mail-detail-subject">{selected.subject}</h2>
            <div className="mail-detail-meta">
              <div className="mail-row-avatar">{avatarLetter(peer)}</div>
              <div>
                <div className="mail-detail-from">{selected.peerLabel || peer}</div>
                {peerEmail && <div className="mail-detail-email">{peerEmail}</div>}
                <div className="mail-detail-date">{selected.formattedDate || selected.timeAgo}</div>
              </div>
            </div>
          </div>
          {selected.body?.trim() ? <div className="mail-detail-body">{selected.body}</div> : null}
          <MailAttachmentGrid attachments={selected.attachments} onView={setViewerImage} />
        </div>
        {viewerImage && (
          <div className="mail-image-viewer" role="dialog" onClick={() => setViewerImage(null)}>
            <img src={viewerImage} alt="Full size" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
        <div className="mail-toolbar">
          {selected.folder === 'inbox' && selected.sender_email && (
            <button type="button" className="mail-toolbar-btn primary" onClick={() => startCompose(selected)}>
              <Reply size={16} />
              Reply
            </button>
          )}
          {selected.folder === 'inbox' && (
            <button type="button" className="mail-toolbar-btn" onClick={() => markUnread(selected.id)}>
              Mark unread
            </button>
          )}
          {isTrash ? (
            <>
              <button type="button" className="mail-toolbar-btn primary" onClick={() => restoreFromTrash(selected.id)}>
                <ArchiveRestore size={16} />
                Restore
              </button>
              <button type="button" className="mail-toolbar-btn danger" onClick={() => moveToTrash(selected.id)}>
                <Trash2 size={16} />
                Delete forever
              </button>
            </>
          ) : (
            <button type="button" className="mail-toolbar-btn danger" onClick={() => moveToTrash(selected.id)}>
              <Trash2 size={16} />
              {folder === 'trash' ? 'Delete' : 'Trash'}
            </button>
          )}
        </div>
      </div>
  ) : null

  const listPane = (
    <div className="mail-app phone-app">
      <header className="phone-app-header">
        <button type="button" className="phone-app-back" onClick={goBack} aria-label="Back">
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        <div className="phone-app-header-main">
          <h1 className="phone-app-title">Mail</h1>
          {account?.unread > 0 && (
            <p className="phone-app-subtitle">{account.unread} unread</p>
          )}
        </div>
      </header>

      <div className="mail-header-bar">
        {account?.email && (
          <div className="mail-account">
            <div className="mail-account-icon">
              <Mail size={18} />
            </div>
            <div>
              <div className="mail-account-email">{account.email}</div>
              <div className="mail-account-name">{account.name}</div>
            </div>
          </div>
        )}
        <div className="mail-search">
          <input
            type="search"
            placeholder="Search mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} className="mail-search-icon" />
        </div>
        <div className="mail-folder-tabs" role="tablist">
          {FOLDERS.map((f) => {
            const Icon = f.icon
            const showUnread = f.id === 'inbox' && (account?.unread || 0) > 0
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={folder === f.id}
                className={`mail-folder-tab ${folder === f.id ? 'active' : ''}`}
                onClick={() => setFolder(f.id)}
              >
                <Icon size={14} />
                {f.label}
                {showUnread && <span className="unread-pill">{account.unread}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mail-list">
        {loading && (
          <div className="mail-empty">
            <p>Loading…</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="mail-empty">
            <Mail size={48} />
            <p>{folder === 'inbox' ? 'Inbox is empty' : `No messages in ${folder}`}</p>
            {folder === 'inbox' && (
              <p style={{ fontSize: 12 }}>Tap compose to email another player</p>
            )}
          </div>
        )}
        {!loading &&
          messages.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mail-row ${m.read_flag === 0 ? 'unread' : ''}${selected?.id === m.id && view !== 'list' ? ' is-active' : ''}`}
              onClick={() => openMail(m.id)}
            >
              <div className="mail-row-avatar">{avatarLetter(m.peerLabel)}</div>
              <div className="mail-row-body">
                <div className="mail-row-top">
                  <span className="mail-row-from">{m.peerLabel}</span>
                  <span className="mail-row-time">{m.timeAgo}</span>
                </div>
                <div className="mail-row-subject">
                  {m.attachmentCount > 0 && <Paperclip size={12} className="mail-row-clip" aria-hidden />}
                  {m.subject}
                </div>
                <div className="mail-row-snippet">{m.snippet}</div>
                <div className="mail-row-meta">
                  <button
                    type="button"
                    className={`mail-star-btn ${m.starred ? 'starred' : ''}`}
                    onClick={(e) => toggleStar(e, m, true)}
                    aria-label={m.starred ? 'Unstar' : 'Star'}
                  >
                    <Star size={14} fill={m.starred ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </button>
          ))}
      </div>

      <button type="button" className="mail-compose-fab" onClick={() => startCompose()} aria-label="Compose">
        <PenSquare size={22} />
      </button>
    </div>
  )

  if (folded) {
    return (
      <FoldSplit
        menu={listPane}
        detail={
          composePane ||
          detailPane || <FoldEmpty title="Select a message" subtitle="Mail you open or write shows up on this screen." />
        }
      />
    )
  }

  return composePane || detailPane || listPane
}
