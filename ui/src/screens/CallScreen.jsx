import { useEffect, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { formatPhone } from '../utils/streamerMode'

export default function CallScreen() {
  const {
    screenParams,
    goBack,
    activeCall,
    setActiveCall,
    stopIncomingRing,
    streamerMode,
    callAnonymous,
  } = usePhone()
  const { phone, name, incoming, outgoing, callId: existingId, dispatch, message: dispatchMessage } = screenParams
  const [status, setStatus] = useState(incoming ? 'incoming' : outgoing ? 'calling' : 'active')
  const [callId, setCallId] = useState(existingId)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(false)

  useEffect(() => {
    if (outgoing && !callId && phone) {
      fetchNui('startCall', { phone, anonymous: callAnonymous }).then((r) => {
        if (r?.ok) {
          setCallId(r.callId)
          setActiveCall({
            callId: r.callId,
            name: r.name || name,
            phone: r.phone || phone,
            ringing: true,
          })
        }
      })
    }
  }, [outgoing, phone, name, callId, setActiveCall, callAnonymous])

  useEffect(() => {
    if (!outgoing || !activeCall) return
    if (activeCall.answered || activeCall.ringing === false) {
      setStatus('active')
    }
  }, [outgoing, activeCall])

  const answer = async () => {
    stopIncomingRing()
    setStatus('active')
    await fetchNui('answerCall', { callId })
  }

  const decline = async () => {
    stopIncomingRing()
    await fetchNui('declineCall', { callId })
    goBack()
  }

  const end = async () => {
    stopIncomingRing()
    setActiveCall(null)
    await fetchNui('endCall', { callId })
    goBack()
  }

  const statusText = dispatch
    ? status === 'incoming'
      ? '911 emergency...'
      : status === 'active'
        ? 'Dispatch received'
        : '911'
    : status === 'incoming'
      ? 'Incoming call...'
      : status === 'calling'
        ? 'Calling...'
        : 'On call'

  const callPhase =
    status === 'incoming' ? 'is-incoming' : status === 'calling' ? 'is-outgoing' : 'is-active'

  return (
    <div className={`calling-screen ${callPhase}`}>
      <div className="call-info-section">
        <div className="calling-avatar">{(name || phone || '?').charAt(0)}</div>
        <div className="calling-name">{name || formatPhone(phone, streamerMode)}</div>
        <div className="calling-number">{formatPhone(phone, streamerMode)}</div>
        {dispatch && dispatchMessage && status === 'incoming' && (
          <p className="calling-dispatch-detail">{dispatchMessage}</p>
        )}
        <div className="calling-status">{statusText}</div>
      </div>

      <div className="call-controls-section">
        {status === 'active' && (
          <div className="call-controls">
            <button
              type="button"
              className={`call-control-btn ${muted ? 'active' : ''}`}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <MicOff size={22} /> : <Mic size={22} />}
              <span className="control-label">{muted ? 'Muted' : 'Mute'}</span>
            </button>
            <button
              type="button"
              className={`call-control-btn ${speaker ? 'active' : ''}`}
              onClick={() => setSpeaker(!speaker)}
            >
              {speaker ? <VolumeX size={22} /> : <Volume2 size={22} />}
              <span className="control-label">Speaker</span>
            </button>
          </div>
        )}

        <div className="call-controls">
          {status === 'incoming' && (
            <>
              <button type="button" className="call-control-btn" onClick={decline}>
                <PhoneOff size={22} />
                <span className="control-label">Decline</span>
              </button>
              <button type="button" className="call-control-btn active" onClick={answer}>
                <Phone size={22} />
                <span className="control-label">Answer</span>
              </button>
            </>
          )}
          {(status === 'calling' || status === 'active') && (
            <button type="button" className="end-call-btn" onClick={end}>
              <Phone size={26} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
