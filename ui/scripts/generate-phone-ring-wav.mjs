/**
 * Generates a looping landline-style dual-tone ring WAV for NUI playback.
 * Run: node scripts/generate-phone-ring-wav.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sampleRate = 22050
const cycleSec = 4
const samples = Math.floor(sampleRate * cycleSec)
const pcm = Buffer.alloc(samples * 2)

/** US-style ring: ~400ms on, 200ms off, 400ms on, then ~3s silence. */
function levelAt(timeSec) {
  const cycle = timeSec % cycleSec
  const inFirst = cycle < 0.4
  const inSecond = cycle >= 0.6 && cycle < 1.0
  if (!inFirst && !inSecond) return 0

  const local = inFirst ? cycle : cycle - 0.6
  const fade = 0.025
  if (local < fade) return local / fade
  if (local > 0.4 - fade) return Math.max(0, (0.4 - local) / fade)
  return 1
}

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate
  const env = levelAt(t)
  const tone =
    env *
    0.32 *
    (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t))
  const int16 = Math.max(-32768, Math.min(32767, Math.round(tone * 32767)))
  pcm.writeInt16LE(int16, i * 2)
}

function writeWav(filePath, pcmData, rate) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcmData.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcmData.length, 40)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, Buffer.concat([header, pcmData]))
}

const out = path.join(__dirname, '../public/sounds/ringtones/phone_ringing.wav')
writeWav(out, pcm, sampleRate)
console.log(`Wrote ${out} (${cycleSec}s loop)`)
