import { User } from 'lucide-react'
import ChirpMediaAttachButton from './ChirpMediaAttachButton'

export default function ChirpCompose({ postText, imageUrl, onChange, onSubmit, onAttach, onRemoveImage }) {
  const len = postText.length
  const countClass = len > 260 ? (len > 280 ? 'over' : 'warn') : ''
  const canPost = Boolean(postText.trim() || imageUrl)

  return (
    <div className="chirp-compose">
      <div className="chirp-compose-body">
        <div className="chirp-compose-avatar">
          <User size={22} />
        </div>
        <div className="chirp-compose-editor">
          <textarea
            className="chirp-compose-input"
            placeholder="What's happening?"
            value={postText}
            onChange={(e) => onChange(e.target.value)}
            maxLength={280}
            autoFocus
          />
          {imageUrl ? (
            <div className="chirp-compose-image-preview">
              <img src={imageUrl} alt="Post attachment" />
              <button type="button" className="chirp-media-attach-remove" onClick={onRemoveImage} aria-label="Remove image">
                ×
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="chirp-compose-footer">
        <div className="chirp-compose-tools">
          <ChirpMediaAttachButton imageUrl={null} onAttach={onAttach} onRemove={() => {}} label="Attach image" />
        </div>
        <div className="chirp-compose-meta">
          <span className={`chirp-compose-count ${countClass}`}>{len}/280</span>
          <button type="button" className="chirp-x-post-btn" onClick={onSubmit} disabled={!canPost}>
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
