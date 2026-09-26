import { useEffect, useState } from 'react'
import { Users, X } from 'lucide-react'
import { fetchNui } from '../../hooks/useNui'

export default function GalleryNearbyShare({ photo, onClose, onShared, busy }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchNui('getNearbyPlayers')
      .then((list) => setPlayers(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false))
  }, [])

  const shareTo = async (person) => {
    if (!person?.phone || busy) return
    setError('')
    const result = await fetchNui('shareGalleryPhoto', {
      photoId: photo.id,
      phone: person.phone,
    })
    if (result?.ok) {
      onShared?.(person)
      onClose()
    } else if (result?.error === 'rate_limit') {
      setError('Too many messages. Wait a moment.')
    } else {
      setError('Could not share photo.')
    }
  }

  return (
    <div className="glry-sheet-root" role="presentation">
      <button type="button" className="glry-sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="glry-sheet" role="dialog" aria-label="Share with nearby">
        <div className="glry-sheet-handle" />
        <header className="glry-sheet-header">
          <h3>
            <Users size={18} />
            Share Nearby
          </h3>
          <button type="button" className="glry-sheet-close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <p className="glry-nearby-hint">Sends the photo in Messages to a player nearby (they must have People Nearby enabled).</p>
        {loading ? (
          <p className="glry-nearby-status">Finding players…</p>
        ) : players.length === 0 ? (
          <p className="glry-nearby-status">No players nearby with sharing enabled.</p>
        ) : (
          <div className="glry-nearby-list">
            {players.map((person) => (
              <button
                key={person.phone}
                type="button"
                className="glry-nearby-row"
                disabled={busy}
                onClick={() => shareTo(person)}
              >
                <span className="glry-nearby-avatar">{(person.name || '?').charAt(0)}</span>
                <span className="glry-nearby-name">{person.name || person.phone}</span>
                <span className="glry-nearby-dist">{person.distance}m</span>
              </button>
            ))}
          </div>
        )}
        {error ? <p className="glry-import-error">{error}</p> : null}
      </div>
    </div>
  )
}
