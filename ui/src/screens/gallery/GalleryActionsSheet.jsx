import {
  Copy,
  Image,
  MessageCircle,
  Pencil,
  Share2,
  Trash2,
  Users,
  Wallpaper,
  X,
} from 'lucide-react'
import { SOCIAL_APP_NAME } from '../../config/socialAppBranding'

export default function GalleryActionsSheet({
  photo,
  onClose,
  onRename,
  onSetWallpaper,
  onShareMessages,
  onShareChirp,
  onShareNearby,
  onCopyLink,
  onDelete,
}) {
  if (!photo) return null

  return (
    <div className="glry-sheet-root" role="presentation">
      <button type="button" className="glry-sheet-backdrop" onClick={onClose} aria-label="Close menu" />
      <div className="glry-sheet" role="dialog" aria-label="Photo actions">
        <div className="glry-sheet-handle" />
        <header className="glry-sheet-header">
          <h3>{photo.label || photo.name || 'Photo'}</h3>
          <button type="button" className="glry-sheet-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="glry-sheet-actions">
          <button type="button" className="glry-sheet-action" onClick={onRename}>
            <Pencil size={20} />
            <span>Rename</span>
          </button>
          <button type="button" className="glry-sheet-action" onClick={onSetWallpaper}>
            <Wallpaper size={20} />
            <span>Set as Wallpaper</span>
          </button>
          <button type="button" className="glry-sheet-action" onClick={onShareMessages}>
            <MessageCircle size={20} />
            <span>Share in Messages</span>
          </button>
          <button type="button" className="glry-sheet-action" onClick={onShareChirp}>
            <Share2 size={20} />
            <span>Share on {SOCIAL_APP_NAME}</span>
          </button>
          <button type="button" className="glry-sheet-action" onClick={onShareNearby}>
            <Users size={20} />
            <span>Share with Nearby</span>
          </button>
          <button type="button" className="glry-sheet-action" onClick={onCopyLink}>
            <Copy size={20} />
            <span>Copy Image Link</span>
          </button>
          <button type="button" className="glry-sheet-action glry-sheet-action-danger" onClick={onDelete}>
            <Trash2 size={20} />
            <span>Delete Photo</span>
          </button>
        </div>
        <div className="glry-sheet-preview">
          <Image size={16} />
          <span className="glry-sheet-url">{photo.url}</span>
        </div>
      </div>
    </div>
  )
}
