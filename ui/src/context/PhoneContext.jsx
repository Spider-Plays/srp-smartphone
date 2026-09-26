import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_WALLPAPER } from '../config/wallpapers'
import { inferAppFromScreen } from '../utils/notificationNavigation'
import { clampPhoneScale, getPhoneDimensions, PHONE_SCALE_DEFAULT } from '../config/phoneScale'
import { getFoldLayout } from '../config/foldLayout'
import { fetchNui, useNuiEvent } from '../hooks/useNui'
import { getLocalSettingsKey, getNotificationTrayKey } from '../screens/settings/constants'
import { stopPhoneTones } from '../utils/phoneTones'
import { SOCIAL_APP_NAME } from '../config/socialAppBranding'

const MAX_TRAY_ITEMS = 100

function loadNotificationTray(citizenid) {
  try {
    const raw = localStorage.getItem(getNotificationTrayKey(citizenid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveNotificationTray(citizenid, tray) {
  try {
    localStorage.setItem(getNotificationTrayKey(citizenid), JSON.stringify(tray.slice(0, MAX_TRAY_ITEMS)))
  } catch {
    /* ignore */
  }
}

const PhoneContext = createContext(null)

const defaultBootstrap = {
  citizenid: '',
  phone: '555-0000',
  name: 'Player',
  stateId: '',
  apartment: null,
  properties: { apartments: [], houses: [] },
  money: { cash: 0, bank: 0 },
  settings: {
    wallpaper: DEFAULT_WALLPAPER,
    ringtone: 'opening',
    notifications: 1,
    vibration: 1,
    volume: 50,
    brightness: 75,
    phone_scale: PHONE_SCALE_DEFAULT,
  },
  apps: {},
}

const BLOCKED_IN_AIRPLANE = new Set(['messages', 'phone', 'contacts', 'chat', 'bank', 'chirp'])

export function PhoneProvider({ children }) {
  const [visible, setVisible] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [locked, setLocked] = useState(true)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [screen, setScreen] = useState('lock')
  const [screenStack, setScreenStack] = useState([])
  const [bootstrap, setBootstrap] = useState(defaultBootstrap)
  const [screenParams, setScreenParams] = useState({})
  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [toast, setToast] = useState(null)
  const [airplaneMode, setAirplaneMode] = useState(false)
  const [streamerMode, setStreamerMode] = useState(false)
  const [callAnonymous, setCallAnonymous] = useState(false)
  const [volume, setVolume] = useState(50)
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationTray, setNotificationTray] = useState([])
  const [notificationTrayOpen, setNotificationTrayOpen] = useState(false)
  const [bellRingTick, setBellRingTick] = useState(0)
  const [networkStrength, setNetworkStrength] = useState(4)
  const [phoneFlipped, setPhoneFlipped] = useState(false)
  const [settingsRevision, setSettingsRevision] = useState(0)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [wallpaperUrl, setWallpaperUrl] = useState(null)
  const [gallerySelectionMode, setGallerySelectionMode] = useState(false)
  const [galleryRevision, setGalleryRevision] = useState(0)
  const refreshGallery = useCallback(() => {
    setGalleryRevision((n) => n + 1)
  }, [])
  const bumpSettings = useCallback(() => {
    setSettingsRevision((n) => n + 1)
  }, [])
  const [attachedImage, setAttachedImage] = useState(null)
  const [pendingChirpImage, setPendingChirpImage] = useState(null)
  const [messageContact, setMessageContact] = useState(null)
  const jobPopupReplayRef = useRef(null)
  const visibleRef = useRef(false)

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    const citizenid = bootstrap?.citizenid
    if (!citizenid) return
    saveNotificationTray(citizenid, notificationTray)
  }, [notificationTray, bootstrap?.citizenid])

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random()
    const time =
      notification.time ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const entry = { id, ...notification, time }
    setNotifications((list) => [...list, entry])
    setNotificationTray((list) => [entry, ...list].slice(0, MAX_TRAY_ITEMS))
    setBellRingTick((t) => t + 1)
    setTimeout(() => {
      setNotifications((list) => list.filter((n) => n.id !== id))
    }, 5000)
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications((list) => list.filter((n) => n.id !== id))
  }, [])

  const removeFromTray = useCallback((id) => {
    setNotificationTray((list) => list.filter((n) => n.id !== id))
  }, [])

  const clearNotificationTray = useCallback(() => {
    setNotificationTray([])
  }, [])

  const notify = useCallback(
    (title, message, options = 'default') => {
      const opts = typeof options === 'string' ? { type: options } : options || {}
      const type = opts.type || (typeof options === 'string' ? options : 'default')
      const app = opts.app || opts.screen || inferAppFromScreen(screen)
      addNotification({
        title,
        message,
        type,
        app: app || undefined,
        params: opts.params || {},
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    },
    [addNotification, screen]
  )

  const adjustVolume = useCallback((delta) => {
    setVolume((v) => {
      const next = Math.max(0, Math.min(100, v + delta))
      return next
    })
    setShowVolumeIndicator(true)
    setTimeout(() => setShowVolumeIndicator(false), 1500)
  }, [])

  const navigate = useCallback(
    (next, params = {}, replace = false) => {
      if (airplaneMode && BLOCKED_IN_AIRPLANE.has(next)) {
        notify('Airplane Mode', 'This app is unavailable while airplane mode is enabled.', 'default')
        return
      }
      setScreenParams(params)
      if (replace) {
        setScreen(next)
        return
      }
      setScreenStack((s) => [...s, { screen, params: screenParams }])
      setScreen(next)
    },
    [screen, screenParams, airplaneMode, notify]
  )

  const goBack = useCallback(() => {
    setScreenStack((s) => {
      if (s.length === 0) {
        setScreen(locked ? 'lock' : 'home')
        setScreenParams({})
        return s
      }
      const prev = s[s.length - 1]
      setScreen(prev.screen)
      setScreenParams(prev.params || {})
      return s.slice(0, -1)
    })
  }, [locked])

  const goHome = useCallback(() => {
    setScreen('home')
    setScreenStack([])
    setScreenParams({})
    setGallerySelectionMode(false)
    setAttachedImage(null)
    setMessageContact(null)
  }, [])

  const unlock = useCallback(() => {
    if (!locked) return
    setIsUnlocking(true)
    setTimeout(() => {
      setLocked(false)
      setScreen('home')
      setScreenStack([])
      setScreenParams({})
      setIsUnlocking(false)
    }, 200)
  }, [locked])

  const openPhone = useCallback((data) => {
    setBootstrap({ ...defaultBootstrap, ...data })
    setNotificationTray(loadNotificationTray(data?.citizenid))
    setNotificationTrayOpen(false)
    try {
      const raw = localStorage.getItem(getLocalSettingsKey(data?.citizenid))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.airplaneMode === 'boolean') setAirplaneMode(parsed.airplaneMode)
        if (typeof parsed.streamerMode === 'boolean') setStreamerMode(parsed.streamerMode)
        if (typeof parsed.callAnonymous === 'boolean') setCallAnonymous(parsed.callAnonymous)
        if (typeof parsed.brightness === 'number') {
          setBrightness(Math.max(0, Math.min(100, Math.round(parsed.brightness))))
        } else {
          setBrightness(100)
        }
      } else {
        setBrightness(100)
      }
    } catch {
      /* ignore */
    }
    setVisible(true)
    setIsOpening(true)
    setIsClosing(false)
    setLocked(true)
    setScreen('lock')
    setScreenStack([])
    setScreenParams({})
    setTimeout(() => setIsOpening(false), 600)
    setTimeout(() => {
      const pendingJob = jobPopupReplayRef.current
      if (pendingJob) {
        jobPopupReplayRef.current = null
        addNotification(pendingJob)
        setToast({ type: 'job', ...pendingJob })
      }
    }, 700)
  }, [addNotification])

  const lockPhone = useCallback(() => {
    setLocked(true)
    setScreen('lock')
    setScreenStack([])
    setScreenParams({})
    setGallerySelectionMode(false)
    setAttachedImage(null)
  }, [])

  const dismissPhone = useCallback(() => {
    setIsClosing(true)
    setIsOpening(false)
    setTimeout(() => {
      setVisible(false)
      setIsClosing(false)
      setLocked(true)
      setScreen('lock')
      setScreenStack([])
      setIncomingCall(null)
      setActiveCall(null)
      setGallerySelectionMode(false)
      setAttachedImage(null)
    }, 400)
  }, [])

  const closePhone = useCallback(() => {
    if (!visible) return
    dismissPhone()
    fetchNui('close')
  }, [visible, dismissPhone])

  const stopIncomingRing = useCallback(() => {
    stopPhoneTones()
    setIncomingCall(null)
    setActiveCall((call) => (call?.ringing ? { ...call, ringing: false } : call))
  }, [])

  const simulateIncomingCall = useCallback(
    (overrides = {}) => {
      const data = {
        callId: `dev-${Date.now()}`,
        phone: '555-0101',
        name: 'Jane Doe',
        ...overrides,
      }
      setIncomingCall(data)
      navigate('call', { incoming: true, ...data })
    },
    [navigate]
  )

  const notifyMissedCall = useCallback(
    (data = {}) => {
      const name = data.name || null
      const phone = data.phone || 'Unknown'
      const message = name ? `${name} · ${phone}` : phone
      addNotification({
        title: 'Missed Call',
        message,
        type: 'missedCall',
        app: 'phone',
        params: { phone: data.phone, name: data.name },
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    },
    [addNotification]
  )

  const handleCallEnded = useCallback(
    (payload) => {
      const data = typeof payload === 'object' && payload !== null ? payload : { callId: payload }
      stopPhoneTones()
      setActiveCall(null)
      setIncomingCall(null)
      if (visible) goBack()
      if (data.status === 'missed') {
        notifyMissedCall(data)
      }
    },
    [visible, goBack, notifyMissedCall]
  )

  const simulateMissedCall = useCallback(
    (overrides = {}) => {
      handleCallEnded({
        callId: `dev-missed-${Date.now()}`,
        status: 'missed',
        phone: '555-0101',
        name: 'Jane Doe',
        ...overrides,
      })
    },
    [handleCallEnded]
  )

  useNuiEvent(
    useCallback(
      (msg) => {
        switch (msg.action) {
          case 'open':
            openPhone(msg.data)
            break
          case 'close':
            dismissPhone()
            break
          case 'setVisible':
            if (msg.data) openPhone(msg.data || {})
            else closePhone()
            break
          case 'bootstrap':
            setBootstrap((b) => ({ ...b, ...msg.data }))
            break
          case 'updateMoney':
            setBootstrap((b) => ({ ...b, money: msg.money }))
            break
          case 'incomingCall':
            simulateIncomingCall(msg.data || {})
            break
          case 'callAnswered':
            stopPhoneTones()
            setActiveCall({ ...msg.data, ringing: false, answered: true })
            setIncomingCall(null)
            setScreenParams({ active: true, incoming: false, ringing: false, ...msg.data })
            break
          case 'callEnded':
            handleCallEnded(msg.data)
            break
          case 'newMessage':
            setToast({ type: 'message', ...msg.data })
            addNotification({
              title: msg.data?.name || msg.data?.title || 'New Message',
              message: msg.data?.message || msg.data?.body || '',
              type: 'message',
              app: 'messages',
              params: {
                phone: msg.data?.phone,
                name: msg.data?.name || msg.data?.phone,
              },
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            break
          case 'dispatchAlert':
            addNotification({
              title: msg.data?.title || 'Emergency',
              message: msg.data?.message || '',
              type: 'dispatch',
              app: 'dispatch',
              params: { alertId: msg.data?.id },
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            break
          case 'updateNetworkSignal':
            if (typeof msg.strength === 'number') {
              setNetworkStrength(Math.max(0, Math.min(4, Math.round(msg.strength))))
            }
            break
          case 'bankTransaction': {
            const d = msg.data || {}
            const received = d.direction === 'received' || (typeof d.amount === 'number' && d.amount > 0)
            addNotification({
              title: d.title || (received ? 'Bank Deposit' : 'Bank Transfer'),
              message: d.message || '',
              type: 'bank',
              app: 'bank',
              params: { tab: 'history' },
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            break
          }
          case 'chirpNotify': {
            const d = msg.data || {}
            addNotification({
              title: d.title || SOCIAL_APP_NAME,
              message: d.message || d.body || '',
              type: 'chirp',
              app: 'chirp',
              params: {
                postId: d.postId,
                username: d.username,
                kind: d.kind,
              },
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            break
          }
          case 'jobApplicationAccepted': {
            const d = msg.data || {}
            const entry = {
              title: d.title || 'LifeInvader',
              message: d.message || d.body || 'Your job application was accepted.',
              type: 'jobs',
              app: 'market',
              params: { tab: 'jobs' },
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
            if (visibleRef.current) {
              addNotification(entry)
              setToast({
                type: 'job',
                title: entry.title,
                name: entry.title,
                message: entry.message,
                jobId: d.jobId,
                jobLabel: d.jobLabel,
              })
            } else {
              const trayEntry = { id: Date.now() + Math.random(), ...entry }
              setNotificationTray((list) => [trayEntry, ...list].slice(0, MAX_TRAY_ITEMS))
              jobPopupReplayRef.current = entry
            }
            break
          }
          default:
            break
        }
      },
      [openPhone, closePhone, dismissPhone, visible, goBack, addNotification, simulateIncomingCall, handleCallEnded]
    )
  )

  const togglePhoneFlip = useCallback(() => {
    setPhoneFlipped((open) => !open)
  }, [])

  const phoneScalePercent = clampPhoneScale(bootstrap?.settings?.phone_scale)
  const phoneScaleFactor = getPhoneDimensions(phoneScalePercent).factor
  const foldLayout = useMemo(
    () => (phoneFlipped ? getFoldLayout(screen, screenParams, screenStack) : null),
    [phoneFlipped, screen, screenParams, screenStack]
  )

  const value = useMemo(
    () => ({
      phoneScalePercent,
      phoneScaleFactor,
      visible,
      isOpening,
      isClosing,
      locked,
      isUnlocking,
      screen,
      screenParams,
      bootstrap,
      incomingCall,
      activeCall,
      toast,
      setToast,
      airplaneMode,
      setAirplaneMode,
      streamerMode,
      setStreamerMode,
      callAnonymous,
      setCallAnonymous,
      volume,
      setVolume,
      showVolumeIndicator,
      adjustVolume,
      notifications,
      notificationTray,
      notificationTrayOpen,
      setNotificationTrayOpen,
      bellRingTick,
      networkStrength,
      phoneFlipped,
      togglePhoneFlip,
      foldLayout,
      screenStack,
      settingsRevision,
      bumpSettings,
      flashlightOn,
      setFlashlightOn,
      brightness,
      setBrightness,
      addNotification,
      dismissNotification,
      removeFromTray,
      clearNotificationTray,
      notify,
      wallpaperUrl,
      setWallpaperUrl,
      gallerySelectionMode,
      setGallerySelectionMode,
      galleryRevision,
      refreshGallery,
      attachedImage,
      setAttachedImage,
      pendingChirpImage,
      setPendingChirpImage,
      messageContact,
      setMessageContact,
      navigate,
      goBack,
      goHome,
      unlock,
      lockPhone,
      closePhone,
      openPhone,
      setBootstrap,
      setActiveCall,
      setIncomingCall,
      stopIncomingRing,
      simulateIncomingCall,
      simulateMissedCall,
    }),
    [
      phoneScalePercent,
      phoneScaleFactor,
      visible,
      isOpening,
      isClosing,
      locked,
      isUnlocking,
      screen,
      screenParams,
      bootstrap,
      incomingCall,
      activeCall,
      toast,
      airplaneMode,
      streamerMode,
      callAnonymous,
      volume,
      showVolumeIndicator,
      adjustVolume,
      notifications,
      notificationTray,
      notificationTrayOpen,
      bellRingTick,
      networkStrength,
      phoneFlipped,
      togglePhoneFlip,
      foldLayout,
      screenStack,
      settingsRevision,
      bumpSettings,
      flashlightOn,
      brightness,
      addNotification,
      dismissNotification,
      removeFromTray,
      clearNotificationTray,
      notify,
      wallpaperUrl,
      gallerySelectionMode,
      galleryRevision,
      refreshGallery,
      attachedImage,
      pendingChirpImage,
      messageContact,
      navigate,
      goBack,
      goHome,
      unlock,
      lockPhone,
      closePhone,
      stopIncomingRing,
      simulateIncomingCall,
      simulateMissedCall,
      handleCallEnded,
    ]
  )

  return <PhoneContext.Provider value={value}>{children}</PhoneContext.Provider>
}

export function usePhone() {
  const ctx = useContext(PhoneContext)
  if (!ctx) throw new Error('usePhone must be used within PhoneProvider')
  return ctx
}
