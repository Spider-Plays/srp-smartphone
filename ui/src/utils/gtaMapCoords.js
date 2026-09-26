/** GTA V world bounds aligned with CreepPork/GTAV-Maps satellite tiles. */
export const GTA_MAP_BOUNDS = {
  minX: -4000,
  maxX: 4500,
  minY: -5500,
  maxY: 6000,
}

/** Convert in-game X/Y to percentage position on the static map image. */
export function gtaCoordsToPercent(x, y) {
  const { minX, maxX, minY, maxY } = GTA_MAP_BOUNDS
  return {
    left: Math.max(2, Math.min(98, ((x - minX) / (maxX - minX)) * 100)),
    top: Math.max(2, Math.min(98, ((maxY - y) / (maxY - minY)) * 100)),
  }
}

export const MAP_TILE_CONFIG = {
  zoom: 3,
  grid: 3,
  basePath: './maps/satellite',
  extension: 'png',
}

export function mapTileUrl(zoom, x, y) {
  const { basePath } = MAP_TILE_CONFIG
  return `${basePath}/${zoom}-${x}_${y}.png`
}
