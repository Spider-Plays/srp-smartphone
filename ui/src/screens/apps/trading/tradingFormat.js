export const MARKETS = {
  crypto: { label: 'Crypto', tradeEvent: 'cryptoTrade', priceDecimals: 2, qtyDecimals: 6 },
  stocks: { label: 'Stocks', tradeEvent: 'stockTrade', priceDecimals: 2, qtyDecimals: 2 },
}

export const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)

export const fmtPrice = (n, decimals = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0)

export const fmtQty = (n, decimals = 4) => {
  if (!n && n !== 0) return '0'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n)
}

export const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n || 0).toFixed(2)}%`

export const fmtVolume = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(Math.floor(n || 0))
}

export const watchKey = (marketKind, assetId) => `${marketKind}:${assetId}`

/** Tinted accent for emergency-style list rows */
export function formatMarketClock(hour, minute = 0) {
  const h12 = (Number(hour) || 0) % 12 || 12
  const ampm = (Number(hour) || 0) < 12 ? 'AM' : 'PM'
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`
}

export function formatMarketStatus(status) {
  if (!status || status.alwaysOpen) return null
  if (status.isOpen) {
    const mins = status.minutesUntil
    if (mins != null && mins < 60) return `Market open · Closes in ${mins}m`
    if (mins != null) return `Market open · Closes in ${Math.floor(mins / 60)}h ${mins % 60}m`
    return 'Market open'
  }
  const mins = status.minutesUntil
  if (mins != null && mins < 60) return `Market closed · Opens in ${mins}m`
  if (mins != null) return `Market closed · Opens in ${Math.floor(mins / 60)}h ${mins % 60}m`
  return `Market closed · Opens ${formatMarketClock(status.openHour, 0)}`
}

export function assetAccent(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) {
    return { bg: 'rgba(126, 232, 202, 0.15)', fg: '#7ee8ca' }
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return { bg: 'rgba(126, 232, 202, 0.15)', fg: '#7ee8ca' }
  }
  return { bg: `rgba(${r}, ${g}, ${b}, 0.18)`, fg: hex }
}
