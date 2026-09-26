/** Screens that stay on the left pane. A selection opens on the right. */
const FOLD_LIST_SCREENS = new Set(['messages', 'contacts', 'garage', 'properties', 'loans'])

/** These take the whole inner display instead of sitting beside a menu. */
const FOLD_SPAN_FIRST = new Set(['lock', 'home', 'camera', 'call'])

/** Stretched edge to edge across both screens, never split. */
const FOLD_FULL_SCREENS = new Set(['maps'])

/**
 * Unfolded layout derived from the existing screen stack.
 * List screens keep the menu on the left. The screen you open is the right pane.
 * Everything else uses the full inner display and can split itself.
 */
export function getFoldLayout(screen, screenParams, screenStack) {
  if (FOLD_FULL_SCREENS.has(screen)) {
    return { mode: 'full', screen, params: screenParams || {} }
  }

  if (!screen || FOLD_SPAN_FIRST.has(screen)) {
    return { mode: 'span', screen, params: screenParams || {} }
  }

  if (FOLD_LIST_SCREENS.has(screen)) {
    return {
      mode: 'split',
      left: screen,
      leftParams: screenParams || {},
      right: null,
      rightParams: null,
    }
  }

  const parent = [...(screenStack || [])].reverse().find(
    (entry) => entry?.screen && entry.screen !== screen && entry.screen !== 'home' && entry.screen !== 'lock'
  )

  if (parent) {
    return {
      mode: 'split',
      left: parent.screen,
      leftParams: parent.params || {},
      right: screen,
      rightParams: screenParams || {},
    }
  }

  return { mode: 'span', screen, params: screenParams || {} }
}
