import { useEffect, useRef } from 'react'
import { usePhone } from '../context/PhoneContext'
import { loadLocalSettings } from '../screens/settings/localSettings'
import {
  normalizeRingtoneId,
  OUTGOING_RINGTONE,
  playMessageTone,
  playRingtone,
  stopPhoneTones,
} from '../utils/phoneTones'

function getSoundSettings(citizenid, serverSettings = {}) {
  const local = loadLocalSettings(citizenid)
  const serverRing = serverSettings.ringtone
  if (serverRing && serverRing !== 'default') {
    local.callRingtone = serverRing
  }
  return local
}

function shouldPlayNotificationSound(settings, notification) {
  if (settings.silentMode || settings.notificationSilent) return false
  if (!settings.allowNotifications) return false
  const app = notification?.app || notification?.type
  if (app && settings.appNotifications?.[app] === false) return false
  return true
}

export function usePhoneSounds() {
  const { incomingCall, activeCall, screen, screenParams, notifications, bootstrap, settingsRevision } = usePhone()
  const lastNotifIdRef = useRef(null)

  const isIncomingRinging =
    Boolean(incomingCall) && screen === 'call' && screenParams?.incoming === true

  const isOutgoingRinging = activeCall?.ringing === true

  useEffect(() => {
    const settings = getSoundSettings(bootstrap?.citizenid, bootstrap?.settings)
    const volume = settings.callRingtoneVolume ?? 50
    const shouldRing =
      !settings.silentMode && (isIncomingRinging || isOutgoingRinging)

    if (shouldRing) {
      const tone = isIncomingRinging
        ? normalizeRingtoneId(settings.callRingtone)
        : OUTGOING_RINGTONE
      playRingtone(tone, volume)
    } else {
      stopPhoneTones()
    }
    return () => stopPhoneTones()
  }, [
    isIncomingRinging,
    isOutgoingRinging,
    incomingCall,
    activeCall?.ringing,
    activeCall?.callId,
    screen,
    screenParams?.incoming,
    bootstrap?.citizenid,
    bootstrap?.settings?.ringtone,
    settingsRevision,
  ])

  useEffect(() => {
    if (!notifications.length) return
    const latest = notifications[notifications.length - 1]
    if (!latest?.id || latest.id === lastNotifIdRef.current) return
    lastNotifIdRef.current = latest.id

    const settings = getSoundSettings(bootstrap?.citizenid, bootstrap?.settings)
    if (!shouldPlayNotificationSound(settings, latest)) return

    playMessageTone(settings.messageTone || 'ding', settings.messageVolume ?? 50)
  }, [notifications, bootstrap?.citizenid, bootstrap?.settings?.ringtone, settingsRevision])
}
