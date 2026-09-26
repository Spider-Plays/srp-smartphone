import { PenLine, Repeat2 } from 'lucide-react'
import ChirpModalPortal from '../ChirpModalPortal'

export default function ChirpRepostMenu({ post, onRepost, onUndoRepost, onQuote, onClose }) {
  return (
    <ChirpModalPortal>
      <div className="chirp-repost-overlay" role="presentation">
        <button type="button" className="chirp-repost-backdrop" onClick={onClose} aria-label="Close" />
        <div className="chirp-repost-menu" role="dialog" aria-label="Repost options">
          {post.isReposted ? (
            <button
              type="button"
              className="chirp-repost-option undo"
              onClick={() => {
                onUndoRepost(post.id)
                onClose()
              }}
            >
              <span className="chirp-repost-option-icon">
                <Repeat2 size={20} />
              </span>
              <span className="chirp-repost-option-text">
                <strong>Undo repost</strong>
                <small>Remove from your timeline</small>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="chirp-repost-option"
              onClick={() => {
                onRepost(post.id)
                onClose()
              }}
            >
              <span className="chirp-repost-option-icon">
                <Repeat2 size={20} />
              </span>
              <span className="chirp-repost-option-text">
                <strong>Repost</strong>
                <small>Share to your timeline</small>
              </span>
            </button>
          )}
          <button
            type="button"
            className="chirp-repost-option"
            onClick={() => {
              onQuote(post)
              onClose()
            }}
          >
            <span className="chirp-repost-option-icon">
              <PenLine size={20} />
            </span>
            <span className="chirp-repost-option-text">
              <strong>Quote</strong>
              <small>Add your thoughts</small>
            </span>
          </button>
        </div>
      </div>
    </ChirpModalPortal>
  )
}
