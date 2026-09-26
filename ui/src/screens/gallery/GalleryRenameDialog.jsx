import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export default function GalleryRenameDialog({ photo, onClose, onSave, saving }) {
  const [label, setLabel] = useState(photo?.label || photo?.name || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setLabel(photo?.label || photo?.name || '')
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [photo?.id])

  if (!photo) return null

  const submit = (e) => {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed || saving) return
    onSave(trimmed)
  }

  return (
    <div className="glry-dialog-root" role="presentation">
      <button type="button" className="glry-sheet-backdrop" onClick={onClose} aria-label="Cancel" />
      <form className="glry-dialog" onSubmit={submit} role="dialog" aria-label="Rename photo">
        <header className="glry-dialog-header">
          <h3>Rename Photo</h3>
          <button type="button" className="glry-sheet-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <input
          ref={inputRef}
          type="text"
          className="glry-dialog-input"
          value={label}
          maxLength={64}
          placeholder="Photo name"
          onChange={(e) => setLabel(e.target.value)}
          disabled={saving}
        />
        <div className="glry-dialog-actions">
          <button type="button" className="glry-dialog-btn glry-dialog-btn-muted" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="glry-dialog-btn glry-dialog-btn-primary" disabled={!label.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
