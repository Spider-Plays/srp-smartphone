const IMAGE_HOST_PATTERN =
  /^(https?:\/\/)(cdn\.discordapp\.com|media\.discordapp\.net|images-ext-\d+\.discordapp\.net|i\.imgur\.com|.*\.(png|jpe?g|gif|webp)(\?.*)?$)/i

export function isValidChirpImageUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed || trimmed.length > 2048) return false
  if (trimmed.startsWith('data:image/')) return true
  if (!/^https?:\/\//i.test(trimmed)) return false
  if (/discord(app)?\.(com|net)/i.test(trimmed)) return true
  return IMAGE_HOST_PATTERN.test(trimmed) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(trimmed)
}

export function normalizeImageUrl(url) {
  return typeof url === 'string' ? url.trim() : ''
}
