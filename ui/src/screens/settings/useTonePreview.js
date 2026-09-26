import { useCallback, useState } from 'react'
import { isTonePlaying, previewTone, stopPhoneTones } from '../../utils/phoneTones'

export function useTonePreview(kind = 'ring') {
  const [playingId, setPlayingId] = useState(null)

  const stop = useCallback(() => {
    stopPhoneTones()
    setPlayingId(null)
  }, [])

  const play = useCallback(
    async (toneId, volume = 50) => {
      stop()
      const ok = await previewTone(toneId, kind, volume)
      if (ok) setPlayingId(toneId)
    },
    [kind, stop]
  )

  const toggle = useCallback(
    async (toneId, volume = 50) => {
      if (playingId === toneId && isTonePlaying()) {
        stop()
        return false
      }
      await play(toneId, volume)
      return true
    },
    [playingId, play, stop]
  )

  return { playingId, play, stop, toggle }
}
