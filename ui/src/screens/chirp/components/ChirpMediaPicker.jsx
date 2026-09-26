import { useEffect, useState } from 'react'
import { Check, Image, Link2, X } from 'lucide-react'
import { fetchNui } from '../../../hooks/useNui'
import ChirpModalPortal from '../ChirpModalPortal'
import { isValidChirpImageUrl, normalizeImageUrl } from '../media'

export default function ChirpMediaPicker({ open, title = 'Add image', onClose, onSelect }) {
  const [tab, setTab] = useState('gallery')
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    if (!open) return
    setTab('gallery')
    setUrlInput('')
    setUrlError('')
    setLoading(true)
    fetchNui('getGallery')
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.photos || []
        setPhotos(list)
      })
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const submitUrl = () => {
    const url = normalizeImageUrl(urlInput)
    if (!isValidChirpImageUrl(url)) {
      setUrlError('Enter a valid image URL (Discord CDN links work)')
      return
    }
    onSelect(url)
    onClose()
  }

  return (
    <ChirpModalPortal>
      <div className="chirp-media-picker-overlay" role="presentation">
        <button type="button" className="chirp-media-picker-backdrop" onClick={onClose} aria-label="Close" />
        <div className="chirp-media-picker" role="dialog" aria-label={title}>
          <div className="chirp-media-picker-header">
            <h3>{title}</h3>
            <button type="button" className="chirp-x-icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="chirp-media-picker-tabs">
            <button type="button" className={tab === 'gallery' ? 'active' : ''} onClick={() => setTab('gallery')}>
              <Image size={16} />
              Gallery
            </button>
            <button type="button" className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>
              <Link2 size={16} />
              Image URL
            </button>
          </div>
          {tab === 'gallery' ? (
            <div className="chirp-media-picker-gallery">
              {loading ? (
                <p className="chirp-media-picker-empty">Loading gallery...</p>
              ) : photos.length === 0 ? (
                <p className="chirp-media-picker-empty">No photos in gallery. Take one in Camera.</p>
              ) : (
                photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="chirp-media-picker-photo"
                    onClick={() => {
                      onSelect(photo.url)
                      onClose()
                    }}
                  >
                    <img src={photo.url} alt={photo.label || 'Gallery photo'} />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="chirp-media-picker-url">
              <label htmlFor="chirp-media-url">Paste image link</label>
              <input
                id="chirp-media-url"
                type="url"
                placeholder="https://cdn.discordapp.com/attachments/..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setUrlError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitUrl()}
              />
              <p className="chirp-media-picker-hint">Discord CDN, Imgur, and direct image links are supported.</p>
              {urlError ? <p className="chirp-media-picker-error">{urlError}</p> : null}
              <button type="button" className="chirp-auth-primary" onClick={submitUrl}>
                <Check size={16} />
                Use image
              </button>
            </div>
          )}
        </div>
      </div>
    </ChirpModalPortal>
  )
}
