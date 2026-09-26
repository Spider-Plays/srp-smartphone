import { useEffect, useState } from 'react'
import { Bell, FoldHorizontal, Plane, UnfoldHorizontal } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'
import { useNetworkSignal } from '../hooks/useNetworkSignal'
import { getScreenChrome } from '../config/statusBarThemes'
import NetworkBars from './NetworkBars'
import './StatusBar.css'

export default function StatusBar() {
  const {
    screen,
    visible,
    airplaneMode,
    notificationTray,
    bellRingTick,
    networkStrength,
    setNotificationTrayOpen,
    phoneFlipped,
    togglePhoneFlip,
  } = usePhone()
  const [bellRinging, setBellRinging] = useState(false)
  const signalStrength = useNetworkSignal({
    enabled: visible && !airplaneMode,
    anchor: networkStrength,
  })
  const [time, setTime] = useState('00:00')
  const isAppOpen = screen !== 'lock' && screen !== 'home'
  const chrome = getScreenChrome(screen)
  const themeClass = chrome?.statusBarClass ?? ''

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  const trayCount = notificationTray.length

  useEffect(() => {
    if (bellRingTick < 1) return undefined
    setBellRinging(true)
    const id = setTimeout(() => setBellRinging(false), 720)
    return () => clearTimeout(id)
  }, [bellRingTick])

  return (
    <div className={`status-bar ${isAppOpen ? 'app-open' : ''} ${themeClass}`.trim()}>
      <div className="status-bar-start">
        <span className="time">{time}</span>
        <button
          type="button"
          className={`status-bar-tray-btn${bellRinging ? ' is-ringing' : ''}`}
          onClick={() => setNotificationTrayOpen((open) => !open)}
          aria-label={`Notifications${trayCount ? `, ${trayCount} stored` : ''}`}
        >
          <span className="status-bar-bell-icon" aria-hidden="true">
            <Bell size={18} />
          </span>
          {trayCount > 0 && (
            <span className="status-bar-tray-badge">{trayCount > 99 ? '99+' : trayCount}</span>
          )}
        </button>
      </div>
      <div className="status-bar-end">
        {airplaneMode ? (
          <Plane className="airplane-icon" size={16} aria-label="Airplane mode" />
        ) : (
          <NetworkBars strength={signalStrength} />
        )}
        <button
          type="button"
          className={`status-bar-flip-btn${phoneFlipped ? ' is-open' : ''}`}
          onClick={togglePhoneFlip}
          aria-pressed={phoneFlipped}
          aria-label={phoneFlipped ? 'Flip phone closed' : 'Flip phone open'}
        >
          {phoneFlipped ? (
            <FoldHorizontal size={15} strokeWidth={2.25} />
          ) : (
            <UnfoldHorizontal size={15} strokeWidth={2.25} />
          )}
        </button>
      </div>
    </div>
  )
}
