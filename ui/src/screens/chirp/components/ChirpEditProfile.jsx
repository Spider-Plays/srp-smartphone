import { Camera, User } from 'lucide-react'
import ChirpVerifiedBadge from './ChirpVerifiedBadge'
import { SOCIAL_APP_NAME } from '../../../config/socialAppBranding'

export default function ChirpEditProfile({
  user,
  editName,
  editBio,
  editAvatarUrl,
  editBannerUrl,
  verified,
  verificationPrice,
  buyingVerification,
  onEditName,
  onEditBio,
  onPickAvatar,
  onPickBanner,
  onSave,
  onBuyVerification,
  onLogout,
}) {
  const priceLabel = `$${Number(verificationPrice || 0).toLocaleString()}`

  return (
    <div className="chirp-edit-profile">
      <button
        type="button"
        className="chirp-edit-banner"
        style={editBannerUrl ? { backgroundImage: `url(${editBannerUrl})` } : undefined}
        onClick={onPickBanner}
        aria-label="Change banner photo"
      >
        <span className="chirp-edit-banner-overlay">
          <Camera size={28} />
        </span>
      </button>
      <div className="chirp-edit-avatar-block">
        <button type="button" className="avatar chirp-edit-avatar-btn" onClick={onPickAvatar} aria-label="Change profile photo">
          {editAvatarUrl ? <img src={editAvatarUrl} alt="" /> : <User size={40} />}
        </button>
        <button type="button" className="chirp-edit-avatar-overlay" onClick={onPickAvatar} aria-label="Change profile photo">
          <Camera size={24} />
        </button>
      </div>

      <div className="chirp-edit-form">
        <div className="chirp-edit-field">
          <label htmlFor="chirp-name">Name</label>
          <input
            id="chirp-name"
            type="text"
            placeholder="Your name"
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
          />
        </div>
        <div className="chirp-edit-field">
          <label htmlFor="chirp-username">Username</label>
          <input id="chirp-username" type="text" value={user?.username || ''} disabled />
        </div>
        <div className="chirp-edit-field">
          <label htmlFor="chirp-bio">Bio</label>
          <textarea
            id="chirp-bio"
            placeholder="Tell the world about yourself"
            value={editBio}
            onChange={(e) => onEditBio(e.target.value)}
            maxLength={160}
            rows={4}
          />
          <div className="chirp-edit-counter">{editBio.length}/160</div>
        </div>

        <div className="chirp-verification-card">
          <div className="chirp-verification-copy">
            <ChirpVerifiedBadge size={20} />
            <div>
              <strong>Verification badge</strong>
              <p>{verified ? 'Your account is verified.' : `Get the blue badge for ${priceLabel} from your bank.`}</p>
            </div>
          </div>
          {verified ? (
            <span className="chirp-verification-owned">Verified</span>
          ) : (
            <button
              type="button"
              className="chirp-x-post-btn chirp-verification-buy-btn"
              onClick={onBuyVerification}
              disabled={buyingVerification}
            >
              {buyingVerification ? 'Processing...' : `Buy for ${priceLabel}`}
            </button>
          )}
        </div>

        <div className="chirp-edit-actions">
          <button type="button" className="chirp-auth-primary" onClick={onSave}>
            Save
          </button>
          <button type="button" className="chirp-edit-logout" onClick={onLogout}>
            Log out of {SOCIAL_APP_NAME}
          </button>
        </div>
      </div>
    </div>
  )
}
