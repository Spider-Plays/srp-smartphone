import { useEffect, useState } from 'react'
import { Bell, Flashlight, Moon, Plane, Settings, Signal, Sun, X } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { getNotificationIcon } from './notificationIcons'
import {
  canNavigateNotification,
  handleNotificationTap,
} from '../utils/notificationNavigation'
import { loadLocalSettings, saveLocalSettings } from '../screens/settings/localSettings'
import './NotificationTray.css'

function formatShadeDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
}

export default function NotificationTray() {
  const {
    notificationTrayOpen,
    setNotificationTrayOpen,
    notificationTray,
    removeFromTray,
    clearNotificationTray,
    locked,
    unlock,
    navigate,
    bootstrap,
    setBootstrap,
    airplaneMode,
    setAirplaneMode,
    notify,
    networkStrength,
    bumpSettings,
    flashlightOn,
    setFlashlightOn,
    brightness,
    setBrightness,
  } = usePhone()
  const [shadeDate, setShadeDate] = useState(() => formatShadeDate(new Date()))
  const [silentMode, setSilentMode] = useState(false)
  const [allowNotifications, setAllowNotifications] = useState(true)

  const citizenid = bootstrap?.citizenid

  useEffect(() => {
    if (!notificationTrayOpen) return undefined
    const loaded = loadLocalSettings(citizenid)
    setSilentMode(loaded.silentMode === true)
    setAllowNotifications(loaded.allowNotifications !== false)
    setShadeDate(formatShadeDate(new Date()))
    const id = setInterval(() => setShadeDate(formatShadeDate(new Date())), 60000)
    return () => clearInterval(id)
  }, [notificationTrayOpen, citizenid])

  const savePatch = (patch) => {
    const next = { ...loadLocalSettings(citizenid), ...patch }
    saveLocalSettings(citizenid, next)
    bumpSettings()
    return next
  }

  const close = () => setNotificationTrayOpen(false)

  const openSettings = () => {
    close()
    const go = () => navigate('settings')
    if (locked) {
      unlock()
      setTimeout(go, 250)
    } else {
      go()
    }
  }

  const toggleAirplane = () => {
    const next = !airplaneMode
    setAirplaneMode(next)
    savePatch({ airplaneMode: next })
    if (next) notify('Airplane Mode', 'Calls and messages are unavailable.')
  }

  const toggleCellular = () => {
    if (!airplaneMode) return
    setAirplaneMode(false)
    savePatch({ airplaneMode: false })
  }

  const toggleNotifications = async () => {
    const next = !allowNotifications
    setAllowNotifications(next)
    savePatch({ allowNotifications: next })
    const settings = bootstrap?.settings || {}
    const res = await fetchNui('saveSettings', {
      wallpaper: settings.wallpaper,
      ringtone: settings.ringtone,
      notifications: next ? 1 : 0,
      phone_scale: settings.phone_scale,
    })
    if (res?.ok !== false) {
      setBootstrap((current) => ({
        ...current,
        settings: { ...current?.settings, notifications: next ? 1 : 0 },
      }))
    }
  }

  const toggleSilent = () => {
    const next = !silentMode
    setSilentMode(next)
    savePatch({ silentMode: next, notificationSilent: next })
  }

  const toggleFlashlight = async () => {
    const next = !flashlightOn
    setFlashlightOn(next)
    const result = await fetchNui('setFlashlight', { enabled: next })
    if (result && result.ok === false) setFlashlightOn(!next)
  }

  const setPhoneBrightness = (value) => {
    const next = Math.max(0, Math.min(100, Math.round(Number(value))))
    setBrightness(next)
    saveLocalSettings(citizenid, { ...loadLocalSettings(citizenid), brightness: next })
  }

  const onTap = (n) => {
    handleNotificationTap(n, {
      navigate,
      dismissNotification: removeFromTray,
      locked,
      unlock,
      onCloseTray: close,
    })
  }

  if (!notificationTrayOpen) return null

  const cellularOn = !airplaneMode
  const toggles = [
    {
      id: 'airplane',
      label: airplaneMode ? 'Airplane mode on' : 'Airplane mode',
      icon: Plane,
      on: airplaneMode,
      onClick: toggleAirplane,
    },
    {
      id: 'cellular',
      label: cellularOn ? `Cellular signal, ${networkStrength} of 4` : 'Cellular off',
      icon: Signal,
      on: cellularOn,
      onClick: toggleCellular,
    },
    {
      id: 'notifications',
      label: allowNotifications ? 'Notifications on' : 'Notifications off',
      icon: Bell,
      on: allowNotifications,
      onClick: toggleNotifications,
    },
    {
      id: 'silent',
      label: silentMode ? 'Silent mode on' : 'Silent mode',
      icon: Moon,
      on: silentMode,
      onClick: toggleSilent,
    },
    {
      id: 'flashlight',
      label: flashlightOn ? 'Flashlight on' : 'Flashlight',
      icon: Flashlight,
      on: flashlightOn,
      onClick: toggleFlashlight,
    },
  ]

  return (
    <div className="notification-tray-overlay" role="presentation" onClick={close}>
      <div
        className="notification-shade"
        role="dialog"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-shade-date-row">
          <p className="notification-shade-date">{shadeDate}</p>
          <button type="button" className="notification-shade-settings" onClick={openSettings} aria-label="Settings">
            <Settings size={16} />
          </button>
        </div>

        <div className="notification-shade-toggles">
          {toggles.map((toggle) => {
            const Icon = toggle.icon
            return (
              <button
                key={toggle.id}
                type="button"
                className={`notification-shade-toggle${toggle.on ? ' is-on' : ''}`}
                onClick={toggle.onClick}
                aria-label={toggle.label}
                aria-pressed={toggle.on}
              >
                <Icon size={18} strokeWidth={2.2} />
              </button>
            )
          })}
        </div>

        <label className="notification-shade-brightness" style={{ '--brightness': `${brightness}%` }}>
          <span className="notification-shade-brightness-fill" aria-hidden="true" />
          <Sun size={16} className="notification-shade-brightness-icon" />
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            aria-label="Brightness"
            onChange={(e) => setPhoneBrightness(e.target.value)}
          />
        </label>

        {notificationTray.length > 0 && (
          <div className="notification-shade-list-head">
            <button type="button" className="notification-shade-clear" onClick={clearNotificationTray}>
              Clear
            </button>
          </div>
        )}

        <div
          className="notification-shade-body"
          onClick={notificationTray.length === 0 ? close : undefined}
        >
          {notificationTray.length === 0 ? (
            <p className="notification-shade-empty">No notifications</p>
          ) : (
            notificationTray.map((n) => {
              const Icon = getNotificationIcon(n)
              const canNavigate = canNavigateNotification(n)
              return (
                <div
                  key={n.id}
                  className={`notification-tray-item${canNavigate ? ' is-clickable' : ''}`}
                  onClick={() => canNavigate && onTap(n)}
                  role={canNavigate ? 'button' : undefined}
                  tabIndex={canNavigate ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (canNavigate && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onTap(n)
                    }
                  }}
                >
                  <div className="notification-tray-item-icon">
                    <Icon size={20} color="#10141c" />
                  </div>
                  <div className="notification-tray-item-content">
                    <div className="notification-tray-item-header">
                      <span className="notification-tray-item-title">{n.title}</span>
                      <span className="notification-tray-item-time">{n.time}</span>
                    </div>
                    <p className="notification-tray-item-message">{n.message}</p>
                  </div>
                  <button
                    type="button"
                    className="notification-tray-item-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromTray(n.id)
                    }}
                    aria-label="Remove notification"
                  >
                    <X size={16} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
