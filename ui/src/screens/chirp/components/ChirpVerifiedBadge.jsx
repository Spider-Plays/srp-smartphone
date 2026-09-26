import verifiedBadgeSrc from '../../../assets/chirp-verified-badge.png'

export default function ChirpVerifiedBadge({ size = 16, className = '' }) {
  return (
    <img
      src={verifiedBadgeSrc}
      alt=""
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`chirp-verified-badge ${className}`.trim()}
      aria-label="Verified"
      draggable={false}
    />
  )
}
