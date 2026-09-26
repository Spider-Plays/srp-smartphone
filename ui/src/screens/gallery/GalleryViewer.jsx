import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react'
import GalleryActionsSheet from './GalleryActionsSheet'
import GalleryConfirmDialog from './GalleryConfirmDialog'
import GalleryRenameDialog from './GalleryRenameDialog'
import GalleryZoomImage from './GalleryZoomImage'
import { formatPhotoTime } from './utils'

export default function GalleryViewer({
  photos,
  photo,
  onClose,
  onRename,
  onDelete,
  onSetWallpaper,
  onShareMessages,
  onShareChirp,
  onShareNearby,
  onCopyLink,
}) {
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((p) => p.id === photo.id)))
  const [chromeVisible, setChromeVisible] = useState(true)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const touchRef = useRef({ x: 0, y: 0 })

  const current = photos[index] ?? photo

  useEffect(() => {
    setIndex(Math.max(0, photos.findIndex((p) => p.id === photo.id)))
  }, [photo.id, photos])

  useEffect(() => {
    setActionsOpen(false)
    setRenameOpen(false)
    setDeleteOpen(false)
  }, [current.id])

  const goPrev = () => {
    if (index > 0) setIndex(index - 1)
  }

  const goNext = () => {
    if (index < photos.length - 1) setIndex(index + 1)
  }

  const toggleChrome = (event) => {
    if (event.target.closest('button')) return
    setChromeVisible((v) => !v)
  }

  const handleTouchStart = (e) => {
    const touch = e.changedTouches[0]
    touchRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchRef.current.x
    const dy = touch.clientY - touchRef.current.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    if (dx > 0) goPrev()
    else goNext()
  }

  const handleRenameSave = async (label) => {
    setBusy(true)
    try {
      const ok = await onRename?.(current.id, label)
      if (ok) setRenameOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setBusy(true)
    try {
      const ok = await onDelete?.(current.id)
      if (ok) {
        if (photos.length <= 1) {
          onClose()
          return
        }
        if (index >= photos.length - 1) setIndex(Math.max(0, index - 1))
        setDeleteOpen(false)
        setActionsOpen(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glry-viewer" role="dialog" aria-label="Photo viewer">
      <div className={`glry-viewer-chrome glry-viewer-top ${chromeVisible ? 'visible' : ''}`}>
        <button type="button" className="glry-viewer-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
        <div className="glry-viewer-meta">
          <span className="glry-viewer-counter">
            {index + 1} of {photos.length}
          </span>
          {current.created_at && (
            <span className="glry-viewer-time">{formatPhotoTime(current.created_at)}</span>
          )}
        </div>
        <button
          type="button"
          className="glry-viewer-more"
          onClick={() => setActionsOpen(true)}
          aria-label="Photo options"
        >
          <MoreHorizontal size={22} />
        </button>
      </div>

      <div
        className="glry-viewer-stage"
        onClick={toggleChrome}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="presentation"
      >
        {index > 0 && (
          <button
            type="button"
            className="glry-viewer-nav glry-viewer-nav-prev"
            onClick={goPrev}
            aria-label="Previous photo"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {current.is_video ? (
          <video
            key={current.id}
            src={current.url}
            className="glry-viewer-image glry-viewer-video"
            controls
            playsInline
            autoPlay
            loop
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <GalleryZoomImage
            src={current.url}
            alt={current.label || current.name || 'Photo'}
            className="glry-viewer-image"
            onTap={toggleChrome}
          />
        )}

        {index < photos.length - 1 && (
          <button
            type="button"
            className="glry-viewer-nav glry-viewer-nav-next"
            onClick={goNext}
            aria-label="Next photo"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      <div className={`glry-viewer-chrome glry-viewer-bottom ${chromeVisible ? 'visible' : ''}`}>
        <p className="glry-viewer-label">{current.label || current.name || 'Photo'}</p>
      </div>

      {actionsOpen && (
        <GalleryActionsSheet
          photo={current}
          onClose={() => setActionsOpen(false)}
          onRename={() => {
            setActionsOpen(false)
            setRenameOpen(true)
          }}
          onSetWallpaper={() => {
            setActionsOpen(false)
            onSetWallpaper?.(current)
          }}
          onShareMessages={() => {
            setActionsOpen(false)
            onShareMessages?.(current)
          }}
          onShareChirp={() => {
            setActionsOpen(false)
            onShareChirp?.(current)
          }}
          onShareNearby={() => {
            setActionsOpen(false)
            onShareNearby?.(current)
          }}
          onCopyLink={() => {
            setActionsOpen(false)
            onCopyLink?.(current)
          }}
          onDelete={() => {
            setActionsOpen(false)
            setDeleteOpen(true)
          }}
        />
      )}

      {renameOpen && (
        <GalleryRenameDialog
          photo={current}
          onClose={() => setRenameOpen(false)}
          onSave={handleRenameSave}
          saving={busy}
        />
      )}

      {deleteOpen && (
        <GalleryConfirmDialog
          title="Delete Photo?"
          message="This photo will be permanently removed from your library."
          confirmLabel="Delete"
          danger
          busy={busy}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}
