import { ArrowDownRight, ArrowUpRight, ChevronRight, Star } from 'lucide-react'
import { assetAccent, fmtPct } from './tradingFormat'

function ChangeBadge({ value }) {
  const positive = value >= 0
  return (
    <span className={`trading-change ${positive ? 'up' : 'down'}`}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmtPct(value)}
    </span>
  )
}

/**
 * Emergency-line list row: circular icon · primary/secondary text · circular action(s).
 */
export default function TradingLineItem({
  symbol,
  name,
  color = '#7ee8ca',
  subtitle,
  priceLine,
  changePct,
  onPress,
  onWatch,
  isWatching = false,
  right,
  showChevron = true,
}) {
  const accent = assetAccent(color)
  const secondary = subtitle ?? (name || '').toUpperCase()

  return (
    <div
      className="trading-line-card"
      onClick={onPress}
      onKeyDown={(e) => {
        if (onPress && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onPress()
        }
      }}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
    >
      <div className="trading-line-icon" style={{ background: accent.bg, color: accent.fg }}>
        {(symbol || '?').charAt(0)}
      </div>
      <div className="trading-line-info">
        <div className="trading-line-primary">{symbol}</div>
        <div className="trading-line-secondary">{secondary}</div>
        {priceLine != null && priceLine !== '' && <div className="trading-line-price">{priceLine}</div>}
        {changePct != null && (
          <div className="trading-line-change">
            <ChangeBadge value={changePct} />
          </div>
        )}
      </div>
      <div className="trading-line-end" onClick={(e) => e.stopPropagation()}>
        {right}
        {onWatch != null && (
          <button
            type="button"
            className="trading-line-btn"
            style={{ background: accent.bg, color: isWatching ? '#ffd60a' : accent.fg }}
            onClick={onWatch}
            aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star size={18} fill={isWatching ? 'currentColor' : 'none'} />
          </button>
        )}
        {showChevron && onPress && (
          <button
            type="button"
            className="trading-line-btn"
            style={{ background: accent.bg, color: accent.fg }}
            onClick={onPress}
            aria-label="Open"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
