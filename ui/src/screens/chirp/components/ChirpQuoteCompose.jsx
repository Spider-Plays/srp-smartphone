import { User } from 'lucide-react'
import ChirpMediaAttachButton from './ChirpMediaAttachButton'
import ChirpQuotedPost from './ChirpQuotedPost'

export default function ChirpQuoteCompose({ quoteText, quoteImageUrl, quotedPost, onChange, onSubmit, onAttach, onRemoveImage }) {
  const len = quoteText.length
  const countClass = len > 260 ? (len > 280 ? 'over' : 'warn') : ''
  const canPost = Boolean(quoteText.trim() || quoteImageUrl || quotedPost)

  return (
    <div className="chirp-compose chirp-quote-compose">
      <div className="chirp-compose-body">
        <div className="chirp-compose-avatar">
          <User size={22} />
        </div>
        <div className="chirp-quote-compose-editor">
          <textarea
            className="chirp-compose-input"
            placeholder="Add a comment..."
            value={quoteText}
            onChange={(e) => onChange(e.target.value)}
            maxLength={280}
            autoFocus
          />
          {quoteImageUrl ? (
            <div className="chirp-compose-image-preview">
              <img src={quoteImageUrl} alt="Quote attachment" />
              <button type="button" className="chirp-media-attach-remove" onClick={onRemoveImage} aria-label="Remove image">
                ×
              </button>
            </div>
          ) : null}
          {quotedPost ? <ChirpQuotedPost post={quotedPost} compact /> : null}
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
