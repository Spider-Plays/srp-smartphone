import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Grid3x3 } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { HOME_APPS } from '../../config/homeApps'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import AppStoreInstallButton from './AppStoreInstallButton'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

const INSTALL_ERRORS = {
  insufficient: 'Insufficient bank balance',
  essential: 'This app cannot be removed',
  unknown: 'App not found in catalog',
  rate_limit: 'Too many requests — try again shortly',
  database: 'Could not save install state',
  no_character: 'Character not loaded',
  invalid_app: 'Invalid app',
}

function installErrorMessage(res, appLabel) {
  if (res?.error && INSTALL_ERRORS[res.error]) return INSTALL_ERRORS[res.error]
  return `Could not install ${appLabel}`
}

/** Must match CSS animation duration in phone-apps-extra.css */
const INSTALL_ANIM_MS = 2200
const INSTALL_DONE_MS = 500

const APP_META = Object.fromEntries(HOME_APPS.map((app) => [app.id, app]))

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function AppStoreIcon({ app }) {
  const meta = APP_META[app.id]
  const Icon = meta?.icon || Grid3x3

  return (
    <div className="appstore-card-icon" style={{ background: meta?.color || 'linear-gradient(135deg, #007aff, #5856d6)' }}>
      {meta?.iconSrc ? (
        <img src={meta.iconSrc} alt="" className="app-icon-img" />
      ) : (
        <Icon size={24} strokeWidth={2} />
      )}
    </div>
  )
}

export default function AppStoreScreen() {
  const { goBack, notify, setBootstrap } = usePhone()
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionState, setActionState] = useState({})

  const patchInstalled = useCallback((appId, installed) => {
    setCatalog((prev) => prev.map((app) => (app.id === appId ? { ...app, installed } : app)))
  }, [])

  const setAppAction = useCallback((appId, patch) => {
    setActionState((prev) => {
      const next = { ...prev }
      if (patch == null) {
        delete next[appId]
      } else {
        next[appId] = { ...prev[appId], ...patch }
      }
      return next
    })
  }, [])

  const refreshCatalog = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    return fetchNui('getAppStoreCatalog').then((res) => {
      setCatalog(res?.catalog || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    refreshCatalog()
  }, [refreshCatalog])

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base' })),
    [catalog],
  )

  const install = async (appId, appLabel) => {
    flushSync(() => setAppAction(appId, { phase: 'installing' }))

    try {
      const [res] = await Promise.all([
        fetchNui('installApp', { appId }),
        wait(INSTALL_ANIM_MS),
      ])

      if (!res?.ok) {
        setAppAction(appId, null)
        notify('App Store', installErrorMessage(res, appLabel), 'error')
        return
      }

      flushSync(() => setAppAction(appId, { phase: 'complete' }))
      await wait(INSTALL_DONE_MS)

      patchInstalled(appId, true)
      if (res.apps) setBootstrap((b) => ({ ...b, apps: res.apps }))
      setAppAction(appId, null)
      notify('App Store', `${appLabel} installed`, 'default')
      await refreshCatalog(true)
    } catch {
      setAppAction(appId, null)
      notify('App Store', `Could not install ${appLabel}`, 'error')
    }
  }

  const uninstall = async (appId, appLabel) => {
    setAppAction(appId, { phase: 'uninstalling' })
    const res = await fetchNui('uninstallApp', { appId })
    if (res?.ok) {
      patchInstalled(appId, false)
      if (res.apps) setBootstrap((b) => ({ ...b, apps: res.apps }))
      notify('App Store', `${appLabel} removed`, 'default')
      await refreshCatalog(true)
    } else {
      notify('App Store', INSTALL_ERRORS[res?.error] || `Could not remove ${appLabel}`, 'error')
    }
    setAppAction(appId, null)
  }

  return (
    <AppScreen className="appstore-app" title="App Store" subtitle="Install optional apps" onBack={goBack}>
      {loading ? (
        <div className="phone-empty"><Grid3x3 size={48} /><p>Loading catalog...</p></div>
      ) : sortedCatalog.length === 0 ? (
        <div className="phone-empty"><Grid3x3 size={48} /><p>No apps available</p></div>
      ) : (
        sortedCatalog.map((app) => {
          const action = actionState[app.id]
          return (
            <div key={app.id} className={`appstore-card ${action?.phase === 'installing' ? 'appstore-card--installing' : ''}`}>
              <AppStoreIcon app={app} />
              <div className="appstore-card-body">
                <h3>{app.label}</h3>
                <p>{app.description}</p>
                {app.price > 0 && <span className="phone-card-meta">{fmt(app.price)}</span>}
              </div>
              <AppStoreInstallButton
                appLabel={app.label}
                installed={app.installed}
                phase={action?.phase}
                onInstall={() => install(app.id, app.label)}
                onUninstall={() => uninstall(app.id, app.label)}
              />
            </div>
          )
        })
      )}
    </AppScreen>
  )
}
