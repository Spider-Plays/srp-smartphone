/**
 * Resolve which phone screen to open when a notification is tapped.
 * Prefer explicit `app` / `screen` on the notification; fall back to legacy `type`.
 */
export const LEGACY_TYPE_TO_APP = {
  message: 'messages',
  call: 'call',
  missedCall: 'phone',
  garage: 'garage',
  properties: 'properties',
  bank: 'bank',
  dispatch: 'dispatch',
  mail: 'mail',
  jobs: 'jobs',
  maps: 'maps',
  market: 'market',
  services: 'services',
  notes: 'notes',
  invoices: 'invoices',
  documents: 'documents',
  news: 'news',
  trading: 'trading',
  chirp: 'chirp',
  camera: 'camera',
  gallery: 'gallery',
  contacts: 'contacts',
  settings: 'settings',
}

/** Infer originating app from the active screen when notify() omits `app`. */
export function inferAppFromScreen(screen) {
  if (!screen || screen === 'home' || screen === 'lock') return null
  if (screen === 'chat') return 'messages'
  if (screen === 'edit-contact') return 'contacts'
  if (screen === 'vehicle-detail') return 'garage'
  if (screen === 'property-detail') return 'properties'
  if (screen === 'call') return 'phone'
  return screen
}

export function getNotificationNavigation(notification) {
  if (!notification) return null

  const app =
    notification.app ||
    notification.screen ||
    LEGACY_TYPE_TO_APP[notification.type] ||
    null

  if (!app) return null

  const params = { ...(notification.params || {}) }

  if (app === 'messages' && params.phone) {
    return {
      screen: 'chat',
      params: {
        phone: params.phone,
        name: params.name || params.phone,
        ...params,
      },
    }
  }

  if (app === 'bank') {
    return { screen: 'bank', params: { tab: params.tab || 'history', ...params } }
  }

  return { screen: app, params }
}

export function canNavigateNotification(notification) {
  return Boolean(getNotificationNavigation(notification))
}

export function handleNotificationTap(notification, { navigate, dismissNotification, unlock, locked, onCloseTray }) {
  const target = getNotificationNavigation(notification)
  if (!target) return

  dismissNotification?.(notification.id)
  onCloseTray?.()

  const go = () => navigate(target.screen, target.params)

  if (locked) {
    unlock()
    setTimeout(go, 250)
  } else {
    go()
  }
}
