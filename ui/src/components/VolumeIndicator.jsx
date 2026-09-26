import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'

export default function VolumeIndicator() {
  const { showVolumeIndicator, volume } = usePhone()
  if (!showVolumeIndicator) return null

  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2

  return (
    <div className="volume-indicator">
      <Icon size={28} />
      <div className="volume-bar">
        <div className="volume-level" style={{ height: `${volume}%` }} />
      </div>
    </div>
  )
}
