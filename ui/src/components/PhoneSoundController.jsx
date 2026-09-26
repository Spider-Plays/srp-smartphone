import { usePhoneSounds } from '../hooks/usePhoneSounds'

/** Wires ringtone + notification tone playback to phone state. */
export default function PhoneSoundController() {
  usePhoneSounds()
  return null
}
