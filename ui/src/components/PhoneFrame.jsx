import { useEffect, useState } from 'react'
import { usePhone } from '../context/PhoneContext'
import { useEscapeClose, usePhoneTypingLock } from '../hooks/useNui'
import { DEFAULT_WALLPAPER, getWallpaperStyle } from '../config/wallpapers'
import { getPhoneDimensions, getPhoneScaleLayout } from '../config/phoneScale'
import { getScreenChrome, getPhoneScreenStyle } from '../config/statusBarThemes'
import StatusBar from './StatusBar'
import NotificationStack from './NotificationStack'
import NotificationTray from './NotificationTray'
import VolumeIndicator from './VolumeIndicator'
import Toast from './Toast'
import ScreenRouter from './ScreenRouter'
import LockScreen from '../screens/LockScreen'
import HomeBar from './HomeBar'
import PhoneSoundController from './PhoneSoundController'
import FoldEmpty from './FoldEmpty'

export default function PhoneFrame() {
  const {
    visible, isOpening, isClosing, locked, toast, setToast,
    screen, screenParams, bootstrap, lockPhone, adjustVolume, wallpaperUrl,
    goHome, closePhone, navigate, unlock,
    incomingCall, activeCall,
    phoneFlipped, foldLayout,
    brightness,
  } = usePhone()

  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEscapeClose(visible, closePhone)
  usePhoneTypingLock(visible)

  const wallpaperId = bootstrap?.settings?.wallpaper || DEFAULT_WALLPAPER
  const chrome = getScreenChrome(screen)
  const wallpaperStyle = wallpaperUrl
    ? { backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : getWallpaperStyle(wallpaperId)
  const bgStyle = getPhoneScreenStyle(screen, wallpaperStyle)
  const callPhaseClass =
    screen === 'call'
      ? incomingCall || screenParams?.incoming
        ? 'call-incoming'
        : screenParams?.outgoing || activeCall?.ringing
          ? 'call-outgoing'
          : 'call-active'
      : ''

  const foldOpen = phoneFlipped && !locked && screen !== 'lock'
  const foldSplit = foldOpen && foldLayout?.mode === 'split'
  const foldFull = foldOpen && foldLayout?.mode === 'full'
  const phoneScreenClass = ['phone-screen', chrome?.modeClass, callPhaseClass, foldOpen ? 'is-fold-open' : '']
    .filter(Boolean)
    .join(' ')
  const screenBrightness = 0.28 + (Math.max(0, Math.min(100, brightness)) / 100) * 0.72
  const phoneScreenStyle = {
    ...bgStyle,
    ...(chrome?.statusBarBg ? { '--status-bar-bg': chrome.statusBarBg } : {}),
    filter: `brightness(${screenBrightness})`,
  }

  if (!visible && !isClosing) return null

  const scalePercent = bootstrap?.settings?.phone_scale
  const { factor } = getPhoneDimensions(scalePercent)
  const { wrapperStyle, phoneStyle } = getPhoneScaleLayout(scalePercent, {
    flipped: phoneFlipped,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  })

  return (
    <div
      className={[
        'phone-container',
        isOpening ? 'opening' : '',
        isClosing ? 'closing' : '',
        phoneFlipped ? 'is-flipped' : '',
        chrome?.modeClass === 'camera-mode' ? 'camera-mode' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="phone-scale-wrapper" style={wrapperStyle}>
        <div
          className={['phone', phoneFlipped ? 'is-flipped' : ''].filter(Boolean).join(' ')}
          data-phone-scale={factor}
          style={phoneStyle}
        >
          <span className="phone-hinge" aria-hidden="true" />
          <button type="button" className="lock-button" onClick={lockPhone} aria-label="Lock phone" />
          <div className="volume-buttons" aria-hidden="true">
            <button type="button" className="volume-button" onClick={() => adjustVolume(10)} aria-label="Volume up" />
            <button type="button" className="volume-button" onClick={() => adjustVolume(-10)} aria-label="Volume down" />
          </div>
          <div className="phone-frame">
            <span className="frame-earpiece" aria-hidden="true" />
            <div className={phoneScreenClass} style={phoneScreenStyle}>
              <PhoneSoundController />
              <NotificationTray />
              <NotificationStack />
              <VolumeIndicator />
              {toast && (
                <Toast
                  data={toast}
                  onDismiss={() => setToast(null)}
                  onTap={
                    toast.type === 'message'
                      ? () => {
                          if (locked) unlock()
                          const open = () => {
                            if (toast.phone) {
                              navigate('chat', {
                                phone: toast.phone,
                                name: toast.name || toast.phone,
                              })
                            } else {
                              navigate('messages')
                            }
                          }
                          locked ? setTimeout(open, 250) : open()
                        }
                      : toast.type === 'job'
                        ? () => {
                            if (locked) unlock()
                            const open = () => navigate('market', { tab: 'jobs' })
                            locked ? setTimeout(open, 250) : open()
                          }
                        : undefined
                  }
                />
              )}
              <StatusBar />
              {locked || screen === 'lock' ? (
                <LockScreen />
              ) : (
                <>
                  <div
                    className={[
                      'screen-content',
                      foldSplit ? 'is-fold-split' : '',
                      foldOpen && !foldSplit && !foldFull ? 'is-fold-span' : '',
                      foldFull ? 'is-fold-full' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {foldSplit ? (
                      <>
                        <div className="fold-pane">
                          <ScreenRouter screen={foldLayout.left} />
                        </div>
                        <div className="fold-hinge-gap" aria-hidden="true" />
                        <div className="fold-pane">
                          {foldLayout.right ? (
                            <ScreenRouter screen={foldLayout.right} />
                          ) : (
                            <FoldEmpty
                              title="Nothing open"
                              subtitle="Pick a conversation, contact, or item on the left."
                            />
                          )}
                        </div>
                      </>
                    ) : (
                      <ScreenRouter />
                    )}
                  </div>
                  {screen !== 'home' && screen !== 'camera' && <HomeBar onHome={goHome} />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
