import { useState } from 'react'
import { X } from 'lucide-react'

export default function ChirpPostImage({ src, alt = 'Post image', compact = false, onClick }) {
  const [viewerOpen, setViewerOpen] = useState(false)
  if (!src) return null

  const openViewer = (e) => {
    e?.stopPropagation?.()
    if (onClick) {
      onClick(e)
      return
    }
    setViewerOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className={`chirp-post-image-wrap ${compact ? 'compact' : ''}`}
        onClick={openViewer}
        aria-label="View image"
      >
        <img src={src} alt={alt} className="chirp-post-image" loading="lazy" />
      </button>
      {viewerOpen && (
        <div className="chirp-image-viewer" role="presentation" onClick={() => setViewerOpen(false)}>
          <button
            type="button"
            className="chirp-image-viewer-close"
            onClick={() => setViewerOpen(false)}
            aria-label="Close"
          >
            <X size={22} />
          </button>
          <img src={src} alt={alt} className="chirp-image-viewer-img" />
        </div>
      )}
    </>
  )
}
