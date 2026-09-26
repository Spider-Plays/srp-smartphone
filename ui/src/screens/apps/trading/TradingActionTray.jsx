/**
 * Floating bottom action dock — reuses phone-app-nav / emergency-nav item styling.
 */
export function TradingActionItem({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  variant = '',
  ariaLabel,
}) {
  return (
    <button
      type="button"
      className={[
        'phone-app-nav-item',
        'trading-action-item',
        active ? 'active' : '',
        variant ? `trading-action-${variant}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
    >
      <span
        className={[
          'phone-app-nav-icon-wrap',
          'trading-action-icon-wrap',
          variant ? `trading-action-icon-${variant}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {Icon ? <Icon size={20} strokeWidth={2} /> : null}
      </span>
      <span>{label}</span>
    </button>
  )
}

export default function TradingActionTray({ hint, children }) {
  return (
    <div className="trading-action-tray-wrap">
      {hint && <p className="trading-action-tray-hint">{hint}</p>}
      <nav className="phone-app-nav trading-action-nav" aria-label="Trade actions">
        {children}
      </nav>
    </div>
  )
}
