import { Image, X } from 'lucide-react'

export default function ChirpMediaAttachButton({ imageUrl, onAttach, onRemove, label = 'Attach image' }) {
  return (
    <div className="chirp-media-attach">
      {imageUrl ? (
        <div className="chirp-media-attach-preview">
          <img src={imageUrl} alt="Attachment preview" />
          <button type="button" className="chirp-media-attach-remove" onClick={onRemove} aria-label="Remove image">
            <X size={14} />
          </button>
        </div>
      ) : null}
      <button type="button" className="chirp-media-attach-btn" onClick={onAttach} aria-label={label} title={label}>
        <Image size={20} />
      </button>
    </div>
  )
}
