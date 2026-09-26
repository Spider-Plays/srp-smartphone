import { useCallback, useEffect, useState } from 'react'
import { usePhone } from '../../context/PhoneContext'
import { DEFAULT_WALLPAPER } from '../../config/wallpapers'
import { clampPhoneScale } from '../../config/phoneScale'
import { fetchNui } from '../../hooks/useNui'
import { loadLocalSettings, saveLocalSettings } from './localSettings'

export function useSettingsState() {
  const {
    bootstrap,
    setBootstrap,
    setVolume,
    setWallpaperUrl,
    setAirplaneMode,
    setStreamerMode,
    setCallAnonymous,
    settingsRevision,
  } = usePhone()
  const citizenid = bootstrap?.citizenid
  const serverSettings = bootstrap?.settings || {}

  const [local, setLocal] = useState(() => loadLocalSettings(citizenid))
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState('')

  useEffect(() => {
    const loaded = loadLocalSettings(citizenid)
    const serverRingtone = serverSettings.ringtone
    if (serverRingtone) {
      loaded.callRingtone = serverRingtone === 'default' ? 'opening' : serverRingtone
    }
    setLocal(loaded)
    if (typeof loaded.airplaneMode === 'boolean') setAirplaneMode(loaded.airplaneMode)
    if (typeof loaded.streamerMode === 'boolean') setStreamerMode(loaded.streamerMode)
    if (typeof loaded.callAnonymous === 'boolean') setCallAnonymous(loaded.callAnonymous)
  }, [citizenid, serverSettings.ringtone, settingsRevision, setAirplaneMode, setStreamerMode, setCallAnonymous])

  const patchLocal = useCallback(
    (patch) => {
      setLocal((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        saveLocalSettings(citizenid, next)
        return next
      })
    },
    [citizenid]
  )

  const persistServer = useCallback(
    async (patch = {}) => {
      const wallpaper = patch.wallpaper ?? serverSettings.wallpaper ?? DEFAULT_WALLPAPER
      const rawRing =
        patch.ringtone ?? serverSettings.ringtone ?? local.callRingtone ?? 'opening'
      const ringtone = rawRing === 'default' ? 'opening' : rawRing
      const notifications =
        patch.notifications !== undefined
          ? patch.notifications
          : local.allowNotifications
            ? 1
            : 0
      const phone_scale = clampPhoneScale(patch.phone_scale ?? serverSettings.phone_scale)

      const payload = { wallpaper, ringtone, notifications, phone_scale }
      const res = await fetchNui('saveSettings', payload)
      if (res?.ok !== false) {
        setBootstrap((b) => ({
          ...b,
          settings: { ...b.settings, ...payload },
        }))
      }
      return res
    },
    [serverSettings, local.callRingtone, local.allowNotifications, setBootstrap]
  )

  const setWallpaper = useCallback(
    async (wallpaperId, url = null) => {
      if (url) setWallpaperUrl(url)
      else setWallpaperUrl(null)
      await persistServer({ wallpaper: wallpaperId })
    },
    [persistServer, setWallpaperUrl]
  )

  const setPhoneScale = useCallback(
    async (scale) => {
      const phone_scale = clampPhoneScale(scale)
      await persistServer({ phone_scale })
    },
    [persistServer]
  )

  const setRingtone = useCallback(
    async (ringtoneId) => {
      patchLocal({ callRingtone: ringtoneId })
      await persistServer({ ringtone: ringtoneId })
    },
    [patchLocal, persistServer]
  )

  const syncCallVolume = useCallback(
    (value) => {
      patchLocal({ callVolume: value })
      setVolume(value)
    },
    [patchLocal, setVolume]
  )

  return {
    local,
    patchLocal,
    persistServer,
    serverSettings,
    customWallpaperUrl,
    setCustomWallpaperUrl,
    setWallpaper,
    setPhoneScale,
    setRingtone,
    syncCallVolume,
    bootstrap,
  }
}
