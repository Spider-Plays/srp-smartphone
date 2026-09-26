import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { fetchNui } from '../../../hooks/useNui'
import TradingActionTray, { TradingActionItem } from '../trading/TradingActionTray'
import { getTemplateIcon } from './constants'

export default function SendDocumentSheet({
  title,
  icon = 'document',
  onClose,
  onSend,
  loading = false,
}) {
  const [playerId, setPlayerId] = useState('')
  const [targets, setTargets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const iconMeta = getTemplateIcon(icon)

  useEffect(() => {
    fetchNui('getDocSendTargets').then((list) => setTargets(Array.isArray(list) ? list : []))
  }, [])

  const parsedId = parseInt(playerId, 10)
  const manualValid = Number.isFinite(parsedId) && parsedId > 0
  const canSend = selectedId != null || manualValid

  const handleSend = () => {
    if (!canSend || loading) return
    if (selectedId != null) {
      onSend(selectedId)
      return
    }
    onSend(parsedId)
  }

  return (
    <div className="trading-overlay" role="presentation" onClick={() => !loading && onClose()}>
      <div
        className="trading-overlay-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Send document"
      >
        <div className="trading-trade-panel doc-send-panel">
          <div className="trading-trade-panel-body">
            <div className="trading-sheet-header">
              <div className="trading-sheet-title">
                <span className="trading-symbol-badge doc-send-badge">
                  <iconMeta.Icon size={20} strokeWidth={2} />
                </span>
                <div>
                  <strong>Send document</strong>
                  <span>{title || 'Untitled document'}</span>
                </div>
              </div>
              <button type="button" className="phone-app-back" onClick={onClose} aria-label="Close" disabled={loading}>
                <X size={18} />
              </button>
            </div>

            {targets.length > 0 && (
              <>
                <p className="phone-section-label">Online contacts</p>
                <div className="doc-send-targets">
                  {targets.map((t) => (
                    <button
                      key={`${t.serverId}-${t.phone}`}
                      type="button"
                      className={`doc-send-target${selectedId === t.serverId ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedId(t.serverId)
                        setPlayerId('')
                      }}
                    >
                      <span className="doc-send-target-name">{t.name}</span>
                      <span className="doc-send-target-meta">ID {t.serverId} · {t.phone}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="phone-form-group">
              <label>{targets.length > 0 ? 'Or player ID' : 'Player ID'}</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 1"
                value={playerId}
                onChange={(e) => {
                  setPlayerId(e.target.value)
                  setSelectedId(null)
                }}
              />
            </div>

            <div className="trading-sheet-hint">
              {targets.length === 0
                ? 'Add contacts in the Phone app. Only online players can receive documents.'
                : 'Pick a contact or enter a server ID. Recipient gets a Documents notification.'}
            </div>
          </div>

          <TradingActionTray>
            <TradingActionItem icon={X} label="Cancel" onClick={onClose} disabled={loading} />
            <TradingActionItem
              icon={Check}
              label={loading ? 'Wait' : 'Send'}
              variant="buy"
              active
              disabled={loading || !canSend}
              onClick={handleSend}
            />
          </TradingActionTray>
        </div>
      </div>
    </div>
  )
}
