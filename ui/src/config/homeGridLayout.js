import { sortAppsByLabel } from './homeApps'

export const GRID_COLUMNS = 4
export const GRID_ROWS_PER_PAGE = 5
export const APPS_PER_PAGE = GRID_COLUMNS * GRID_ROWS_PER_PAGE

/** Split visible grid apps into fixed-size home screen pages (left → right). */
export function splitAppsIntoPages(gridApps, perPage = APPS_PER_PAGE) {
  const sortedApps = sortAppsByLabel(gridApps)
  if (!sortedApps.length) return [[]]

  const size = perPage > 0 ? perPage : APPS_PER_PAGE
  const pages = []
  for (let i = 0; i < sortedApps.length; i += size) {
    pages.push(sortedApps.slice(i, i + size))
  }
  return pages
}

/** Place one page of apps in row-major order (fixed cell count, no vertical scroll). */
export function buildPageCells(pageApps) {
  const cells = Array(APPS_PER_PAGE).fill(null)
  pageApps.forEach((app, i) => {
    if (i < APPS_PER_PAGE) cells[i] = app.id
  })
  return cells
}
