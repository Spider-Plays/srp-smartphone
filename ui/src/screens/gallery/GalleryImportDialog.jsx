import { useEffect, useRef, useState } from 'react'
import { Link2, X } from 'lucide-react'
import { galleryImportErrorMessage, isValidGalleryImageUrl, normalizeImageUrl } from './utils'

export default function GalleryImportDialog({ onClose, onImport, busy }) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const urlRef = useRef(null)

  useEffect(() => {
    urlRef.current?.focus()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const normalized = normalizeImageUrl(url)
    if (!isValidGalleryImageUrl(normalized)) {
      setError('Enter a valid image URL (Discord CDN, Imgur, or direct .jpg/.png links).')
      return
    }
    setError('')
    const result = await onImport({ url: normalized, label: label.trim() || undefined })
    if (!result?.ok) {
      setError(galleryImportErrorMessage(result?.error))
    }
  }

  return (
    <div className="glry-dialog-root" role="presentation">
      <button type="button" className="glry-sheet-backdrop" onClick={onClose} aria-label="Cancel" />
      <form className="glry-dialog glry-dialog-import" onSubmit={submit} role="dialog" aria-label="Import from link">
        <header className="glry-dialog-header">
          <h3 className="glry-import-title">
            <Link2 size={18} aria-hidden />
            Import from Link
          </h3>
          <button type="button" className="glry-sheet-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <label className="glry-import-label" htmlFor="glry-import-url">
          Image URL
        </label>
        <input
          ref={urlRef}
          id="glry-import-url"
          type="url"
          className="glry-dialog-input"
          placeholder="https://cdn.discordapp.com/attachments/..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError('')
          }}
          disabled={busy}
          autoComplete="off"
        />

        <label className="glry-import-label" htmlFor="glry-import-label">
          Name (optional)
        </label>
        <input
          id="glry-import-label"
          type="text"
          className="glry-dialog-input"
          placeholder="Imported photo"
          value={label}
          maxLength={64}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
        />

        <p className="glry-import-hint">Discord CDN, Imgur, and direct image links are supported.</p>
        {error ? <p className="glry-import-error">{error}</p> : null}

        <div className="glry-dialog-actions">
          <button type="button" className="glry-dialog-btn glry-dialog-btn-muted" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            className="glry-dialog-btn glry-dialog-btn-primary"
            disabled={!normalizeImageUrl(url) || busy}
          >
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </form>
    </div>
  )
}
