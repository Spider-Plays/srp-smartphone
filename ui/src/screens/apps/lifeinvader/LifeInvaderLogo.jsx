import LifeInvaderIcon from './LifeInvaderIcon'

export default function LifeInvaderLogo({ size = 28, showLabel = true, className = '' }) {
  return (
    <span className={`li-logo ${className}`.trim()} style={{ '--li-logo-size': `${size}px` }}>
      <LifeInvaderIcon size={size} />
      {showLabel ? <span className="li-logo-word">LifeInvader</span> : null}
    </span>
  )
}
