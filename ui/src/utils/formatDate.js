export function formatPurchasedAt(value) {
  if (value == null || value === '') return 'Unknown'

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }

  const num = Number(value)
  if (!Number.isNaN(num)) {
    const ms = num > 9999999999 ? num : num * 1000
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }

  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return 'Unknown'
}
