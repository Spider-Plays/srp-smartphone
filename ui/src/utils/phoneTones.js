/**
 * Web Audio tone engine — long looping ringtones vs short notification tones.
 */

/** @typedef {{ freq: number, duration: number, type?: OscillatorType, gap?: number, dual?: number }} ToneStep */

/** Pause after each full ring phrase before the pattern repeats (seconds). */
const RING_PHRASE_TAIL_GAP = 2.2

/** Maps legacy / DB ids to current preset ids. */
export const RING_ALIASES = {
  default: 'opening',
  classic: 'opening',
  modern: 'electronic',
  digital: 'ring_ring',
  melody: 'marimba',
  chime: 'reflection',
  pulse: 'radar',
  rhythm: 'xylophone',
}

/**
 * Common smartphone-style ringtones (~4–10 s per cycle).
 * Melodic recreations (not copyrighted recordings).
 * @type {Record<string, ToneStep[]>}
 */
export const RING_PATTERNS = {
  /** Iconic 13-note mobile “Opening” phrase (Nokia-style). */
  opening: [
    { freq: 659, duration: 0.125 },
    { freq: 587, duration: 0.125 },
    { freq: 523, duration: 0.125 },
    { freq: 494, duration: 0.125 },
    { freq: 392, duration: 0.25 },
    { freq: 440, duration: 0.125 },
    { freq: 494, duration: 0.125 },
    { freq: 523, duration: 0.125 },
    { freq: 587, duration: 0.125 },
    { freq: 659, duration: 0.125 },
    { freq: 587, duration: 0.125 },
    { freq: 523, duration: 0.25 },
    { freq: 523, duration: 0.4, gap: RING_PHRASE_TAIL_GAP },
  ],

  /** iPhone-style marimba “Opening” ring. */
  marimba: [
    { freq: 392, duration: 0.16, type: 'triangle' },
    { freq: 523, duration: 0.16, type: 'triangle' },
    { freq: 659, duration: 0.2, type: 'triangle' },
    { freq: 784, duration: 0.2, type: 'triangle' },
    { freq: 1047, duration: 0.28, type: 'triangle' },
    { freq: 784, duration: 0.16, type: 'triangle' },
    { freq: 659, duration: 0.16, type: 'triangle' },
    { freq: 523, duration: 0.2, type: 'triangle' },
    { freq: 392, duration: 0.32, type: 'triangle', gap: 0.45 },
    { freq: 523, duration: 0.16, type: 'triangle' },
    { freq: 659, duration: 0.16, type: 'triangle' },
    { freq: 784, duration: 0.22, type: 'triangle' },
    { freq: 988, duration: 0.38, type: 'triangle', gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Android-style three-note ascending tri-tone. */
  tritone: [
    { freq: 349, duration: 0.42 },
    { freq: 440, duration: 0.42, gap: 0.1 },
    { freq: 523, duration: 0.55, gap: 0.15 },
    { freq: 349, duration: 0.42 },
    { freq: 440, duration: 0.42, gap: 0.1 },
    { freq: 523, duration: 0.65, gap: RING_PHRASE_TAIL_GAP },
  ],

  /**
   * Traditional desk-phone ringing (dual-tone, ring–pause–ring–long silence).
   * Prefer bundled WAV when available (see RING_SOUND_FILES).
   */
  phone_ringing: [
    { freq: 440, duration: 0.4, dual: 480 },
    { freq: 440, duration: 0.4, dual: 480, gap: 0.2 },
    { freq: 440, duration: 0.4, dual: 480 },
    { freq: 440, duration: 0.4, dual: 480, gap: 3.0 },
  ],

  /** Classic landline / GSM dual-tone “ring-ring”. */
  ring_ring: [
    { freq: 440, duration: 0.6, dual: 480 },
    { freq: 440, duration: 0.6, dual: 480, gap: 0.2 },
    { freq: 440, duration: 0.6, dual: 480 },
    { freq: 440, duration: 0.6, dual: 480, gap: 0.2 },
    { freq: 480, duration: 0.6, dual: 440 },
    { freq: 480, duration: 0.6, dual: 440, gap: RING_PHRASE_TAIL_GAP },
  ],

  /** BlackBerry-style “Radar” ping bursts. */
  radar: [
    { freq: 988, duration: 0.09 },
    { freq: 988, duration: 0.09, gap: 0.07 },
    { freq: 988, duration: 0.09, gap: 0.07 },
    { freq: 988, duration: 0.09, gap: 0.45 },
    { freq: 1175, duration: 0.09 },
    { freq: 1175, duration: 0.09, gap: 0.07 },
    { freq: 1175, duration: 0.09, gap: 0.07 },
    { freq: 1175, duration: 0.09, gap: 0.45 },
    { freq: 1319, duration: 0.11 },
    { freq: 1319, duration: 0.11, gap: 0.08 },
    { freq: 1319, duration: 0.11, gap: 0.08 },
    { freq: 1319, duration: 0.11, gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Bright xylophone preset (common factory tone). */
  xylophone: [
    { freq: 1319, duration: 0.2, type: 'triangle' },
    { freq: 1175, duration: 0.2, type: 'triangle' },
    { freq: 1047, duration: 0.2, type: 'triangle' },
    { freq: 988, duration: 0.2, type: 'triangle' },
    { freq: 784, duration: 0.25, type: 'triangle', gap: 0.35 },
    { freq: 1047, duration: 0.2, type: 'triangle' },
    { freq: 1175, duration: 0.2, type: 'triangle' },
    { freq: 1319, duration: 0.2, type: 'triangle' },
    { freq: 1568, duration: 0.35, type: 'triangle', gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Playful pinball-style bounce (popular preset). */
  pinball: [
    { freq: 523, duration: 0.14, type: 'square' },
    { freq: 659, duration: 0.14, type: 'square' },
    { freq: 784, duration: 0.14, type: 'square', gap: 0.08 },
    { freq: 659, duration: 0.14, type: 'square' },
    { freq: 523, duration: 0.14, type: 'square' },
    { freq: 392, duration: 0.14, type: 'square', gap: 0.08 },
    { freq: 523, duration: 0.14, type: 'square' },
    { freq: 659, duration: 0.14, type: 'square' },
    { freq: 784, duration: 0.14, type: 'square' },
    { freq: 1047, duration: 0.22, type: 'square', gap: 0.35 },
    { freq: 784, duration: 0.14, type: 'square' },
    { freq: 1047, duration: 0.28, type: 'square', gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Station bell (common “Bell” preset). */
  bell: [
    { freq: 622, duration: 0.8 },
    { freq: 784, duration: 0.95, gap: 0.3 },
    { freq: 622, duration: 0.8 },
    { freq: 988, duration: 1.0, gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Vintage rotary / desk phone ring. */
  old_phone: [
    { freq: 440, duration: 0.22, dual: 480 },
    { freq: 440, duration: 0.22, dual: 480, gap: 0.14 },
    { freq: 440, duration: 0.22, dual: 480 },
    { freq: 440, duration: 0.22, dual: 480, gap: 0.14 },
    { freq: 440, duration: 0.22, dual: 480 },
    { freq: 440, duration: 0.22, dual: 480, gap: 0.14 },
    { freq: 480, duration: 0.22, dual: 440 },
    { freq: 480, duration: 0.22, dual: 440, gap: 0.14 },
    { freq: 440, duration: 0.22, dual: 480 },
    { freq: 440, duration: 0.22, dual: 480, gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Soft reflective melody (common “Reflection”-style preset). */
  reflection: [
    { freq: 587, duration: 0.45 },
    { freq: 659, duration: 0.45 },
    { freq: 784, duration: 0.55 },
    { freq: 880, duration: 0.65 },
    { freq: 784, duration: 0.45 },
    { freq: 659, duration: 0.45, gap: 0.5 },
    { freq: 523, duration: 0.45 },
    { freq: 659, duration: 0.45 },
    { freq: 784, duration: 0.6 },
    { freq: 988, duration: 0.75, gap: RING_PHRASE_TAIL_GAP },
  ],

  /** Modern electronic call tone. */
  electronic: [
    { freq: 392, duration: 0.2, type: 'square' },
    { freq: 494, duration: 0.2, type: 'square' },
    { freq: 587, duration: 0.2, type: 'square' },
    { freq: 784, duration: 0.32, type: 'square' },
    { freq: 587, duration: 0.2, type: 'square' },
    { freq: 494, duration: 0.2, type: 'square', gap: 0.3 },
    { freq: 523, duration: 0.2, type: 'square' },
    { freq: 659, duration: 0.2, type: 'square' },
    { freq: 784, duration: 0.2, type: 'square' },
    { freq: 1047, duration: 0.45, type: 'square', gap: RING_PHRASE_TAIL_GAP },
  ],
}

/** Short notification / SMS tones (~0.2–0.5 s). */
/** @type {Record<string, ToneStep[]>} */
export const MESSAGE_PATTERNS = {
  ding: [
    { freq: 880, duration: 0.12 },
    { freq: 1175, duration: 0.18 },
  ],
  note: [
    { freq: 698, duration: 0.15 },
    { freq: 880, duration: 0.2 },
  ],
  pop: [
    { freq: 587, duration: 0.06, type: 'square' },
    { freq: 784, duration: 0.1, type: 'square' },
  ],
  chime: [
    { freq: 659, duration: 0.14 },
    { freq: 784, duration: 0.14 },
    { freq: 988, duration: 0.2 },
  ],
  digital: [
    { freq: 523, duration: 0.05, type: 'square' },
    { freq: 784, duration: 0.08, type: 'square' },
    { freq: 1047, duration: 0.12, type: 'square' },
  ],
}

const DEFAULT_RING = 'opening'

/** Outgoing calls use this until the other player answers. */
export const OUTGOING_RINGTONE = 'phone_ringing'
const DEFAULT_MESSAGE = 'ding'

const RING_MASTER_GAIN = 0.38
const MESSAGE_MASTER_GAIN = 0.32

/** Bundled WAV loops (copied to web/sounds/ringtones/ on build). */
export const RING_SOUND_FILES = {
  phone_ringing: './sounds/ringtones/phone_ringing.wav',
}

let ctx = null
/** @type {OscillatorNode[]} */
let oscillators = []
/** @type {GainNode[]} */
let gains = []
let loopTimer = null
let patternEndTimer = null
let playingMode = null
/** @type {HTMLAudioElement | null} */
let ringAudio = null

export function normalizeRingtoneId(id) {
  if (!id) return DEFAULT_RING
  const mapped = RING_ALIASES[id] || id
  if (RING_PATTERNS[mapped] || RING_SOUND_FILES[mapped]) return mapped
  return DEFAULT_RING
}

export function normalizeMessageToneId(id) {
  if (!id) return DEFAULT_MESSAGE
  return MESSAGE_PATTERNS[id] ? id : DEFAULT_MESSAGE
}

export function getRingtoneCycleSeconds(toneId) {
  const steps = RING_PATTERNS[normalizeRingtoneId(toneId)]
  if (!steps) return 0
  return patternDuration(steps)
}

async function ensureContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!ctx) ctx = new AudioCtx()
  if (ctx.state === 'uspended') {
    try {
      await ctx.resume()
    } catch {
      return null
    }
  }
  return ctx
}

function clearTimers() {
  if (loopTimer) {
    clearTimeout(loopTimer)
    loopTimer = null
  }
  if (patternEndTimer) {
    clearTimeout(patternEndTimer)
    patternEndTimer = null
  }
}

function stopNodes() {
  oscillators.forEach((osc) => {
    try {
      osc.stop()
    } catch {
      /* already stopped */
    }
  })
  oscillators = []
  gains = []
}

function stopRingAudio() {
  if (!ringAudio) return
  try {
    ringAudio.pause()
    ringAudio.currentTime = 0
  } catch {
    /* ignore */
  }
  ringAudio.onended = null
  ringAudio = null
}

export function stopPhoneTones() {
  clearTimers()
  stopNodes()
  stopRingAudio()
  playingMode = null
}

function volumeToGain(volumePercent, base = RING_MASTER_GAIN) {
  return Math.max(0, Math.min(1, (volumePercent ?? 50) / 100)) * base
}

async function playRingSoundFile(id, volumePercent, loop) {
  const src = RING_SOUND_FILES[id]
  if (!src) return false

  stopRingAudio()
  clearTimers()
  stopNodes()

  const audio = new Audio(src)
  audio.volume = Math.min(1, volumeToGain(volumePercent, 1))
  audio.loop = loop
  audio.preload = 'auto'

  try {
    await audio.play()
    ringAudio = audio
    audio.onended = () => {
      if (ringAudio !== audio) return
      if (!audio.loop) {
        stopRingAudio()
        if (playingMode === 'preview' || playingMode === 'ring') playingMode = null
      }
    }
    return true
  } catch {
    stopRingAudio()
    return false
  }
}

function patternDuration(steps) {
  return steps.reduce((sum, step) => sum + step.duration + (step.gap || 0), 0)
}

function scheduleStep(audioCtx, master, cursor, step, { ring = false } = {}) {
  const freqs = step.dual ? [step.freq, step.dual] : [step.freq]
  const attack = ring ? 0.03 : 0.02
  const release = ring ? 0.04 : 0.02

  freqs.forEach((freq) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = step.type || 'sine'
    osc.frequency.value = freq
    const peak = step.dual ? 0.55 : 1
    const noteEnd = cursor + step.duration
    gain.gain.setValueAtTime(0.001, cursor)
    gain.gain.exponentialRampToValueAtTime(peak, cursor + attack)
    gain.gain.exponentialRampToValueAtTime(0.001, Math.max(cursor + attack + 0.01, noteEnd - release))
    osc.connect(gain)
    gain.connect(master)
    osc.start(cursor)
    osc.stop(cursor + step.duration + 0.03)
    oscillators.push(osc)
    gains.push(gain)
  })

  return cursor + step.duration + (step.gap || 0)
}

function playPattern(audioCtx, steps, volumePercent, { loop = false, ring = false, onComplete } = {}) {
  stopNodes()
  clearTimers()

  const master = audioCtx.createGain()
  const base = ring ? RING_MASTER_GAIN : MESSAGE_MASTER_GAIN
  const vol = Math.max(0, Math.min(1, (volumePercent ?? 50) / 100)) * base
  master.gain.value = vol
  master.connect(audioCtx.destination)
  gains.push(master)

  let cursor = audioCtx.currentTime
  steps.forEach((step) => {
    cursor = scheduleStep(audioCtx, master, cursor, step, { ring })
  })

  const totalSec = patternDuration(steps)
  patternEndTimer = setTimeout(() => {
    patternEndTimer = null
    stopNodes()
    if (loop) {
      loopTimer = setTimeout(() => {
        loopTimer = null
        if (playingMode === 'ring') {
          playPattern(audioCtx, steps, volumePercent, { loop: true, ring: true, onComplete })
        }
      }, 80)
    } else if (onComplete) {
      onComplete()
    }
  }, totalSec * 1000 + 60)
}

export async function playRingtone(toneId, volumePercent = 50) {
  const id = normalizeRingtoneId(toneId)

  stopPhoneTones()
  playingMode = 'ring'

  if (RING_SOUND_FILES[id]) {
    const ok = await playRingSoundFile(id, volumePercent, true)
    if (ok) return true
    playingMode = null
  }

  const steps = RING_PATTERNS[id]
  const audioCtx = await ensureContext()
  if (!audioCtx || !steps) {
    playingMode = null
    return false
  }

  playingMode = 'ring'
  playPattern(audioCtx, steps, volumePercent, { loop: true, ring: true })
  return true
}

export async function playMessageTone(toneId, volumePercent = 50) {
  const id = normalizeMessageToneId(toneId)
  const steps = MESSAGE_PATTERNS[id]
  const audioCtx = await ensureContext()
  if (!audioCtx || !steps) return false

  if (playingMode === 'ring') return false
  stopPhoneTones()
  playingMode = 'message'
  playPattern(audioCtx, steps, volumePercent, {
    loop: false,
    ring: false,
    onComplete: () => {
      if (playingMode === 'message') playingMode = null
    },
  })
  return true
}

/** Settings preview: one full ring cycle (not a short beep). */
export async function previewTone(toneId, kind = 'ring', volumePercent = 50) {
  const isRing = kind === 'ring'
  const id = isRing ? normalizeRingtoneId(toneId) : normalizeMessageToneId(toneId)

  stopPhoneTones()
  playingMode = 'preview'

  if (isRing && RING_SOUND_FILES[id]) {
    const ok = await playRingSoundFile(id, volumePercent, false)
    if (ok) return true
  }

  const audioCtx = await ensureContext()
  if (!audioCtx) {
    playingMode = null
    return false
  }

  const steps = isRing ? RING_PATTERNS[id] : MESSAGE_PATTERNS[id]
  if (!steps) {
    playingMode = null
    return false
  }

  playPattern(audioCtx, steps, volumePercent, {
    loop: false,
    ring: isRing,
    onComplete: () => {
      if (playingMode === 'preview') playingMode = null
    },
  })
  return true
}

export function isTonePlaying() {
  return playingMode !== null || (ringAudio !== null && !ringAudio.paused)
}
