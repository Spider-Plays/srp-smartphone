import {
  ChevronLeft,
  ChevronRight,
  Square,
  Play,
  Save,
  Pencil,
  Share2,
  Phone,
  MessageCircle,
  User,
  Image,
  CornerUpLeft,
} from 'lucide-react'
import { formatPhone } from '../../utils/streamerMode'

export function SettingsHeader({ title, onBack }) {
  return (
    <header className="cyber-settings-header">
      {onBack && (
        <button type="button" className="cyber-back-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
      )}
      <h1 className="cyber-settings-title">{title}</h1>
    </header>
  )
}

export function MenuRow({ icon: Icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      className={`cyber-settings-menu-row${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="cyber-menu-icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="cyber-menu-label">{label}</span>
      <ChevronRight size={18} className="cyber-menu-chevron" />
    </button>
  )
}

export function DiamondToggle({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`cyber-diamond-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="cyber-diamond-toggle-track">
        <span className="cyber-diamond-toggle-thumb" />
      </span>
    </button>
  )
}

export function ToggleCard({ icon: Icon, title, subtitle, checked, onChange }) {
  return (
    <div className="cyber-settings-card cyber-toggle-card">
      <span className="cyber-card-icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="cyber-card-text">
        <strong>{title}</strong>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <DiamondToggle checked={checked} onChange={onChange} ariaLabel={title} />
    </div>
  )
}

export function VolumeSlider({ label, value, onChange, icon: Icon }) {
  return (
    <div className="cyber-settings-card cyber-volume-card">
      <div className="cyber-volume-top">
        {Icon && (
          <span className="cyber-card-icon">
            <Icon size={20} strokeWidth={2} />
          </span>
        )}
        <strong className="cyber-volume-label">{label}</strong>
        <span className="cyber-volume-value">{value}%</span>
      </div>
      <div className="cyber-volume-slider-wrap">
        <input
          type="range"
          className="cyber-volume-slider"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--volume-progress': `${value}%` }}
        />
      </div>
    </div>
  )
}

export function NavRow({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button type="button" className="cyber-settings-card cyber-nav-row" onClick={onClick}>
      <span className="cyber-card-icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="cyber-card-text">
        <strong>{title}</strong>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <ChevronRight size={18} className="cyber-menu-chevron" />
    </button>
  )
}

export function RadioRow({ label, selected, playing, onSelect, onPlayToggle }) {
  return (
    <div className={`cyber-settings-card cyber-radio-row ${selected ? 'is-selected' : ''}`}>
      <button type="button" className="cyber-radio-btn" onClick={onSelect} aria-label={`Select ${label}`}>
        <span className={`cyber-radio-dot ${selected ? 'is-selected' : ''}`} />
      </button>
      <span className="cyber-radio-label">{label}</span>
      <button
        type="button"
        className="cyber-play-btn"
        onClick={onPlayToggle}
        aria-label={playing ? `Stop ${label}` : `Play ${label}`}
      >
        {playing ? <Square size={12} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
    </div>
  )
}

export function SectionLabel({ children }) {
  return <h3 className="cyber-section-label">{children}</h3>
}

export function SaveIconButton({ onClick, ariaLabel = 'Save' }) {
  return (
    <button type="button" className="cyber-icon-btn cyber-save-icon-btn" onClick={onClick} aria-label={ariaLabel}>
      <Save size={18} />
    </button>
  )
}

export function SimCardPanel({
  legalName,
  citizenId,
  apartment,
  cardName,
  phone,
  avatarUrl,
  onEdit,
  onShare,
  onCall,
  onMessage,
}) {
  return (
    <div className="cyber-sim-screen">
      <div className="cyber-profile-block">
        <h2 className="cyber-profile-name">{legalName.toUpperCase()}</h2>
        <div className="cyber-profile-grid">
          <div>
            <span className="cyber-profile-label">Citizen ID</span>
            <span className="cyber-profile-value">{citizenId}</span>
          </div>
          <div>
            <span className="cyber-profile-label">Apartment</span>
            <span className="cyber-profile-value">{apartment}</span>
          </div>
        </div>
      </div>

      <div className="cyber-sim-card">
        <div className="cyber-sim-card-head">
          <span>Profile</span>
          <div className="cyber-sim-card-actions">
            <button type="button" onClick={onEdit} aria-label="Edit details">
              <Pencil size={14} />
            </button>
            <button type="button" onClick={onShare} aria-label="People nearby">
              <Share2 size={14} />
            </button>
          </div>
        </div>
        <div className="cyber-sim-card-body">
          <div className="cyber-sim-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <User size={24} />}
          </div>
          <div className="cyber-sim-info">
            <strong>{cardName}</strong>
            <span>{phone}</span>
          </div>
          <div className="cyber-sim-quick-actions">
            <button type="button" className="cyber-sim-action-btn" onClick={onCall} aria-label="Phone app">
              <Phone size={18} />
            </button>
            <button type="button" className="cyber-sim-action-btn" onClick={onMessage} aria-label="Messages app">
              <MessageCircle size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EditCardForm({
  displayName,
  phone,
  notes,
  avatarUrl,
  onChange,
  onSave,
  onPickGallery,
  saving,
}) {
  const notesLen = notes?.length ?? 0

  return (
    <form
      className="cyber-edit-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div className="cyber-form-field">
        <label htmlFor="sim-display-name">Display name</label>
        <input
          id="sim-display-name"
          className="cyber-input"
          value={displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          placeholder="Display name"
          maxLength={48}
        />
      </div>
      <div className="cyber-form-field">
        <label htmlFor="sim-phone">Phone number</label>
        <input id="sim-phone" className="cyber-input is-readonly" value={phone} readOnly tabIndex={-1} />
      </div>
      <div className="cyber-form-field">
        <label htmlFor="sim-notes">Notes</label>
        <textarea
          id="sim-notes"
          className="cyber-input cyber-textarea"
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value.slice(0, 150) })}
          placeholder="Optional notes"
          maxLength={150}
        />
        <span className="cyber-char-count">{notesLen}/150</span>
      </div>
      <div className="cyber-form-field">
        <label>Photo</label>
        <div className="cyber-photo-row">
          <div className="cyber-photo-preview">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <User size={20} />}
          </div>
          <input
            className="cyber-input"
            placeholder="Image URL"
            value={avatarUrl}
            onChange={(e) => onChange({ avatarUrl: e.target.value })}
          />
          <button type="button" className="cyber-icon-btn" onClick={onPickGallery} aria-label="Pick from gallery">
            <Image size={18} />
          </button>
        </div>
      </div>
      <button type="submit" className="cyber-save-btn" disabled={saving}>
        Save
      </button>
    </form>
  )
}

export function PeopleNearbySheet({ open, sharing, onToggleSharing, onClose, players, streamerMode }) {
  if (!open) return null

  return (
    <>
      <button type="button" className="cyber-nearby-backdrop" onClick={onClose} aria-label="Close people nearby" />
      <div className="cyber-nearby-sheet" role="dialog" aria-label="People Nearby">
        <div className="cyber-nearby-head">
          <strong>People Nearby</strong>
          <DiamondToggle checked={sharing} onChange={onToggleSharing} ariaLabel="Share with people nearby" />
          <button type="button" className="cyber-nearby-collapse" onClick={onClose} aria-label="Close">
            <CornerUpLeft size={18} />
          </button>
        </div>
        <p className="cyber-nearby-desc">Enable sharing to be visible to others nearby.</p>
        {sharing && players.length > 0 && (
          <div className="cyber-nearby-list">
            {players.map((person) => (
              <div key={person.phone || person.name} className="cyber-settings-card cyber-nearby-row">
                <div className="cyber-nearby-row-avatar">
                  {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : <User size={18} />}
                </div>
                <div className="cyber-nearby-row-text">
                  <strong>{person.name}</strong>
                  <span>{formatPhone(person.phone, streamerMode)}</span>
                </div>
                <span className="cyber-nearby-distance">{person.distance}m</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
