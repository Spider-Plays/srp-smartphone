import { Bird } from 'lucide-react'
import { SOCIAL_APP_NAME } from '../../config/socialAppBranding'

export default function ChirpLogo({ size = 32, className = '', showLabel = true }) {
  return (
    <span className={`chirp-logo-mark ${className}`.trim()} style={{ '--chirp-logo-size': `${size}px` }}>
      <Bird size={size} strokeWidth={2.25} className="chirp-logo-bird" aria-hidden />
      {showLabel ? <span className="chirp-logo-word">{SOCIAL_APP_NAME}</span> : null}
    </span>
  )
}
