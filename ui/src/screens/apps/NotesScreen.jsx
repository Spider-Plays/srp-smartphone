import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, StickyNote, Trash2 } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import FoldEmpty from '../../components/FoldEmpty'
import FoldSplit from '../../components/FoldSplit'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const NOTE_COLORS = [
  { hex: '#FFD60A', name: 'Sun' },
  { hex: '#FF9F0A', name: 'Amber' },
  { hex: '#FF453A', name: 'Coral' },
  { hex: '#BF5AF2', name: 'Violet' },
  { hex: '#0A84FF', name: 'Sky' },
  { hex: '#34C759', name: 'Mint' },
]

const DEFAULT_COLOR = NOTE_COLORS[0].hex
const MAX_CONTENT = 2000

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function noteCardStyle(color) {
  const c = color || DEFAULT_COLOR
  return {
    background: `linear-gradient(145deg, ${hexToRgba(c, 0.38)} 0%, ${hexToRgba(c, 0.14)} 100%)`,
    borderColor: hexToRgba(c, 0.28),
  }
}

function editorSurfaceStyle(color) {
  const c = color || DEFAULT_COLOR
  return {
    background: `linear-gradient(180deg, ${hexToRgba(c, 0.55)} 0%, ${hexToRgba(c, 0.28)} 55%, ${hexToRgba(c, 0.12)} 100%)`,
  }
}

function emptyDraft() {
  return { id: null, title: '', content: '', color: DEFAULT_COLOR }
}

function NoteCard({ note, onOpen, active = false }) {
  const preview = (note.content || '').trim()
  return (
    <button
      type="button"
      className={`notes-card${active ? ' is-active' : ''}`}
      style={noteCardStyle(note.color)}
      onClick={() => onOpen(note)}
    >
      <span className="notes-card-title">{note.title || 'Untitled'}</span>
      <span className="notes-card-preview">{preview}</span>
      {note.timeAgo && <span className="notes-card-meta">{note.timeAgo}</span>}
    </button>
  )
}

function NotesEditor({ draft, setDraft, onBack, onSave, onDelete, saving }) {
  const canSave = Boolean(draft.title?.trim())
  const contentLen = draft.content?.length ?? 0

  return (
    <AppScreen
      className="notes-app"
      title={draft.id ? 'Edit' : 'New note'}
      onBack={onBack}
      headerRight={
        <button
          type="button"
          className="notes-header-compose"
          onClick={onSave}
          disabled={!canSave || saving}
          aria-label="Save note"
        >
          <Check size={22} strokeWidth={2.5} />
        </button>
      }
    >
      <div className="notes-editor" style={editorSurfaceStyle(draft.color)}>
        <div className="notes-editor-body">
          <input
            className="notes-editor-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 64) })}
            placeholder="Title"
            maxLength={64}
            autoFocus
          />
          <textarea
            className="notes-editor-content"
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value.slice(0, MAX_CONTENT) })}
            placeholder="Start writing…"
            maxLength={MAX_CONTENT}
          />
        </div>
        <div className="notes-editor-footer">
          <div className="notes-color-row">
            <span className="notes-color-label">Color</span>
            {NOTE_COLORS.map(({ hex }) => (
              <button
                key={hex}
                type="button"
                className={`notes-color-swatch ${draft.color === hex ? 'active' : ''}`}
                style={{ background: hex }}
                onClick={() => setDraft({ ...draft, color: hex })}
                aria-label={`Color ${hex}`}
              />
            ))}
          </div>
          <div className="notes-editor-actions">
            <button
              type="button"
              className="notes-save-btn"
              onClick={onSave}
              disabled={!canSave || saving}
            >
              <Check size={18} strokeWidth={2.5} />
              {saving ? 'Saving…' : 'Save note'}
            </button>
            {draft.id && (
              <button type="button" className="notes-delete-btn" onClick={onDelete} aria-label="Delete note">
                <Trash2 size={20} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="notes-char-count">
            {contentLen}/{MAX_CONTENT}
          </div>
        </div>
      </div>
    </AppScreen>
  )
}

export default function NotesScreen() {
  const { goBack, notify, phoneFlipped, foldLayout } = usePhone()
  const folded = phoneFlipped && foldLayout?.mode === 'span'
  const [notes, setNotes] = useState([])
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => fetchNui('getNotes').then(setNotes)

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
    )
  }, [notes, search])

  const startNew = () => setEditing(emptyDraft())

  const save = async () => {
    if (!editing?.title?.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetchNui('saveNote', editing)
      if (res?.ok) {
        notify('Notes', 'Saved', 'default')
        setEditing(null)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editing?.id) return
    await fetchNui('deleteNote', { id: editing.id })
    notify('Notes', 'Deleted', 'default')
    setEditing(null)
    load()
  }

  const editor = editing ? (
    <NotesEditor
      draft={editing}
      setDraft={setEditing}
      onBack={() => setEditing(null)}
      onSave={save}
      onDelete={remove}
      saving={saving}
    />
  ) : null

  if (editor && !folded) return editor

  const countLabel =
    filtered.length === 0
      ? search.trim()
        ? 'No matches'
        : 'No notes'
      : `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`

  const library = (
    <AppScreen
      className="notes-app"
      title="Notes"
      subtitle="Your memos"
      onBack={goBack}
      headerRight={
        <button type="button" className="notes-header-compose" onClick={startNew} aria-label="New note">
          <Plus size={22} strokeWidth={2.5} />
        </button>
      }
      layer={
        notes.length > 0 && (
          <button type="button" className="notes-fab" onClick={startNew} aria-label="New note">
            <Plus size={24} strokeWidth={2.5} />
          </button>
        )
      }
    >
      <div className="notes-search-wrap">
        <Search className="notes-search-icon" size={18} strokeWidth={2} />
        <input
          className="notes-search-input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
        />
      </div>

      {notes.length > 0 && <p className="notes-count">{countLabel}</p>}

      <div className="notes-grid">
        {notes.length === 0 ? (
          <div className="notes-empty">
            <div className="notes-empty-icon">
              <StickyNote size={36} strokeWidth={1.5} />
            </div>
            <h3>No notes yet</h3>
            <p>Jot down reminders, codes, or anything you need in the city.</p>
            <button type="button" className="notes-empty-btn" onClick={startNew}>
              Create your first note
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="notes-no-results">Nothing matches &ldquo;{search.trim()}&rdquo;</p>
        ) : (
          filtered.map((n) => (
            <NoteCard key={n.id} note={n} onOpen={setEditing} active={editing?.id != null && editing.id === n.id} />
          ))
        )}
      </div>
    </AppScreen>
  )

  if (folded) {
    return (
      <FoldSplit
        menu={library}
        detail={editor || <FoldEmpty title="Select a note" subtitle="Open a note to read and edit it here." />}
      />
    )
  }

  return library
}
