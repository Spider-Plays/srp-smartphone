import { useEffect, useState } from 'react'
import {
  Bell,
  Scale,
  Gavel,
  ScrollText,
  Shield,
  HeartPulse,
  Phone,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const NAV_TABS = [
  { id: 'emergency', label: 'Emergency', icon: Bell },
  { id: 'lawyers', label: 'Lawyers', icon: Scale },
  { id: 'judges', label: 'Judges', icon: Gavel },
  { id: 'legislation', label: 'Legislation', icon: ScrollText },
]

const TAB_TITLES = {
  emergency: 'Emergency',
  lawyers: 'Lawyers',
  judges: 'Judges',
  legislation: 'Legislation',
}

function EmergencyTab({ onCall, onSend, message, setMessage, loading, config }) {
  const policeNum = config?.policeNumber || '911'
  const medicalNum = config?.medicalNumber || '811'
  const dispatchNum = config?.dispatchNumber || '311'

  return (
    <>
      <p className="emergency-section-label">Emergency Lines</p>
      <div className="emergency-line-card">
        <div className="emergency-line-icon police">
          <Shield size={22} strokeWidth={2} />
        </div>
        <div className="emergency-line-info">
          <div className="emergency-line-number">{policeNum}</div>
          <div className="emergency-line-type">Police</div>
        </div>
        <button type="button" className="emergency-call-btn police" onClick={() => onCall('police')} aria-label="Call police">
          <Phone size={18} />
        </button>
      </div>

      <div className="emergency-line-card">
        <div className="emergency-line-icon medical">
          <HeartPulse size={22} strokeWidth={2} />
        </div>
        <div className="emergency-line-info">
          <div className="emergency-line-number">{medicalNum}</div>
          <div className="emergency-line-type">Medical</div>
        </div>
        <button type="button" className="emergency-call-btn medical" onClick={() => onCall('medical')} aria-label="Call medical">
          <Phone size={18} />
        </button>
      </div>

      <p className="emergency-section-label emergency-section-spacer">Non-Emergency</p>
      <div className="emergency-message-card">
        <textarea
          className="emergency-message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the situation..."
          rows={4}
        />
        <div className="emergency-message-footer">
          <span className="emergency-dispatch-label">
            <MessageSquare size={14} />
            Dispatch • {dispatchNum}
          </span>
          <button type="button" className="emergency-send-btn" disabled={loading} onClick={onSend}>
            SEND
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

function LawyerItem({ lawyer, onCall, onMessage }) {
  const initial = (lawyer.name || '?').charAt(0).toUpperCase()
  return (
    <div className="emergency-lawyer-item">
      <div className="emergency-lawyer-avatar">{initial}</div>
      <div className="emergency-lawyer-body">
        <div className="emergency-lawyer-name-row">
          <span className="emergency-lawyer-name">{lawyer.name}</span>
          {lawyer.online && <span className="emergency-online-dot" />}
        </div>
        {lawyer.specialty && <span className="emergency-specialty-tag">{lawyer.specialty}</span>}
        <div className="emergency-lawyer-phone">{lawyer.phone}</div>
      </div>
      <div className="emergency-lawyer-actions">
        <button type="button" className="emergency-action-btn" onClick={() => onCall(lawyer.phone)} aria-label="Call">
          <Phone size={20} />
        </button>
        <button type="button" className="emergency-action-btn" onClick={() => onMessage(lawyer)} aria-label="Message">
          <MessageSquare size={20} />
        </button>
      </div>
    </div>
  )
}

function LawyersTab({ lawyers, onCall, onMessage }) {
  const [subTab, setSubTab] = useState('active')
  const activeLawyers = lawyers.filter((l) => l.online)
  const list = subTab === 'active' ? activeLawyers : lawyers

  return (
    <>
      <div className="phone-app-subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={subTab === 'active'} className={`phone-app-subtab ${subTab === 'active' ? 'active' : ''}`} onClick={() => setSubTab('active')}>
          Active
        </button>
        <button type="button" role="tab" aria-selected={subTab === 'find'} className={`phone-app-subtab ${subTab === 'find' ? 'active' : ''}`} onClick={() => setSubTab('find')}>
          Find a Lawyer
        </button>
      </div>
      {list.length === 0 ? (
        <p className="emergency-empty emergency-empty-inline">{subTab === 'active' ? 'No lawyers online' : 'No lawyers found'}</p>
      ) : (
        list.map((lawyer) => (
          <LawyerItem key={lawyer.phone || lawyer.name} lawyer={lawyer} onCall={onCall} onMessage={onMessage} />
        ))
      )}
    </>
  )
}

function JudgesTab({ judges, proceedings, onCall, onMessage }) {
  return (
    <>
      {judges.map((judge) => (
        <LawyerItem key={judge.phone || judge.name} lawyer={judge} onCall={onCall} onMessage={onMessage} />
      ))}
      <div className="emergency-section-block">
        <p className="emergency-section-label">Proceedings</p>
        {proceedings.length === 0 ? (
          <p className="emergency-empty">No proceedings scheduled</p>
        ) : (
          proceedings.map((item) => (
            <div key={item.id} className="emergency-lawyer-item">
              <div className="emergency-lawyer-body">
                <span className="emergency-lawyer-name">{item.title}</span>
                {item.time && <div className="emergency-lawyer-phone">{item.time}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function LegislationTab({ legislation }) {
  if (legislation.length === 0) {
    return <p className="emergency-empty emergency-empty-center">No legislation found</p>
  }

  return legislation.map((item) => (
    <div key={item.id} className="emergency-lawyer-item">
      <div className="emergency-lawyer-body">
        <span className="emergency-lawyer-name">{item.title}</span>
        {item.summary && <div className="emergency-lawyer-phone">{item.summary}</div>}
      </div>
    </div>
  ))
}

export default function DispatchScreen() {
  const { notify, navigate, bootstrap, setActiveCall } = usePhone()
  const [tab, setTab] = useState('emergency')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ lawyers: [], judges: [], proceedings: [], legislation: [] })

  const config = bootstrap?.emergencyConfig || {}

  useEffect(() => {
    fetchNui('getEmergencyData').then((res) => {
      if (res) setData(res)
    })
  }, [])

  const dispatchErrors = {
    rate_limit: 'Too many reports — wait a moment and try again',
    not_loaded: 'Character not loaded — reopen your phone',
    database: 'Dispatch could not be saved — contact staff',
    invalid: 'Invalid report — try again',
    callback_failed: 'Phone could not reach the server — restart the resource',
  }

  const sendDispatch = async (category, body = '') => {
    setLoading(true)
    const res = await fetchNui('sendDispatch', { category, message: body })
    setLoading(false)
    if (res?.ok) {
      notify('Emergency', category === 'medical' ? 'Medical services notified' : 'Emergency reported — stay on scene', 'default')
      if (body) setMessage('')
    } else {
      const detail = dispatchErrors[res?.error] || 'Could not send report'
      notify('Emergency', detail, 'error')
    }
  }

  const handleEmergencyCall = (category) => sendDispatch(category, `Emergency call — ${category}`)

  const handleDispatchSend = () => {
    if (!message.trim()) return
    sendDispatch('other', message.trim())
  }

  const handleCall = async (phone) => {
    if (!phone) return
    const res = await fetchNui('startCall', { phone })
    if (res?.ok) {
      setActiveCall({
        callId: res.callId,
        name: res.name || phone,
        phone: res.phone || phone,
        ringing: true,
      })
      navigate('call', {
        phone: res.phone || phone,
        name: res.name,
        outgoing: true,
        callId: res.callId,
      })
    } else {
      notify('Emergency', 'Could not place call', 'error')
    }
  }

  const handleMessage = (lawyer) => {
    navigate('chat', { phone: lawyer.phone, name: lawyer.name })
  }

  const renderContent = () => {
    switch (tab) {
      case 'lawyers':
        return <LawyersTab lawyers={data.lawyers} onCall={handleCall} onMessage={handleMessage} />
      case 'judges':
        return <JudgesTab judges={data.judges} proceedings={data.proceedings} onCall={handleCall} onMessage={handleMessage} />
      case 'legislation':
        return <LegislationTab legislation={data.legislation} />
      default:
        return (
          <EmergencyTab
            config={config}
            message={message}
            setMessage={setMessage}
            loading={loading}
            onCall={handleEmergencyCall}
            onSend={handleDispatchSend}
          />
        )
    }
  }

  return (
    <AppScreen
      className="emergency-app"
      title={TAB_TITLES[tab]}
      subtitle={tab === 'judges' && data.judges.length === 0 ? 'No judges online' : undefined}
      tabs={NAV_TABS}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      {renderContent()}
    </AppScreen>
  )
}
