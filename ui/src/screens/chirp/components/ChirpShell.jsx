import { ArrowLeft, Home, Plus, Search, User, X } from 'lucide-react'
import ChirpLogo from '../ChirpLogo'
import { SOCIAL_APP_NAME } from '../../../config/socialAppBranding'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'compose', label: 'Post', icon: Plus, compose: true },
  { id: 'profile', label: 'Profile', icon: User },
]

export default function ChirpBottomNav({ active, onHome, onSearch, onCompose, onProfile }) {
  const handlers = {
    home: onHome,
    search: onSearch,
    compose: onCompose,
    profile: onProfile,
  }

  return (
    <nav className="phone-app-nav chirp-phone-nav" aria-label={`${SOCIAL_APP_NAME} navigation`}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = !item.compose && active === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`phone-app-nav-item ${isActive ? 'active' : ''} ${item.compose ? 'chirp-nav-compose' : ''}`}
            onClick={handlers[item.id]}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="phone-app-nav-icon-wrap">
              <Icon size={20} strokeWidth={2} />
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function ChirpScreenHeader({
  variant = 'default',
  title,
  subtitle,
  onBack,
  onAction,
  actionLabel,
  actionDisabled,
  actionVariant = 'primary',
  onProfile,
}) {
  if (variant === 'feed') {
    return (
      <header className="chirp-x-header">
        <div className="chirp-auth-logo-wrap">
          <ChirpLogo size={28} />
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" className="chirp-x-avatar-btn" onClick={onProfile} aria-label="Your profile">
          <User size={18} />
        </button>
      </header>
    )
  }

  if (variant === 'auth') {
    return (
      <header className="chirp-x-header chirp-x-header--auth">
        <button type="button" className="chirp-x-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }} />
      </header>
    )
  }

  return (
    <header className="chirp-x-header">
      <button type="button" className="chirp-x-icon-btn" onClick={onBack} aria-label="Back">
        {variant === 'compose' ? <X size={22} /> : <ArrowLeft size={22} />}
      </button>
      {title && (
        <h2 className="chirp-x-header-title">
          {title}
          {subtitle ? <small>{subtitle}</small> : null}
        </h2>
      )}
      {onAction ? (
        <button
          type="button"
          className={`chirp-x-post-btn ${actionVariant === 'ghost' ? 'ghost' : ''} ${actionVariant === 'outline' ? 'outline' : ''}`}
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </button>
      ) : (
        <div style={{ width: 34, flexShrink: 0 }} />
      )}
    </header>
  )
}
