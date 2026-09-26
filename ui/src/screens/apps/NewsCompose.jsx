import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Image, Link2, Send, Trash2, X } from 'lucide-react'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import { isValidGalleryImageUrl, normalizeImageUrl } from '../gallery/utils'

const HEADLINE_MAX = 128
const BODY_MAX = 8000

const PUBLISH_ERRORS = {
  not_allowed: 'Only reporters can publish stories.',
  rate_limit: 'Please wait before publishing again.',
  invalid: 'Headline and story body are required.',
}

export default function NewsCompose({ onBack, onPublished }) {
  const { notify, bootstrap } = usePhone()

  const [outlets, setOutlets] = useState([])
  const [outletId, setOutletId] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageMode, setImageMode] = useState(null)
  const [gallery, setGallery] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    fetchNui('getNewsOutlets').then((rows) => {
      const list = Array.isArray(rows) ? rows : []
      setOutlets(list)
      if (list.length) {
        setOutletId((current) => {
          if (current) return current
          const featured = list.find((o) => o.featured) || list[0]
          return String(featured.id)
        })
      }
    })
  }, [])

  useEffect(() => {
    if (imageMode !== 'gallery') return
    setGalleryLoading(true)
    fetchNui('getGallery')
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.photos || []
        setGallery(list)
      })
      .finally(() => setGalleryLoading(false))
  }, [imageMode])

  const canPublish = headline.trim().length > 0 && body.trim().length > 0 && !publishing

  const headlineCount = useMemo(() => `${headline.length}/${HEADLINE_MAX}`, [headline.length])
  const bodyCount = useMemo(() => `${body.length}/${BODY_MAX}`, [body.length])

  const applyImageUrl = (url) => {
    setImageUrl(url)
    setImageMode(null)
    setUrlInput('')
    setUrlError('')
  }

  const submitUrl = () => {
    const url = normalizeImageUrl(urlInput)
    if (!isValidGalleryImageUrl(url)) {
      setUrlError('Enter a valid image URL (Discord CDN, Imgur, or direct image link).')
      return
    }
    applyImageUrl(url)
  }

  const publish = async () => {
    if (!canPublish) return
    setPublishing(true)
    const res = await fetchNui('publishNewsArticle', {
      outletId: outletId ? Number(outletId) : undefined,
      headline: headline.trim(),
      body: body.trim(),
      imageUrl: imageUrl.trim() || undefined,
    })
    setPublishing(false)

    if (!res?.ok) {
      const msg = PUBLISH_ERRORS[res?.error] || 'Could not publish story.'
      notify('Weazel News', msg, 'error')
      return
    }

    notify('Weazel News', 'Story published', 'default')

    const selectedOutlet = outlets.find((o) => String(o.id) === outletId) || outlets[0]
    const published = res.article || {
      id: res.id,
      outlet_id: selectedOutlet?.id ?? 1,
      outlet_name: selectedOutlet?.name ?? 'Weazel News',
      headline: headline.trim(),
      body: body.trim(),
      excerpt:
        body.trim().length > 160 ? `${body.trim().slice(0, 160)}...` : body.trim(),
      author_label: bootstrap?.name || 'You',
      timeAgo: 'Just now',
      image_url: imageUrl.trim() || undefined,
    }

    onPublished?.(published)
  }

  return (
    <div className="news-compose">
      <header className="news-compose-header">
        <button type="button" className="news-detail-back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
        <h2>Publish Story</h2>
        <button
          type="button"
          className="news-compose-publish"
          disabled={!canPublish}
          onClick={publish}
          aria-label="Publish"
        >
          <Send size={18} strokeWidth={2} />
          {publishing ? '…' : 'Post'}
        </button>
      </header>

      <div className="news-compose-body">
        {outlets.length > 1 && (
          <label className="news-compose-field">
            <span>Outlet</span>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              disabled={publishing}
            >
              {outlets.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="news-compose-field">
          <span className="news-compose-label-row">
            Headline
            <em>{headlineCount}</em>
          </span>
          <input
            type="text"
            value={headline}
            maxLength={HEADLINE_MAX}
            placeholder="Breaking: headline here"
            disabled={publishing}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </label>

        <label className="news-compose-field news-compose-field-grow">
          <span className="news-compose-label-row">
            Story
            <em>{bodyCount}</em>
          </span>
          <textarea
            value={body}
            maxLength={BODY_MAX}
            placeholder="Write the full article…"
            disabled={publishing}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <div className="news-compose-media">
          <span>Photo (optional)</span>
          {imageUrl ? (
            <div className="news-compose-preview">
              <img src={imageUrl} alt="" />
              <button
                type="button"
                className="news-compose-remove-image"
                onClick={() => setImageUrl('')}
                aria-label="Remove image"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="news-compose-media-actions">
              <button type="button" onClick={() => setImageMode('gallery')} disabled={publishing}>
                <Image size={16} />
                Gallery
              </button>
              <button type="button" onClick={() => setImageMode('url')} disabled={publishing}>
                <Link2 size={16} />
                Link
              </button>
            </div>
          )}
        </div>
      </div>

      {imageMode === 'gallery' && (
        <div className="news-compose-sheet" role="dialog" aria-label="Choose from gallery">
          <div className="news-compose-sheet-head">
            <h3>Gallery</h3>
            <button type="button" onClick={() => setImageMode(null)} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="news-compose-sheet-content">
            {galleryLoading ? (
              <p className="news-compose-sheet-hint">Loading photos…</p>
            ) : gallery.length === 0 ? (
              <p className="news-compose-sheet-hint">No photos in your gallery yet.</p>
            ) : (
              <div className="news-compose-gallery">
                {gallery.map((photo) => (
                  <button
                    key={photo.id || photo.url}
                    type="button"
                    className="news-compose-gallery-item"
                    onClick={() => applyImageUrl(photo.url)}
                  >
                    <img src={photo.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {imageMode === 'url' && (
        <div className="news-compose-sheet" role="dialog" aria-label="Image from link">
          <div className="news-compose-sheet-head">
            <h3>Image link</h3>
            <button type="button" onClick={() => setImageMode(null)} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="news-compose-sheet-content">
            <input
              type="url"
              className="news-compose-url-input"
              placeholder="https://cdn.discordapp.com/attachments/..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setUrlError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitUrl()}
            />
            {urlError ? <p className="news-compose-sheet-error">{urlError}</p> : null}
            <button type="button" className="news-compose-url-submit" onClick={submitUrl}>
              Use image
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
