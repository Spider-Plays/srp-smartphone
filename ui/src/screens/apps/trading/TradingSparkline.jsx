/** SVG sparkline from price history array */
export default function TradingSparkline({ history, color = '#7ee8ca', width = 280, height = 72, className = '' }) {
  const points = Array.isArray(history) ? history.map((p) => Number(p)).filter((p) => !Number.isNaN(p) && p > 0) : []
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const pad = 4
  const w = width - pad * 2
  const h = height - pad * 2

  const coords = points.map((price, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * w
    const y = pad + h - ((price - min) / range) * h
    return `${x},${y}`
  })

  const linePath = `M ${coords.join(' L ')}`
  const areaPath = `${linePath} L ${pad + w},${pad + h} L ${pad},${pad + h} Z`
  const up = points[points.length - 1] >= points[0]
  const stroke = up ? '#34c759' : '#ff453a'
  const fill = up ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)'

  return (
    <svg
      className={`trading-sparkline ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={color || stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
