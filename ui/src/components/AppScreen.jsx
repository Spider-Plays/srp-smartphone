import { ChevronLeft } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'
import FoldSplit, { useFoldSplitDepth } from './FoldSplit'

/**
 * Shared app shell — matches Emergency app layout (navy bg, large title, subtabs / bottom nav).
 * Unfolded, bottom tabs become the left screen and the section opens on the right.
 */
export default function AppScreen({
  title,
  subtitle,
  onBack,
  tabs,
  activeTab,
  onTabChange,
  tabStyle = 'bottom',
  headerRight,
  headerPrefix,
  customHeader,
  children,
  className = '',
  footer,
  layer,
}) {
  const { foldLayout } = usePhone()
  const foldDepth = useFoldSplitDepth()
  const foldMenu =
    foldLayout?.mode === 'span' && foldDepth === 0 && tabStyle === 'bottom' && tabs?.length > 0

  const header = customHeader ?? (
    <header className="phone-app-header">
      {onBack && (
        <button type="button" className="phone-app-back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
      )}
      {headerPrefix}
      <div className="phone-app-header-main">
        <h1 className="phone-app-title">{title}</h1>
        {subtitle && <p className="phone-app-subtitle">{subtitle}</p>}
      </div>
      {headerRight && <div className="phone-app-header-right">{headerRight}</div>}
    </header>
  )

  const subtabs =
    tabs?.length > 0 && tabStyle === 'sub' ? (
      <div className="phone-app-subtabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`phone-app-subtab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange?.(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    ) : null

  const bottomNav =
    tabs?.length > 0 && tabStyle === 'bottom' ? (
      <nav className={`phone-app-nav${foldMenu ? ' phone-app-nav-fold' : ''}`} aria-label="App navigation">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              className={`phone-app-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => onTabChange?.(t.id)}
            >
              <span className="phone-app-nav-icon-wrap">
                {Icon ? <Icon size={20} strokeWidth={2} /> : <span className="phone-app-nav-text-fallback">{t.label.charAt(0)}</span>}
              </span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>
    ) : null

  if (foldMenu) {
    return (
      <div className={`phone-app phone-app-fold ${className}`.trim()}>
        <FoldSplit
          menu={
            <>
              {header}
              {bottomNav}
            </>
          }
          detail={
            <>
              <div className="phone-app-content">{children}</div>
              {footer && <div className="phone-app-footer">{footer}</div>}
            </>
          }
        />
        {layer}
      </div>
    )
  }

  return (
    <div className={`phone-app ${className}`.trim()}>
      {header}
      {subtabs}
      <div className="phone-app-content">{children}</div>
      {bottomNav}
      {footer && <div className="phone-app-footer">{footer}</div>}
      {layer}
    </div>
  )
}
