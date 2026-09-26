/** Canonical phone size (Medium) — presets uniformly scale this exact layout. */
export const PHONE_BASE_WIDTH = 360
export const PHONE_BASE_HEIGHT = 780

export const PHONE_SCALE_DEFAULT = 100

export const PHONE_SIZE_PRESETS = [
  { value: 85, label: 'Small' },
  { value: 100, label: 'Medium' },
  { value: 110, label: 'Large' },
  { value: 120, label: 'Extra Large' },
]

const PRESET_VALUES = PHONE_SIZE_PRESETS.map((p) => p.value)

export function clampPhoneScale(value) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return PHONE_SCALE_DEFAULT

  let nearest = PRESET_VALUES[0]
  let minDiff = Math.abs(parsed - nearest)
  for (const preset of PRESET_VALUES) {
    const diff = Math.abs(parsed - preset)
    if (diff < minDiff) {
      minDiff = diff
      nearest = preset
    }
  }
  return nearest
}

export function getPhoneSizePreset(value) {
  const scale = clampPhoneScale(value)
  return PHONE_SIZE_PRESETS.find((p) => p.value === scale) ?? PHONE_SIZE_PRESETS[1]
}

export function getPhoneDimensions(scalePercent) {
  const scale = clampPhoneScale(scalePercent)
  const factor = scale / 100
  return {
    scale,
    factor,
    width: Math.round(PHONE_BASE_WIDTH * factor),
    height: Math.round(PHONE_BASE_HEIGHT * factor),
  }
}

/** Unfolded width is two cover screens, with no center hinge. */
export const FOLD_HINGE = 0
export const FOLD_OPEN_WIDTH = PHONE_BASE_WIDTH * 2 + FOLD_HINGE

function readViewport(viewportWidth, viewportHeight) {
  const width = viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920)
  const height = viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080)
  return {
    maxWidth: Math.max(PHONE_BASE_WIDTH, width - 36),
    maxHeight: Math.max(520, height - 36),
  }
}

/**
 * Medium = full 360×780 UI. Other presets scale the same layout uniformly
 * (every gap, icon, and font scales together).
 * Unfolded, the phone grows sideways into two screens and stays on screen.
 */
export function getPhoneScaleLayout(scalePercent, options = {}) {
  const { flipped = false, viewportWidth, viewportHeight } = options
  const { factor } = getPhoneDimensions(scalePercent)
  const { maxWidth, maxHeight } = readViewport(viewportWidth, viewportHeight)
  const openFit = Math.min(factor, maxWidth / FOLD_OPEN_WIDTH, maxHeight / PHONE_BASE_HEIGHT)
  const openFactor = Math.round(Math.max(openFit, 0.55) * 1000) / 1000
  const applied = flipped ? openFactor : factor
  const logicalWidth = flipped ? FOLD_OPEN_WIDTH : PHONE_BASE_WIDTH
  const width = Math.round(logicalWidth * applied)
  const height = Math.round(PHONE_BASE_HEIGHT * applied)

  return {
    factor: applied,
    logicalWidth,
    wrapperStyle: {
      width: `${width}px`,
      height: `${height}px`,
      position: 'relative',
    },
    phoneStyle: {
      width: `${logicalWidth}px`,
      height: `${PHONE_BASE_HEIGHT}px`,
      position: 'absolute',
      right: 0,
      bottom: 0,
      '--phone-factor': applied,
    },
  }
}
