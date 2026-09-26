import { Heart, MessageCircle, Repeat2, Share, User } from 'lucide-react'
import { formatCount } from '../utils'
import ChirpMediaAttachButton from './ChirpMediaAttachButton'
import ChirpPostImage from './ChirpPostImage'
import ChirpQuotedPost from './ChirpQuotedPost'
import ChirpVerifiedBadge from './ChirpVerifiedBadge'

export default function ChirpPostDetail({
  post,
  comments,
  commentsLoading,
  replyText,
  replyImageUrl,
  replyInputRef,
  onReplyText,
  onSubmitReply,
  onAttachReply,
  onRemoveReplyImage,
  onLike,
  onOpenRepostMenu,
  onOpenProfile,
  onFocusReply,
  onOpenQuotedPost,
}) {
  const canReply = Boolean(replyText.trim() || replyImageUrl)

  return (
    <div className="chirp-thread">
      <div className="chirp-thread-scroll">
        <article className="chirp-thread-main">
          <div className="chirp-thread-author-row">
            <div
              className="chirp-thread-avatar"
              onClick={() => onOpenProfile(post.username)}
              role="presentation"
            >
              {post.avatarUrl ? <img src={post.avatarUrl} alt="" /> : <User size={22} />}
            </div>
            <div className="chirp-thread-names">
              <div className="name">
                {post.author}
                {post.verified ? <ChirpVerifiedBadge size={16} /> : null}
              </div>
              <div className="handle">{post.username}</div>
            </div>
          </div>
          <div className="chirp-thread-body">
            {post.content ? <p className="chirp-thread-text">{post.content}</p> : null}
            {post.quotePost ? (
              <ChirpQuotedPost post={post.quotePost} onClick={onOpenQuotedPost} />
            ) : null}
            {post.imageUrl ? <ChirpPostImage src={post.imageUrl} /> : null}
          </div>
          <div className="chirp-thread-meta">{post.timestamp}</div>
        </article>

        <div className="chirp-thread-stats">
          <span>
            <strong>{formatCount(post.reposts)}</strong> Reposts
          </span>
          <span>
            <strong>{formatCount(post.likes)}</strong> Likes
          </span>
          <span>
            <strong>{formatCount(post.comments)}</strong> Replies
          </span>
        </div>

        <div className="chirp-thread-actions">
          <button type="button" className="chirp-action-btn-large reply-btn" onClick={onFocusReply} aria-label="Reply">
            <MessageCircle size={22} />
          </button>
          <button
            type="button"
            className={`chirp-action-btn-large ${post.isReposted ? 'reposted' : ''}`}
            onClick={() => onOpenRepostMenu(post)}
            aria-label="Repost"
          >
            <Repeat2 size={22} />
          </button>
          <button
            type="button"
            className={`chirp-action-btn-large ${post.isLiked ? 'liked' : ''}`}
            onClick={() => onLike(post.id)}
            aria-label="Like"
          >
            <Heart size={22} fill={post.isLiked ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="chirp-action-btn-large" aria-label="Share">
            <Share size={22} />
          </button>
        </div>

        <h3 className="chirp-replies-heading">Replies</h3>
        {commentsLoading ? (
          <div className="chirp-x-empty">
            <p>Loading replies...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="chirp-x-empty">
            <p>No replies yet. Start the conversation.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="chirp-reply-row">
              <div
                className="comment-avatar"
                onClick={() => onOpenProfile(comment.username)}
                role="presentation"
              >
                <User size={18} />
              </div>
              <div className="chirp-reply-content">
                <div className="chirp-reply-line">
                  <span className="author-name">
                    {comment.author}
                    {comment.verified ? <ChirpVerifiedBadge size={14} /> : null}
                  </span>
                  <span className="author-username">{comment.username}</span>
                  <span className="dot">·</span>
                  <span className="post-time">{comment.timestamp}</span>
                </div>
                {comment.content ? <p className="chirp-reply-text">{comment.content}</p> : null}
                {comment.imageUrl ? <ChirpPostImage src={comment.imageUrl} compact /> : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="chirp-thread-reply-bar">
        {replyImageUrl ? (
          <div className="chirp-reply-image-preview">
            <img src={replyImageUrl} alt="Reply attachment" />
            <button type="button" onClick={onRemoveReplyImage} aria-label="Remove image">
              ×
            </button>
          </div>
        ) : null}
        <div className="chirp-thread-reply-row">
          <ChirpMediaAttachButton imageUrl={null} onAttach={onAttachReply} onRemove={() => {}} label="Attach image" />
          <textarea
          ref={replyInputRef}
          placeholder="Post your reply"
          value={replyText}
          onChange={(e) => onReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmitReply()
            }
          }}
          maxLength={280}
          rows={1}
        />
          <button type="button" className="reply-btn-submit" onClick={onSubmitReply} disabled={!canReply}>
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}
