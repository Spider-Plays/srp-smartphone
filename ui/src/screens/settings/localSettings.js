import { DEFAULT_LOCAL_SETTINGS, getLocalSettingsKey } from './constants'

export function loadLocalSettings(citizenid) {
  try {
    const raw = localStorage.getItem(getLocalSettingsKey(citizenid))
    if (!raw) return { ...DEFAULT_LOCAL_SETTINGS }
    return { ...DEFAULT_LOCAL_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_LOCAL_SETTINGS }
  }
}

export function saveLocalSettings(citizenid, settings) {
  try {
    localStorage.setItem(getLocalSettingsKey(citizenid), JSON.stringify(settings))
  } catch {
    /* ignore quota errors */
  }
}
