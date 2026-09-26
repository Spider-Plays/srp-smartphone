export const STREAMER_MASK_PHONE = '•••-•••-••••'

export function formatPhone(phone, streamerMode) {
  if (!streamerMode) return phone ?? ''
  if (!phone || phone === '—') return phone ?? ''
  return STREAMER_MASK_PHONE
}
