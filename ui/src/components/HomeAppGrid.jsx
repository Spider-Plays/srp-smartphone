import { useMemo } from 'react'
import { APPS_PER_PAGE } from '../config/homeGridLayout'

function AppIcon({ app, onOpen }) {
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
      <span className="app-name">{app.label}</span>
    </button>
  )
}

export default function HomeAppGrid({ gridApps, onOpenApp, perPage = APPS_PER_PAGE }) {
  const appsById = useMemo(() => Object.fromEntries(gridApps.map((app) => [app.id, app])), [gridApps])
  const cells = useMemo(() => {
    const next = Array(perPage).fill(null)
    gridApps.forEach((app, index) => {
      if (index < perPage) next[index] = app.id
    })
    return next
  }, [gridApps, perPage])
  const cellIndexes = useMemo(() => Array.from({ length: perPage }, (_, i) => i), [perPage])

  return (
    <div className="app-grid app-grid--fixed">
      {cellIndexes.map((index) => {
        const app = cells[index] ? appsById[cells[index]] : null
        return (
          <div
            key={`cell-${index}`}
            className={`app-grid-cell ${app ? 'is-occupied' : 'is-empty'}`}
          >
            {app ? <AppIcon app={app} onOpen={onOpenApp} /> : null}
          </div>
        )
      })}
    </div>
  )
}
