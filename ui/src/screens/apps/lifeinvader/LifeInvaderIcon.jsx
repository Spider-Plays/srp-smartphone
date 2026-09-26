/** LifeInvader "L" mark — inline SVG (no Font Awesome dependency). */

export default function LifeInvaderIcon({ size = 28, className = '', withBackground = true }) {
  const fontSize = Math.round(size * 0.58)

  if (!withBackground) {
    return (
      <svg
        className={className}
        width={fontSize}
        height={fontSize}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fill="#fff"
          fontSize="16"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          L
        </text>
      </svg>
    )
  }

  return (
    <span
      className={`li-icon-mark ${className}`.trim()}
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      <svg width={fontSize} height={fontSize} viewBox="0 0 24 24">
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fill="#fff"
          fontSize="16"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          L
        </text>
      </svg>
    </span>
  )
}
