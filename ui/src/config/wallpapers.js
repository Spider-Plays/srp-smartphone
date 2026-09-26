/** Wallpaper ids match settings.wallpaper and CSS classes `wp-{id}`. */
export const WALLPAPERS = {
  default: {
    label: 'Midnight',
    image: './wallpapers/default.svg',
    gradient: 'linear-gradient(180deg, #1a3a6b 0%, #0d1f3d 45%, #02060f 100%)',
  },
  spheres: {
    label: 'Spheres',
    image: './wallpapers/spheres.svg',
  },
  neon: {
    label: 'Neon',
    image: './wallpapers/neon.svg',
  },
  cyber: {
    label: 'Cyber',
    image: './wallpapers/cyber.svg',
  },
  aurora: {
    label: 'Aurora',
    gradient: 'linear-gradient(180deg, #1a0a2e 0%, #0f172a 50%, #000 100%)',
  },
  lavender: {
    label: 'Lavender',
    image: './wallpapers/lavender.svg',
    gradient: 'linear-gradient(180deg, #4c1d95 0%, #312e81 50%, #1e1b4b 100%)',
  },
  sunset: {
    label: 'Sunset',
    gradient: 'linear-gradient(180deg, #431407 0%, #7c2d12 35%, #1c1917 70%, #000 100%)',
  },
  ember: {
    label: 'Ember',
    image: './wallpapers/ember.svg',
  },
  ocean: {
    label: 'Ocean',
    gradient: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 50%, #000 100%)',
  },
  forest: {
    label: 'Forest',
    image: './wallpapers/forest.svg',
  },
  storm: {
    label: 'Storm',
    image: './wallpapers/storm.svg',
  },
  rose: {
    label: 'Rose',
    gradient: 'linear-gradient(180deg, #831843 0%, #500724 45%, #0f0f0f 100%)',
  },
  coral: {
    label: 'Coral',
    gradient: 'linear-gradient(180deg, #9f1239 0%, #881337 40%, #1a0a0f 100%)',
  },
  mint: {
    label: 'Mint',
    gradient: 'linear-gradient(180deg, #134e4a 0%, #042f2e 50%, #022c22 100%)',
  },
  ice: {
    label: 'Ice',
    gradient: 'linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 25%, #0c4a6e 60%, #020617 100%)',
  },
  gold: {
    label: 'Gold',
    image: './wallpapers/gold.svg',
  },
  wine: {
    label: 'Wine',
    gradient: 'linear-gradient(180deg, #581c87 0%, #3b0764 35%, #1a0510 100%)',
  },
  charcoal: {
    label: 'Charcoal',
    gradient: 'linear-gradient(180deg, #374151 0%, #1f2937 50%, #030712 100%)',
  },
  matrix: {
    label: 'Matrix',
    gradient: 'linear-gradient(180deg, #052e16 0%, #022c22 40%, #000 100%)',
  },
  blossom: {
    label: 'Blossom',
    gradient: 'linear-gradient(180deg, #fce7f3 0%, #f9a8d4 20%, #be185d 55%, #500724 100%)',
  },
  dusk: {
    label: 'Dusk',
    gradient: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 40%, #0f172a 75%, #000 100%)',
  },
}

export const DEFAULT_WALLPAPER = 'default'

export function getWallpaper(id) {
  return WALLPAPERS[id] || WALLPAPERS[DEFAULT_WALLPAPER]
}

export function getWallpaperStyle(id) {
  const wallpaper = getWallpaper(id)
  if (wallpaper.image) {
    const layers = []
    if (wallpaper.gradient) layers.push(wallpaper.gradient)
    layers.push(`url(${wallpaper.image})`)
    return {
      background: layers.length > 1 ? layers.join(', ') : undefined,
      backgroundImage: wallpaper.gradient ? layers.join(', ') : `url(${wallpaper.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  if (wallpaper.gradient) {
    return { background: wallpaper.gradient }
  }
  return { background: '#000' }
}

/** Sorted list for settings picker (A–Z by label). */
export function getWallpaperEntries() {
  return Object.entries(WALLPAPERS).sort(([, a], [, b]) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  )
}
