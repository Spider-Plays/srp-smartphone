import { useEffect, useRef, useState } from 'react'

const MIN_STRENGTH = 0
const MAX_STRENGTH = 4

function clampStrength(value) {
  return Math.max(MIN_STRENGTH, Math.min(MAX_STRENGTH, Math.round(value)))
}

function pickNextStrength(current, anchor) {
  const roll = Math.random()

  if (roll < 0.12) return clampStrength(current - 1)
  if (roll < 0.22) return clampStrength(current + 1)
  if (roll < 0.42) return clampStrength(anchor)

  const drift = Math.floor(Math.random() * 3) - 1
  return clampStrength(anchor + drift)
}

function randomDelay() {
  return 1200 + Math.random() * 3800
}

/**
 * Fluctuating cellular bars; optionally anchored to a server/base strength (0–4).
 */
export function useNetworkSignal({ enabled = true, anchor = 4 } = {}) {
  const [strength, setStrength] = useState(() => clampStrength(anchor))
  const anchorRef = useRef(clampStrength(anchor))
  const timeoutRef = useRef(null)

  useEffect(() => {
    anchorRef.current = clampStrength(anchor)
  }, [anchor])

  useEffect(() => {
    if (!enabled) return undefined

    setStrength((s) => {
      const next = clampStrength(anchorRef.current)
      return Math.abs(s - next) > 2 ? next : s
    })

    const schedule = () => {
      timeoutRef.current = setTimeout(() => {
        setStrength((current) => pickNextStrength(current, anchorRef.current))
        schedule()
      }, randomDelay())
    }

    schedule()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled])

  return strength
}
