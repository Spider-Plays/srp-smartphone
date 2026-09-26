import { User } from 'lucide-react'

export default function ChirpQuotedPost({ post, compact = false, onClick }) {
  if (!post) return null

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation()
      onClick(post)
    }
  }

  return (
    <div
      className={`chirp-quote-embed ${compact ? 'compact' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(post)
              }
            }
          : undefined
      }
    >
      <div className="chirp-quote-embed-header">
        <span className="chirp-quote-embed-avatar">
          <User size={compact ? 14 : 16} />
        </span>
        <span className="chirp-quote-embed-name">{post.author}</span>
        <span className="chirp-quote-embed-handle">{post.username}</span>
      </div>
      <p className="chirp-quote-embed-text">{post.content}</p>
    </div>
  )
}
