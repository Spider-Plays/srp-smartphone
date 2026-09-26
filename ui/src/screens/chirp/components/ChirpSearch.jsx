import { Search, User } from 'lucide-react'
import { useState } from 'react'
import { formatCount } from '../utils'

import { SOCIAL_APP_NAME } from '../../../config/socialAppBranding'

export default function ChirpSearch({
  searchQuery,
  searchResults,
  onSearch,
  onOpenProfile,
  onFollow,
}) {
  const [tab, setTab] = useState('people')

  return (
    <div className="chirp-search-wrap">
      <div className="chirp-search-input-wrap">
        <Search size={18} />
        <input
          type="text"
          placeholder={`Search ${SOCIAL_APP_NAME}`}
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="chirp-search-tabs">
        <button
          type="button"
          className={`chirp-search-tab ${tab === 'top' ? 'active' : ''}`}
          onClick={() => setTab('top')}
        >
          Top
        </button>
        <button
          type="button"
          className={`chirp-search-tab ${tab === 'people' ? 'active' : ''}`}
          onClick={() => setTab('people')}
        >
          People
        </button>
      </div>

      <div className="chirp-search-list">
        {searchQuery.trim() === '' ? (
          <div className="chirp-x-empty">
            <Search size={40} />
            <p>Try searching for people</p>
          </div>
        ) : tab === 'top' ? (
          <div className="chirp-x-empty">
            <p>Top results for &quot;{searchQuery}&quot;</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="chirp-x-empty">
            <User size={40} />
            <p>No people found</p>
          </div>
        ) : (
          searchResults.map((result) => (
            <div key={result.username} className="chirp-search-user">
              <div
                className="chirp-search-user-avatar"
                onClick={() => onOpenProfile(result.username)}
                role="presentation"
              >
                <User size={22} />
              </div>
              <div className="chirp-search-user-body">
                <div className="chirp-search-user-top">
                  <div
                    onClick={() => onOpenProfile(result.username)}
                    role="presentation"
                    style={{ minWidth: 0, cursor: 'pointer' }}
                  >
                    <div className="chirp-search-user-name">{result.author}</div>
                    <div className="chirp-search-user-handle">{result.username}</div>
                  </div>
                  <button
                    type="button"
                    className={`chirp-x-follow-btn small ${result.isFollowing ? 'following' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onFollow(result.username)
                    }}
                  >
                    {result.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
                {result.bio ? <div className="chirp-search-user-bio">{result.bio}</div> : null}
                <div className="chirp-profile-counts" style={{ marginTop: 6 }}>
                  <span>
                    <strong>{formatCount(result.following)}</strong> Following
                  </span>
                  <span>
                    <strong>{formatCount(result.followers)}</strong> Followers
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
