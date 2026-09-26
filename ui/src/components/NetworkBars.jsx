/**
 * iOS-style cellular signal bars for the status bar.
 */
export default function NetworkBars({ strength = 4, className = '' }) {
  const level = Math.max(0, Math.min(4, Math.round(strength)))

  return (
    <div
      className={`network-bars${level <= 2 ? ' is-low' : ''} ${className}`.trim()}
      role="img"
      aria-label={`Signal strength ${level} of 4`}
    >
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={`network-bar network-bar-${bar}${bar <= level ? ' active' : ''}`}
        />
      ))}
    </div>
  )
}
