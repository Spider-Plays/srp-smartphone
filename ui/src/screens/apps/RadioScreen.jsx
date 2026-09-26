import { useEffect, useState } from 'react'
import { Pause, Play, Radio } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

export default function RadioScreen() {
  const { goBack, notify } = usePhone()
  const [stations, setStations] = useState([])
  const [playing, setPlaying] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNui('getRadioStations').then((res) => {
      setStations(res?.stations || [])
      setLoading(false)
    })
  }, [])

  const play = async (station) => {
    const res = await fetchNui('playRadioStation', { stationId: station.id })
    if (res?.ok) {
      setPlaying(station.id)
      notify('Radio', `Now playing ${station.label}`, 'default')
    }
  }

  const stop = async () => {
    await fetchNui('stopRadio')
    setPlaying(null)
  }

  return (
    <AppScreen className="radio-app" title="Radio" subtitle="Los Santos stations" onBack={goBack}>
      {loading ? (
        <div className="phone-empty"><Radio size={48} /><p>Loading stations...</p></div>
      ) : (
        <>
          {playing && (
            <button type="button" className="radio-stop-btn" onClick={stop}>
              <Pause size={18} /> Stop playback
            </button>
          )}
          {stations.map((station) => (
            <button
              key={station.id}
              type="button"
              className={`radio-station-card ${playing === station.id ? 'playing' : ''}`}
              onClick={() => play(station)}
            >
              <div className="radio-station-icon">
                {playing === station.id ? <Pause size={22} /> : <Play size={22} />}
              </div>
              <div className="radio-station-body">
                <h3>{station.label}</h3>
                <p>{station.genre} · {station.frequency} FM</p>
              </div>
            </button>
          ))}
        </>
      )}
    </AppScreen>
  )
}
