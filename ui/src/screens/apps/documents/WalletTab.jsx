import { useEffect, useState } from 'react'
import { Car, Fish, IdCard, Plane, Shield, Target } from 'lucide-react'
import { fetchNui } from '../../../hooks/useNui'

const CARD_ICONS = {
  id: IdCard,
  car: Car,
  shield: Shield,
  target: Target,
  fish: Fish,
  plane: Plane,
}

export default function WalletTab() {
  const [cards, setCards] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNui('getWalletCards').then((res) => {
      const list = res?.cards || []
      setCards(list)
      setSelected(list[0] || null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="phone-empty">
        <IdCard size={48} />
        <p>Loading wallet...</p>
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="phone-empty">
        <IdCard size={48} />
        <p>No ID cards available</p>
      </div>
    )
  }

  const Icon = selected ? (CARD_ICONS[selected.icon] || IdCard) : IdCard

  return (
    <div className="wallet-tab">
      <div className="wallet-card-strip">
        {cards.map((card) => {
          const CIcon = CARD_ICONS[card.icon] || IdCard
          return (
            <button
              key={card.id}
              type="button"
              className={`wallet-chip ${selected?.id === card.id ? 'active' : ''} ${card.valid ? '' : 'invalid'}`}
              onClick={() => setSelected(card)}
            >
              <CIcon size={16} />
              <span>{card.label}</span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className={`wallet-id-card ${selected.valid ? 'valid' : 'revoked'}`}>
          <div className="wallet-id-header">
            <Icon size={28} />
            <div>
              <span className="wallet-id-state">State of San Andreas</span>
              <h3>{selected.label}</h3>
            </div>
            <span className={`wallet-id-status ${selected.valid ? 'ok' : 'bad'}`}>
              {selected.valid ? 'VALID' : 'NOT ISSUED'}
            </span>
          </div>
          <div className="wallet-id-photo" aria-hidden>
            <Icon size={40} strokeWidth={1.25} />
          </div>
          <dl className="wallet-id-fields">
            <div><dt>Name</dt><dd>{selected.holderName}</dd></div>
            <div><dt>State ID</dt><dd>{selected.stateId}</dd></div>
            <div><dt>DOB</dt><dd>{selected.dob}</dd></div>
            <div><dt>Gender</dt><dd>{selected.gender}</dd></div>
            <div><dt>Phone</dt><dd>{selected.phone}</dd></div>
            <div><dt>Nationality</dt><dd>{selected.nationality}</dd></div>
            <div><dt>Issued</dt><dd>{selected.issued}</dd></div>
          </dl>
        </div>
      )}
    </div>
  )
}
