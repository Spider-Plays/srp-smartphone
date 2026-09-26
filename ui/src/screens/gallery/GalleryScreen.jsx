import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Camera,
  Check,
  CheckSquare,
  ImageIcon,
  LayoutGrid,
  Link2,
  Play,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import FoldEmpty from '../../components/FoldEmpty'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import { SOCIAL_APP_NAME } from '../../config/socialAppBranding'
import GalleryConfirmDialog from './GalleryConfirmDialog'
import GalleryImportDialog from './GalleryImportDialog'
import GalleryNearbyShare from './GalleryNearbyShare'
import GalleryViewer from './GalleryViewer'
import {
  filterPhotos,
  galleryImportErrorMessage,
  groupPhotosByDate,
  parseGalleryResponse,
  sortPhotos,
} from './utils'
import './gallery.css'

const GRID_COLS = 3

export default function GalleryScreen() {
  const {
    goBack,
    navigate,
    notify,
    bootstrap,
    setBootstrap,
    setWallpaperUrl,
    gallerySelectionMode,
    setGallerySelectionMode,
    galleryRevision,
    setAttachedImage,
    setPendingChirpImage,
    phoneFlipped,
    foldLayout,
  } = usePhone()
  const folded = phoneFlipped && foldLayout?.mode === 'span'

  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [search, setSearch] = useState('')
  const [manageMode, setManageMode] = useState(false)
  const [manageIds, setManageIds] = useState(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [nearbyPhoto, setNearbyPhoto] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadPhotos = useCallback(() => {
    setLoading(true)
    return fetchNui('getGallery')
      .then((data) => {
        const parsed = parseGalleryResponse(data)
        setPhotos(parsed.photos)
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos, galleryRevision])

  const visiblePhotos = useMemo(() => {
    const filtered = filterPhotos(photos, search)
    return sortPhotos(filtered, 'newest')
  }, [photos, search])

  const sections = useMemo(() => groupPhotosByDate(visiblePhotos), [visiblePhotos])

  const updatePhoto = (id, patch) => {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    setViewer((v) => (v?.id === id ? { ...v, ...patch } : v))
  }

  const removePhotos = (ids) => {
    const idSet = new Set(ids)
    setPhotos((list) => list.filter((p) => !idSet.has(p.id)))
    setViewer((v) => (v && idSet.has(v.id) ? null : v))
    setManageIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  const handleRename = async (id, label) => {
    const result = await fetchNui('renameGalleryPhoto', { id, label })
    if (result?.ok) {
      updatePhoto(id, { label: result.label || label })
      notify('Photos', 'Photo renamed.')
      return true
    }
    notify('Photos', 'Could not rename photo.', 'default')
    return false
  }

  const handleDelete = async (id) => {
    const result = await fetchNui('deleteGalleryPhotos', { ids: [id] })
    if (result?.ok) {
      removePhotos([id])
      notify('Photos', 'Photo deleted.')
      return true
    }
    notify('Photos', 'Could not delete photo.', 'default')
    return false
  }

  const handleShareChirp = (photo) => {
    setPendingChirpImage(photo.url)
    setViewer(null)
    navigate('chirp')
    notify(SOCIAL_APP_NAME, 'Opening compose with your photo.')
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(manageIds)
    if (!ids.length) return
    setBusy(true)
    try {
      const result = await fetchNui('deleteGalleryPhotos', { ids })
      if (result?.ok) {
        removePhotos(ids)
        setBulkDeleteOpen(false)
        setManageMode(false)
        notify('Photos', `${ids.length} photo${ids.length === 1 ? '' : 's'} deleted.`)
      } else {
        notify('Photos', 'Could not delete photos.', 'default')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleSetWallpaper = async (photo) => {
    if (photo.is_video) {
      notify('Photos', 'Only photos can be used as wallpaper.', 'default')
      return
    }
    setWallpaperUrl(photo.url)
    const settings = bootstrap?.settings || {}
    await fetchNui('saveSettings', {
      wallpaper: 'custom',
      ringtone: settings.ringtone,
      notifications: settings.notifications,
      phone_scale: settings.phone_scale,
    })
    setBootstrap((b) => ({
      ...b,
      settings: { ...b.settings, wallpaper: 'custom' },
    }))
    notify('Photos', 'Wallpaper updated.')
    setViewer(null)
  }

  const handleShareMessages = (photo) => {
    setAttachedImage({ url: photo.url, name: photo.label || photo.name })
    setViewer(null)
    navigate('messages')
  }

  const handleCopyLink = async (photo) => {
    try {
      await navigator.clipboard.writeText(photo.url)
      notify('Photos', 'Image link copied.')
    } catch {
      notify('Photos', photo.url.slice(0, 80), 'default')
    }
  }

  const handleImport = async ({ url, label }) => {
    const result = await fetchNui('importGalleryPhoto', { url, label })
    if (result?.ok) {
      await loadPhotos()
      setImportOpen(false)
      notify('Photos', 'Image imported to your library.')
      return { ok: true }
    }
    return result
  }

  const handleItemClick = (photo) => {
    if (gallerySelectionMode) {
      setSelected((prev) => (prev?.id === photo.id ? null : photo))
      return
    }
    if (manageMode) {
      setManageIds((prev) => {
        const next = new Set(prev)
        if (next.has(photo.id)) next.delete(photo.id)
        else next.add(photo.id)
        return next
      })
      return
    }
    setViewer(photo)
  }

  const confirmSelection = () => {
    if (!selected) return
    setAttachedImage({ url: selected.url, name: selected.label || selected.name })
    setGallerySelectionMode(false)
    goBack()
  }

  const handleBack = () => {
    if (manageMode) {
      setManageMode(false)
      setManageIds(new Set())
      return
    }
    if (gallerySelectionMode) setGallerySelectionMode(false)
    goBack()
  }

  const exitManageMode = () => {
    setManageMode(false)
    setManageIds(new Set())
    setBulkDeleteOpen(false)
  }

  const photoCountLabel = loading
    ? 'Loading…'
    : visiblePhotos.length === 0
      ? search.trim()
        ? 'No matches'
        : 'No photos'
      : search.trim()
        ? `${visiblePhotos.length} result${visiblePhotos.length === 1 ? '' : 's'}`
        : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`

  const headerTitle = gallerySelectionMode
    ? 'Select Photo'
    : manageMode
      ? manageIds.size
        ? `${manageIds.size} Selected`
        : 'Select Items'
      : 'Photos'

  const headerSubtitle = gallerySelectionMode
    ? 'Tap a photo to attach'
    : manageMode
      ? 'Tap photos to select'
      : photoCountLabel

  return (
    <AppScreen
      title={headerTitle}
      subtitle={headerSubtitle}
      onBack={handleBack}
      className="gallery-app glry-app"
      headerRight={
        gallerySelectionMode && selected ? (
          <button type="button" className="glry-confirm-btn" onClick={confirmSelection} aria-label="Confirm">
            <Check size={20} strokeWidth={2.5} />
          </button>
        ) : manageMode ? (
          <button
            type="button"
            className="glry-toolbar-btn glry-toolbar-btn-danger"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={manageIds.size === 0}
            aria-label="Delete selected"
          >
            <Trash2 size={18} />
          </button>
        ) : !loading && !gallerySelectionMode ? (
          <div className="glry-header-actions">
            <button
              type="button"
              className="glry-toolbar-btn"
              onClick={() => setImportOpen(true)}
              aria-label="Import from link"
              title="Import from link"
            >
              <Link2 size={18} />
            </button>
            {!manageMode && photos.length > 0 && (
              <button type="button" className="glry-toolbar-btn" onClick={() => setManageMode(true)} aria-label="Select photos">
                <CheckSquare size={18} />
              </button>
            )}
          </div>
        ) : null
      }
      layer={
        <>
          {folded && !(viewer && !gallerySelectionMode && !manageMode) && (
            <div className="fold-detail-dock">
              <FoldEmpty title="Select a photo" subtitle="Photos you open show up on this screen." />
            </div>
          )}
          {viewer && !gallerySelectionMode && !manageMode && (
            <GalleryViewer
              photos={visiblePhotos}
              photo={viewer}
              onClose={() => setViewer(null)}
              onRename={handleRename}
              onDelete={handleDelete}
              onSetWallpaper={handleSetWallpaper}
              onShareMessages={handleShareMessages}
              onShareChirp={handleShareChirp}
              onShareNearby={(photo) => setNearbyPhoto(photo)}
              onCopyLink={handleCopyLink}
            />
          )}
          {bulkDeleteOpen && (
            <GalleryConfirmDialog
              title={`Delete ${manageIds.size} photo${manageIds.size === 1 ? '' : 's'}?`}
              message="Selected photos will be permanently removed from your library."
              confirmLabel="Delete"
              danger
              busy={busy}
              onCancel={() => setBulkDeleteOpen(false)}
              onConfirm={handleBulkDelete}
            />
          )}
          {importOpen && (
            <GalleryImportDialog
              busy={busy}
              onClose={() => !busy && setImportOpen(false)}
              onImport={async (payload) => {
                setBusy(true)
                try {
                  const result = await handleImport(payload)
                  if (!result?.ok && result?.error) {
                    notify('Photos', galleryImportErrorMessage(result.error), 'default')
                  }
                  return result
                } finally {
                  setBusy(false)
                }
              }}
            />
          )}
          {nearbyPhoto && (
            <GalleryNearbyShare
              photo={nearbyPhoto}
              busy={busy}
              onClose={() => setNearbyPhoto(null)}
              onShared={(person) => {
                setNearbyPhoto(null)
                notify('Photos', `Photo sent to ${person.name || person.phone}.`)
              }}
            />
          )}
        </>
      }
      footer={
        gallerySelectionMode && selected ? (
          <div className="glry-selection-bar">
            <div className="glry-selection-preview">
              <img src={selected.url} alt="" />
            </div>
            <div className="glry-selection-copy">
              <span className="glry-selection-title">Selected</span>
              <span className="glry-selection-name">{selected.label || selected.name || 'Photo'}</span>
            </div>
            <button type="button" className="glry-selection-use" onClick={confirmSelection}>
              Use Photo
            </button>
          </div>
        ) : manageMode ? (
          <div className="glry-manage-bar">
            <button type="button" className="glry-manage-cancel" onClick={exitManageMode}>
              Cancel
            </button>
            <span>{manageIds.size} selected</span>
            <button
              type="button"
              className="glry-manage-delete"
              disabled={manageIds.size === 0}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete
            </button>
          </div>
        ) : null
      }
    >
      <div className="glry-library-shell">
        {!loading && photos.length > 0 && !gallerySelectionMode && (
          <div className="glry-search-bar">
            <div className="glry-search-wrap">
              <Search size={16} className="glry-search-icon" />
              <input
                type="search"
                className="glry-search-input"
                placeholder="Search photos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="glry-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`glry-library ${loading ? 'is-loading' : ''}`}>
          {loading ? (
            <div className="glry-empty">
              <div className="glry-empty-icon glry-shimmer">
                <LayoutGrid size={40} />
              </div>
              <p>Loading your library…</p>
            </div>
          ) : visiblePhotos.length === 0 ? (
            <div className="glry-empty">
              <div className="glry-empty-icon">
                <ImageIcon size={44} strokeWidth={1.5} />
              </div>
              <h2 className="glry-empty-title">{search.trim() ? 'No matches' : 'No photos yet'}</h2>
              <p className="glry-empty-text">
                {search.trim()
                  ? 'Try a different search term.'
                  : "Capture moments in the Camera app — they'll show up here."}
              </p>
              {!gallerySelectionMode && !search.trim() && (
                <div className="glry-empty-actions">
                  <button type="button" className="glry-empty-cta" onClick={() => navigate('camera')}>
                    <Camera size={18} />
                    Open Camera
                  </button>
                  <button type="button" className="glry-empty-cta glry-empty-cta-secondary" onClick={() => setImportOpen(true)}>
                    <Link2 size={18} />
                    Import from Link
                  </button>
                </div>
              )}
            </div>
          ) : (
            sections.map((section) => (
              <section key={String(section.key)} className="glry-section">
                <header className="glry-section-header">
                  <h2>{section.label}</h2>
                  <span>{section.photos.length}</span>
                </header>
                <div className="glry-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
                  {section.photos.map((photo) => {
                    const isAttachSelected = selected?.id === photo.id
                    const isManageSelected = manageIds.has(photo.id)
                    const isSelected = gallerySelectionMode ? isAttachSelected : isManageSelected
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        className={`glry-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleItemClick(photo)}
                        aria-pressed={gallerySelectionMode || manageMode ? isSelected : undefined}
                      >
                        {photo.is_video ? (
                          <>
                            <video
                              src={photo.url}
                              className="glry-tile-media glry-tile-video"
                              muted
                              playsInline
                              preload="metadata"
                              draggable={false}
                            />
                            <span className="glry-tile-play" aria-hidden="true">
                              <Play size={18} fill="currentColor" />
                            </span>
                          </>
                        ) : (
                          <img
                            src={photo.url}
                            alt={photo.label || photo.name || 'Photo'}
                            className="glry-tile-media"
                            loading="lazy"
                            draggable={false}
                          />
                        )}
                        {(gallerySelectionMode || manageMode) && (
                          <span className={`glry-tile-check ${isSelected ? 'is-on' : ''}`}>
                            {isSelected && <Check size={16} strokeWidth={3} />}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </AppScreen>
  )
}
