const DAY_MS = 86400000

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function normalizeGalleryPhoto(photo) {
  if (!photo) return photo
  const isVideo = photo.media_type === 'video' || photo.is_video === 1 || photo.is_video === true
  return { ...photo, is_video: isVideo, media_type: isVideo ? 'video' : 'photo' }
}

export function formatSectionLabel(dateInput) {
  if (!dateInput) return 'Recent'
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return 'Recent'

  const today = startOfDay(Date.now())
  const day = startOfDay(date)

  if (day === today) return 'Today'
  if (day === today - DAY_MS) return 'Yesterday'

  const weekAgo = today - DAY_MS * 7
  if (day >= weekAgo) {
    return date.toLocaleDateString([], { weekday: 'long' })
  }

  const year = date.getFullYear()
  const currentYear = new Date().getFullYear()
  if (year === currentYear) {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' })
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

export function filterPhotos(photos, query) {
  const q = query.trim().toLowerCase()
  if (!q) return photos
  return photos.filter((p) => {
    const label = (p.label || p.name || '').toLowerCase()
    return label.includes(q)
  })
}

export function sortPhotos(photos, order = 'newest') {
  const list = [...photos]
  list.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id
    const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id
    return order === 'oldest' ? aTime - bTime : bTime - aTime
  })
  return list
}

export function groupPhotosByDate(photos) {
  if (!photos?.length) return []

  const groups = new Map()

  for (const photo of photos) {
    const key = photo.created_at ? startOfDay(photo.created_at) : 'recent'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatSectionLabel(photo.created_at),
        photos: [],
      })
    }
    groups.get(key).photos.push(photo)
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === 'recent') return -1
    if (b.key === 'recent') return 1
    return b.key - a.key
  })
}

export function formatPhotoTime(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function normalizeImageUrl(url) {
  return typeof url === 'string' ? url.trim() : ''
}

export function isValidGalleryImageUrl(url) {
  const trimmed = normalizeImageUrl(url)
  if (!trimmed || trimmed.length > 2048) return false
  if (!/^https?:\/\//i.test(trimmed)) return false
  if (/discord(app)?\.(com|net)/i.test(trimmed)) return true
  if (/fivemanage\.com/i.test(trimmed) || /r2\.fivemanage/i.test(trimmed)) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg|webm|mp4)(\?|$)/i.test(trimmed) || /\/attachments\//i.test(trimmed)
}

export function galleryImportErrorMessage(error) {
  switch (error) {
    case 'gallery_full':
      return 'Gallery is full. Delete photos to import more.'
    case 'invalid_url':
      return 'Use a direct image link (https://…).'
    case 'invalid':
      return 'Enter a valid image URL.'
    case 'insert_failed':
      return 'Could not save the image.'
    case 'no_player':
      return 'Could not verify your character.'
    default:
      return 'Import failed. Try another link.'
  }
}

export function parseGalleryResponse(data) {
  if (Array.isArray(data)) {
    return { photos: data.map(normalizeGalleryPhoto) }
  }
  return { photos: (data?.photos || []).map(normalizeGalleryPhoto) }
}
