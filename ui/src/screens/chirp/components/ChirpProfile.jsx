import { Calendar, MapPin, User } from 'lucide-react'
import { useState } from 'react'
import { formatCount } from '../utils'
import ChirpVerifiedBadge from './ChirpVerifiedBadge'

export default function ChirpProfile({
  profile,
  isOwnProfile,
  profileTab,
  onTabChange,
  onFollow,
  onEdit,
  renderPost,
  userPosts,
}) {
  const [tab, setTab] = useState(profileTab || 'posts')
  const activeTab = profileTab ?? tab

  const handleTab = (next) => {
    setTab(next)
    onTabChange?.(next)
  }

  return (
    <div className="chirp-profile">
      <div
        className="chirp-profile-banner"
        style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}
      />
      <div className="chirp-profile-top">
        <div className="chirp-profile-avatar-wrap">
          <div className="chirp-profile-avatar">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <User size={36} />}
          </div>
          <div className="chirp-profile-actions">
            {isOwnProfile ? (
              <button type="button" className="chirp-x-post-btn outline" onClick={onEdit}>
                Edit profile
              </button>
            ) : (
              <button
                type="button"
                className={`chirp-x-follow-btn ${profile.isFollowing ? 'following' : ''}`}
                onClick={() => onFollow(profile.username)}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <h1 className="chirp-profile-name">
          {profile.name}
          {profile.verified ? <ChirpVerifiedBadge size={20} /> : null}
        </h1>
        <p className="chirp-profile-handle">{profile.username}</p>
        {profile.bio ? <p className="chirp-profile-bio">{profile.bio}</p> : null}

        <div className="chirp-profile-meta">
          <span>
            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Los Santos
          </span>
          <span>
            <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Joined March 2024
          </span>
        </div>

        <div className="chirp-profile-counts">
          <span>
            <strong>{formatCount(profile.following)}</strong> Following
          </span>
          <span>
            <strong>{formatCount(profile.followers)}</strong> Followers
          </span>
        </div>
      </div>

      <div className="chirp-profile-tabs">
        <button
          type="button"
          className={`chirp-profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => handleTab('posts')}
        >
          Posts
        </button>
        <button
          type="button"
          className={`chirp-profile-tab ${activeTab === 'replies' ? 'active' : ''}`}
          onClick={() => handleTab('replies')}
        >
          Replies
        </button>
        <button
          type="button"
          className={`chirp-profile-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => handleTab('media')}
        >
          Media
        </button>
        <button
          type="button"
          className={`chirp-profile-tab ${activeTab === 'likes' ? 'active' : ''}`}
          onClick={() => handleTab('likes')}
        >
          Likes
        </button>
      </div>

      <div className="chirp-profile-posts">
        {activeTab === 'posts' &&
          (userPosts.length === 0 ? (
            <div className="chirp-profile-empty">
              <h3>No posts yet</h3>
              <p>When they post, it&apos;ll show up here.</p>
            </div>
          ) : (
            userPosts.map((post) => renderPost(post))
          ))}
        {activeTab === 'replies' && (
          <div className="chirp-profile-empty">
            <h3>No replies yet</h3>
            <p>Replies will appear here.</p>
          </div>
        )}
        {(activeTab === 'media' || activeTab === 'likes') && (
          <div className="chirp-profile-empty">
            <h3>Nothing to see here — yet</h3>
            <p>Content will show up when available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
