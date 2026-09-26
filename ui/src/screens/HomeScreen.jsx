import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePhone } from '../context/PhoneContext'
import { getDockApps, getGridApps, HOME_APPS } from '../config/homeApps'
import { APPS_PER_PAGE, splitAppsIntoPages } from '../config/homeGridLayout'
import HomeAppGrid from '../components/HomeAppGrid'
import './HomeScreen.css'

function DockAppIcon({ app, onOpen }) {
  const Icon = app.icon
  return (
    <button type="button" className="app-icon" onClick={() => onOpen(app)} aria-label={app.label}>
      <div className="icon-wrapper" style={{ background: app.color }}>
        {app.iconSrc ? (
          <img src={app.iconSrc} alt="" className="app-icon-img" />
        ) : Icon ? (
          <Icon size={30} strokeWidth={2} />
        ) : null}
      </div>
    </button>
  )
}

export default function HomeScreen() {
  const { navigate, bootstrap, phoneFlipped } = usePhone()
  const appsPerPage = phoneFlipped ? 32 : APPS_PER_PAGE
  const enabledApps = bootstrap?.apps || {}
  const trackRef = useRef(null)
  const viewportRef = useRef(null)
  const activePageRef = useRef(0)
  const wheelLockRef = useRef(false)
  const [activePage, setActivePage] = useState(0)

  activePageRef.current = activePage

  const visibleApps = useMemo(
    () => HOME_APPS.filter((app) => enabledApps[app.id] !== false),
    [enabledApps],
  )

  const gridApps = useMemo(() => getGridApps(visibleApps), [visibleApps])
  const dockApps = useMemo(() => getDockApps(visibleApps), [visibleApps])
  const pages = useMemo(() => splitAppsIntoPages(gridApps, appsPerPage), [gridApps, appsPerPage])

  useEffect(() => {
    if (activePage >= pages.length) {
      setActivePage(0)
      if (trackRef.current) trackRef.current.scrollLeft = 0
    }
  }, [activePage, pages.length])

  const openApp = useCallback(
    (app) => {
      navigate(app.id === 'phone' ? 'phone' : app.id)
    },
    [navigate],
  )

  const onPagesScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || track.clientWidth <= 0) return
    const page = Math.round(track.scrollLeft / track.clientWidth)
    setActivePage((prev) => (prev === page ? prev : page))
  }, [])

  const goToPage = useCallback((index) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(index, track.children.length - 1))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
    setActivePage(clamped)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || pages.length <= 1) return undefined

    const onWheel = (event) => {
      const dominantDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (dominantDelta === 0) return

      event.preventDefault()

      if (wheelLockRef.current) return

      const direction = dominantDelta > 0 ? 1 : -1
      const nextPage = activePageRef.current + direction
      if (nextPage < 0 || nextPage >= pages.length) return

      wheelLockRef.current = true
      goToPage(nextPage)
      window.setTimeout(() => {
        wheelLockRef.current = false
      }, 380)
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [goToPage, pages.length])

  return (
    <div className="home-screen" ref={viewportRef}>
      <div className="home-pages-viewport">
        <div
          ref={trackRef}
          className="home-pages-track"
          onScroll={onPagesScroll}
          role="tablist"
          aria-label="Home screen pages"
        >
          {pages.map((pageApps, pageIndex) => (
            <div
              key={`home-page-${pageIndex}`}
              className="home-page"
              role="tabpanel"
              aria-label={`Page ${pageIndex + 1} of ${pages.length}`}
            >
              <HomeAppGrid gridApps={pageApps} onOpenApp={openApp} perPage={appsPerPage} />
            </div>
          ))}
        </div>

        {pages.length > 1 && (
          <div className="home-page-dots" role="tablist" aria-label="Home page indicator">
            {pages.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                role="tab"
                aria-selected={activePage === index}
                aria-label={`Page ${index + 1}`}
                className={`home-page-dot ${activePage === index ? 'active' : ''}`}
                onClick={() => goToPage(index)}
              />
            ))}
          </div>
        )}
      </div>

      {dockApps.length > 0 && (
        <div className="app-dock" role="toolbar" aria-label="Dock">
          {dockApps.map((app) => (
            <DockAppIcon key={app.id} app={app} onOpen={openApp} />
          ))}
        </div>
      )}
    </div>
  )
}
