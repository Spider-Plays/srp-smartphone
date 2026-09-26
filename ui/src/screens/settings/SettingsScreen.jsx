import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  BellOff,
  Volume2,
  Shield,
  Phone as PhoneIcon,
  MessageCircle,
  Search,
  Image,
  Plane,
  Eye,
  EyeOff,
  UserX,
} from 'lucide-react'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import { DEFAULT_WALLPAPER, getWallpaperStyle, getWallpaperEntries } from '../../config/wallpapers'
import { PHONE_SIZE_PRESETS } from '../../config/phoneScale'
import {
  SCREENS,
  SCREEN_TITLES,
  MAIN_MENU,
  RINGTONES,
  MESSAGE_TONES,
  NOTIFICATION_APPS,
  getSimEditResumeKey,
} from './constants'
import { useSettingsState } from './useSettingsState'
import { useSimProfile } from './useSimProfile'
import { useTonePreview } from './useTonePreview'
import { normalizeRingtoneId } from '../../utils/phoneTones'
import {
  SettingsHeader,
  MenuRow,
  ToggleCard,
  VolumeSlider,
  NavRow,
  RadioRow,
  SectionLabel,
  SaveIconButton,
  DiamondToggle,
  SimCardPanel,
  EditCardForm,
  PeopleNearbySheet,
} from './components'
import { formatPhone } from '../../utils/streamerMode'
import FoldEmpty from '../../components/FoldEmpty'
import FoldSplit from '../../components/FoldSplit'
import './settings.css'

export default function SettingsScreen() {
  const {
    goBack,
    notify,
    bootstrap,
    navigate,
    attachedImage,
    setAttachedImage,
    setGallerySelectionMode,
    airplaneMode,
    setAirplaneMode,
    streamerMode,
    setStreamerMode,
    callAnonymous,
    setCallAnonymous,
    phoneFlipped,
    foldLayout,
  } = usePhone()
  const settings = useSettingsState()
  const { local, patchLocal, serverSettings, setWallpaper, setPhoneScale, setRingtone, syncCallVolume, customWallpaperUrl, setCustomWallpaperUrl } = settings
  const sim = useSimProfile()

  const resumeKey = getSimEditResumeKey(bootstrap?.citizenid)

  const [screen, setScreen] = useState(() => {
    try {
      const raw = sessionStorage.getItem(getSimEditResumeKey(bootstrap?.citizenid))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.screen === SCREENS.editCard) return SCREENS.editCard
      }
    } catch {
      /* ignore */
    }
    return SCREENS.home
  })
  const [playingTone, setPlayingTone] = useState(null)
  const [editDraft, setEditDraft] = useState(() => {
    try {
      const raw = sessionStorage.getItem(getSimEditResumeKey(bootstrap?.citizenid))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.draft) return parsed.draft
      }
    } catch {
      /* ignore */
    }
    return null
  })
  const [savingCard, setSavingCard] = useState(false)
  const [nearbyOpen, setNearbyOpen] = useState(false)
  const [nearbyPlayers, setNearbyPlayers] = useState([])
  const toneKind = screen === SCREENS.messageTones ? 'message' : 'ring'
  const tonePreview = useTonePreview(toneKind)

  const nearbySharing = sim.profile.peopleNearbySharing === true

  useEffect(() => {
    try {
      sessionStorage.removeItem(resumeKey)
    } catch {
      /* ignore */
    }
  }, [resumeKey])

  const enabledApps = bootstrap?.apps || {}
  const visibleNotificationApps = NOTIFICATION_APPS.filter((app) => enabledApps[app.id] !== false)

  const handleBack = useCallback(() => {
    if (screen === SCREENS.home) {
      goBack()
      return
    }
    if (screen === SCREENS.ringtones || screen === SCREENS.messageTones) {
      setScreen(SCREENS.sounds)
      return
    }
    if (screen === SCREENS.editCard) {
      setEditDraft(null)
      setScreen(SCREENS.sim)
      return
    }
    setScreen(SCREENS.home)
  }, [screen, goBack])

  const goTo = (id) => {
    if (id === SCREENS.editCard) {
      setEditDraft({ ...sim.profile })
    }
    setScreen(id)
  }

  useEffect(() => {
    if (screen !== SCREENS.editCard || !attachedImage?.url) return
    setEditDraft((d) => (d ? { ...d, avatarUrl: attachedImage.url } : d))
    setAttachedImage(null)
  }, [screen, attachedImage, setAttachedImage])

  const ringtoneLabel =
    RINGTONES.find((r) => r.id === normalizeRingtoneId(local.callRingtone))?.label || 'Opening'
  const messageToneLabel = MESSAGE_TONES.find((t) => t.id === local.messageTone)?.label || 'Ding'
  const scalePercent = serverSettings.phone_scale ?? 100

  const handleCustomWallpaper = () => {
    const url = customWallpaperUrl.trim()
    if (!url) return
    setWallpaper('custom', url)
    notify('Wallpaper', 'Custom wallpaper applied.')
  }

  const handleTonePlay = async (toneId) => {
    const vol =
      screen === SCREENS.messageTones ? local.messageVolume : local.callRingtoneVolume
    const playing = await tonePreview.toggle(toneId, vol ?? 50)
    setPlayingTone(playing ? toneId : null)
  }

  useEffect(() => {
    tonePreview.stop()
    setPlayingTone(null)
  }, [screen, toneKind])

  const refreshNearbyPlayers = useCallback(async () => {
    if (!nearbySharing) {
      setNearbyPlayers([])
      return
    }
    const list = await fetchNui('getNearbyPlayers')
    setNearbyPlayers(Array.isArray(list) ? list : [])
  }, [nearbySharing])

  useEffect(() => {
    if (screen !== SCREENS.sim) return
    fetchNui('getNearbySharing').then((state) => {
      if (typeof state?.enabled !== 'boolean') return
      if (state.enabled !== sim.profile.peopleNearbySharing) {
        sim.save({ peopleNearbySharing: state.enabled })
      }
    })
  }, [screen])

  useEffect(() => {
    if (!nearbyOpen || !nearbySharing) return undefined
    refreshNearbyPlayers()
    const ms = 4000
    const id = setInterval(refreshNearbyPlayers, ms)
    return () => clearInterval(id)
  }, [nearbyOpen, nearbySharing, refreshNearbyPlayers])

  const handleNearbyToggle = async (enabled) => {
    const result = await fetchNui('setNearbySharing', {
      enabled,
      profile: {
        displayName: sim.profile.displayName,
        avatarUrl: sim.profile.avatarUrl,
      },
    })
    if (result?.ok === false) {
      notify('People Nearby', 'Could not update sharing.')
      return
    }
    sim.save({ peopleNearbySharing: enabled })
    if (enabled) {
      refreshNearbyPlayers()
    } else {
      setNearbyPlayers([])
    }
  }

  const openPeopleNearby = () => setNearbyOpen(true)
  const closePeopleNearby = () => setNearbyOpen(false)

  const handleSaveEditCard = () => {
    if (!editDraft) return
    setSavingCard(true)
    sim.save(editDraft)
    setSavingCard(false)
    setEditDraft(null)
    notify('My Details', 'Details saved.')
    setScreen(SCREENS.sim)
  }

  const openGalleryForAvatar = () => {
    const draft = editDraft ?? sim.profile
    try {
      sessionStorage.setItem(
        resumeKey,
        JSON.stringify({ screen: SCREENS.editCard, draft })
      )
    } catch {
      /* ignore */
    }
    setGallerySelectionMode(true)
    navigate('gallery')
  }

  const renderSim = () => (
    <SimCardPanel
      legalName={sim.legalName}
      citizenId={sim.citizenId}
      apartment={sim.apartment}
      cardName={sim.cardName}
      phone={formatPhone(sim.phone, streamerMode)}
      avatarUrl={sim.profile.avatarUrl}
      onEdit={() => goTo(SCREENS.editCard)}
      onShare={openPeopleNearby}
      onCall={() => navigate('phone')}
      onMessage={() => navigate('messages')}
    />
  )

  const renderEditCard = () => {
    const draft = editDraft ?? sim.profile
    return (
      <EditCardForm
        displayName={draft.displayName}
        phone={formatPhone(sim.phone, streamerMode)}
        notes={draft.notes}
        avatarUrl={draft.avatarUrl}
        onChange={(patch) => setEditDraft((d) => ({ ...(d ?? sim.profile), ...patch }))}
        onSave={handleSaveEditCard}
        onPickGallery={openGalleryForAvatar}
        saving={savingCard}
      />
    )
  }

  const renderGeneral = () => (
    <>
      <ToggleCard
        icon={Plane}
        title="Airplane Mode"
        subtitle={airplaneMode ? 'Enabled — calls and messages blocked' : 'Disabled'}
        checked={airplaneMode}
        onChange={(v) => {
          setAirplaneMode(v)
          patchLocal({ airplaneMode: v })
          if (v) notify('Airplane Mode', 'Calls and messages are unavailable.')
        }}
      />
      <ToggleCard
        icon={streamerMode ? EyeOff : Eye}
        title="Streamer Mode"
        subtitle={streamerMode ? 'Phone numbers hidden on screen' : 'Show all info'}
        checked={streamerMode}
        onChange={(v) => {
          setStreamerMode(v)
          patchLocal({ streamerMode: v })
        }}
      />
      <ToggleCard
        icon={UserX}
        title="Call Anonymously"
        subtitle={callAnonymous ? 'Your name and number are hidden when you call' : 'Recipients see your caller ID'}
        checked={callAnonymous}
        onChange={(v) => {
          setCallAnonymous(v)
          patchLocal({ callAnonymous: v })
          if (v) notify('Call Anonymously', 'Your caller ID will be hidden on outgoing calls.')
        }}
      />
    </>
  )

  const menuSelection =
    screen === SCREENS.ringtones || screen === SCREENS.messageTones
      ? SCREENS.sounds
      : screen === SCREENS.editCard
        ? SCREENS.sim
        : screen

  const renderHome = () => (
    <div className="cyber-settings-menu">
      {MAIN_MENU.map((item) => (
        <MenuRow
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={menuSelection === item.id}
          onClick={() => goTo(item.id)}
        />
      ))}
    </div>
  )

  const renderNotifications = () => (
    <>
      <ToggleCard
        icon={Bell}
        title="Allow Notifications"
        subtitle="Receive notification banners"
        checked={local.allowNotifications}
        onChange={(v) => {
          patchLocal({ allowNotifications: v })
          settings.persistServer({ notifications: v ? 1 : 0 })
        }}
      />
      <ToggleCard
        icon={BellOff}
        title="Silent Mode"
        subtitle="Mute all notification sounds"
        checked={local.notificationSilent}
        onChange={(v) => patchLocal({ notificationSilent: v })}
      />
      <SectionLabel>App Notifications</SectionLabel>
      <div className="cyber-app-notif-list">
        {visibleNotificationApps.map((app) => {
          const Icon = app.icon
          return (
            <div key={app.id} className="cyber-settings-card cyber-app-notif-row">
              <span className="cyber-app-icon" style={{ background: app.color }}>
                {app.iconSrc ? (
                  <img src={app.iconSrc} alt="" className="app-icon-img" style={{ width: 20, height: 20 }} />
                ) : Icon ? (
                  <Icon size={18} strokeWidth={2} />
                ) : null}
              </span>
              <strong>{app.label}</strong>
              <DiamondToggle
                checked={local.appNotifications?.[app.id] !== false}
                onChange={(v) =>
                  patchLocal({
                    appNotifications: { ...local.appNotifications, [app.id]: v },
                  })
                }
                ariaLabel={`${app.label} notifications`}
              />
            </div>
          )
        })}
      </div>
    </>
  )

  const renderSounds = () => (
    <>
      <ToggleCard
        icon={BellOff}
        title="Silent Mode"
        subtitle="Mute all sounds"
        checked={local.silentMode}
        onChange={(v) => patchLocal({ silentMode: v })}
      />
      <VolumeSlider icon={Volume2} label="Call Volume" value={local.callVolume} onChange={syncCallVolume} />
      <SectionLabel>Calls</SectionLabel>
      <NavRow icon={Bell} title="Ringtone" subtitle={ringtoneLabel} onClick={() => goTo(SCREENS.ringtones)} />
      <VolumeSlider label="Volume" value={local.callRingtoneVolume} onChange={(v) => patchLocal({ callRingtoneVolume: v })} />
      <SectionLabel>Text messages</SectionLabel>
      <NavRow icon={MessageCircle} title="Tone" subtitle={messageToneLabel} onClick={() => goTo(SCREENS.messageTones)} />
      <VolumeSlider label="Volume" value={local.messageVolume} onChange={(v) => patchLocal({ messageVolume: v })} />
    </>
  )

  const renderToneList = (tones, selectedId, onSelect) =>
    tones.map((tone) => (
      <RadioRow
        key={tone.id}
        label={tone.label}
        selected={selectedId === tone.id}
        playing={playingTone === tone.id}
        onSelect={() => {
          onSelect(tone.id)
          setPlayingTone(null)
          tonePreview.stop()
        }}
        onPlayToggle={() => handleTonePlay(tone.id)}
      />
    ))

  const renderRingtones = () => (
    <div className="cyber-tone-list">
      {renderToneList(RINGTONES, local.callRingtone, (id) => setRingtone(id))}
    </div>
  )

  const renderMessageTones = () => (
    <div className="cyber-tone-list">
      {renderToneList(MESSAGE_TONES, local.messageTone, (id) => patchLocal({ messageTone: id }))}
    </div>
  )

  const renderWallpaper = () => {
    const wallpaperEntries = getWallpaperEntries()
    const currentWallpaper = serverSettings.wallpaper || DEFAULT_WALLPAPER

    const adjustScale = (delta) => {
      const presets = PHONE_SIZE_PRESETS.map((p) => p.value)
      const idx = presets.indexOf(scalePercent)
      const next = presets[Math.min(presets.length - 1, Math.max(0, (idx < 0 ? 1 : idx) + delta))]
      setPhoneScale(next)
    }

    return (
      <>
        <div className="cyber-settings-card cyber-zoom-card">
          <div className="cyber-zoom-head">
            <Search size={18} />
            <strong>Display Zoom</strong>
            <span>{scalePercent}%</span>
          </div>
          <div className="cyber-zoom-pills">
            <button type="button" className="cyber-pill-btn" onClick={() => adjustScale(-1)}>
              Smaller
            </button>
            <button type="button" className="cyber-pill-btn" onClick={() => setPhoneScale(100)}>
              Reset
            </button>
            <button type="button" className="cyber-pill-btn" onClick={() => adjustScale(1)}>
              Larger
            </button>
          </div>
        </div>
        <div className="cyber-settings-card cyber-zoom-card cyber-wallpaper-card">
          <div className="cyber-zoom-head">
            <Image size={18} />
            <strong>Choose Wallpaper</strong>
          </div>
          <div className="cyber-wallpaper-grid">
            {wallpaperEntries.map(([id, wp]) => {
              const style = getWallpaperStyle(id)
              return (
                <button
                  key={id}
                  type="button"
                  className={`cyber-wallpaper-thumb ${currentWallpaper === id ? 'is-selected' : ''}`}
                  style={style}
                  onClick={() => setWallpaper(id)}
                  aria-label={wp.label}
                />
              )
            })}
          </div>
        </div>
        <div className="cyber-settings-card cyber-zoom-card cyber-wallpaper-card">
          <div className="cyber-zoom-head">
            <Image size={18} />
            <strong>Custom Wallpaper</strong>
          </div>
          <div className="cyber-custom-wallpaper-row">
            <input
              className="cyber-input"
              placeholder="Custom URL"
              value={customWallpaperUrl}
              onChange={(e) => setCustomWallpaperUrl(e.target.value)}
            />
            <SaveIconButton onClick={handleCustomWallpaper} />
          </div>
        </div>
      </>
    )
  }

  const renderPrivacy = () => (
    <>
      <div className="cyber-settings-card cyber-info-card">
        <span className="cyber-card-icon">
          <Shield size={20} />
        </span>
        <div className="cyber-card-text">
          <strong>Privacy Settings</strong>
          <p>
            Enable privacy mode to only receive calls and messages from numbers saved in your contacts.
            Unknown numbers will be blocked automatically.
          </p>
        </div>
      </div>
      <ToggleCard
        icon={PhoneIcon}
        title="Phone Privacy"
        subtitle="Your number is private"
        checked={local.phonePrivacy}
        onChange={(v) => patchLocal({ phonePrivacy: v })}
      />
      <ToggleCard
        icon={MessageCircle}
        title="Messages Privacy"
        subtitle="Your messages are private"
        checked={local.messagesPrivacy}
        onChange={(v) => patchLocal({ messagesPrivacy: v })}
      />
    </>
  )

  const screens = {
    [SCREENS.home]: renderHome,
    [SCREENS.general]: renderGeneral,
    [SCREENS.sim]: renderSim,
    [SCREENS.editCard]: renderEditCard,
    [SCREENS.notifications]: renderNotifications,
    [SCREENS.sounds]: renderSounds,
    [SCREENS.ringtones]: renderRingtones,
    [SCREENS.messageTones]: renderMessageTones,
    [SCREENS.wallpaper]: renderWallpaper,
    [SCREENS.privacy]: renderPrivacy,
  }

  const title = SCREEN_TITLES[screen] || 'Settings'
  const showHeaderBack = screen !== SCREENS.home
  const folded = phoneFlipped && foldLayout?.mode === 'span'

  const section = (
    <>
      <SettingsHeader title={title} onBack={showHeaderBack ? handleBack : undefined} />
      <div className="cyber-settings-scroll">{screens[screen]?.()}</div>
    </>
  )

  const nearby = screen === SCREENS.sim && (
    <PeopleNearbySheet
      open={nearbyOpen}
      sharing={nearbySharing}
      onToggleSharing={handleNearbyToggle}
      onClose={closePeopleNearby}
      players={nearbyPlayers}
      streamerMode={streamerMode}
    />
  )

  if (folded) {
    return (
      <div className="cyber-settings cyber-settings-fold">
        <FoldSplit
          menu={
            <>
              <SettingsHeader title="Settings" />
              <div className="cyber-settings-scroll">{renderHome()}</div>
            </>
          }
          detail={
            screen === SCREENS.home ? (
              <FoldEmpty title="Choose a setting" subtitle="My Details, sounds, wallpaper, and privacy open here." />
            ) : (
              <>
                {section}
                {nearby}
              </>
            )
          }
        />
      </div>
    )
  }

  return (
    <div className="cyber-settings">
      <SettingsHeader title={title} onBack={showHeaderBack ? handleBack : undefined} />
      <div className="cyber-settings-scroll">{screens[screen]?.()}</div>
      {nearby}
    </div>
  )
}
