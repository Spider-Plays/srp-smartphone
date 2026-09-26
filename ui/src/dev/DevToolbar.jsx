import { DEFAULT_WALLPAPER } from '../config/wallpapers'
import { HOME_APPS } from '../config/homeApps'
import { usePhone } from '../context/PhoneContext'
import { setDevServicesWorkerMode } from '../hooks/useNui'

const devApps = Object.fromEntries(HOME_APPS.map((app) => [app.id, true]))
devApps.contacts = true

const mockBootstrap = {
  citizenid: 'ABC123',
  phone: '555-1234',
  name: 'John Doe',
  money: { cash: 2500, bank: 15000 },
  settings: {
    wallpaper: DEFAULT_WALLPAPER,
    ringtone: 'opening',
    notifications: 1,
    vibration: 1,
    volume: 50,
    brightness: 75,
  },
  apps: devApps,
  properties: {
    apartments: [
      {
        id: 1,
        category: 'apartment',
        provider: 'srp-apartment',
        label: 'Apartment 43',
        buildingLabel: 'Tinsel Towers',
        apartmentNumber: 43,
      },
    ],
    houses: [
      {
        id: 12,
        category: 'house',
        provider: 'nolag_properties',
        label: 'Vinewood Hills Home',
        address: '123 Vinewood Blvd',
      },
    ],
  },
  marketCategories: [
    { id: 'all', label: 'All' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'items', label: 'Items' },
    { id: 'misc', label: 'Misc' },
  ],
  jobCenter: {
    enabled: true,
    jobs: [
      { id: 'unemployed', label: 'Unemployed', description: 'Leave your current position' },
      { id: 'taxi', label: 'Taxi', description: 'City cab service' },
      { id: 'trucker', label: 'Trucker', description: 'Long-haul freight' },
    ],
  },
  dispatchCategories: [
    { id: 'police', label: 'Police', description: 'Crime in progress' },
    { id: 'medical', label: 'Medical', description: 'Medical emergency' },
  ],
  emergencyConfig: {
    policeNumber: '911',
    medicalNumber: '811',
    dispatchNumber: '311',
  },
  serviceTypes: [],
  newsConfig: { appName: 'Weazel News', canPublish: true },
  docCategories: [
    { id: 'all', label: 'All' },
    { id: 'general', label: 'General' },
    { id: 'legal', label: 'Legal' },
  ],
}

const QUICK_NAV = [
  { label: 'Twitter', screen: 'chirp' },
  { label: 'Maps', screen: 'maps' },
  { label: 'Jobs', screen: 'jobs' },
  { label: 'Mail', screen: 'mail' },
  { label: 'LifeInvader', screen: 'market' },
  { label: 'Trade', screen: 'trading' },
  { label: 'Properties', screen: 'properties' },
  { label: 'Weather', screen: 'weather' },
  { label: 'Loans', screen: 'loans' },
  { label: 'Emergency', screen: 'dispatch' },
  { label: 'Services', screen: 'services' },
  { label: 'Notes', screen: 'notes' },
  { label: 'Calculator', screen: 'calculator' },
  { label: 'Invoices', screen: 'invoices' },
  { label: 'News', screen: 'news' },
  { label: 'Documents', screen: 'documents' },
]

const rowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  color: 'rgba(255, 255, 255, 1)',
}

const btnStyle = {
  color: 'rgba(255, 255, 255, 1)',
}

export default function DevToolbar() {
  const {
    visible,
    locked,
    openPhone,
    closePhone,
    navigate,
    unlock,
    notify,
    simulateIncomingCall,
    simulateMissedCall,
  } = usePhone()

  const triggerIncomingCall = (overrides = {}) => {
    const run = () => simulateIncomingCall(overrides)
    if (locked) {
      unlock()
      setTimeout(run, 250)
      return
    }
    run()
  }

  const openUnlocked = () => {
    openPhone(mockBootstrap)
    setTimeout(() => unlock(), 700)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: '#1a1a1a',
        padding: 12,
        borderRadius: 10,
        border: '1px solid #333',
        maxWidth: 320,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        color: 'rgba(255, 255, 255, 1)',
      }}
    >
      <strong style={{ marginBottom: 4 }}>SR Smartphone Dev</strong>
      <div style={rowStyle}>
        <button type="button" style={btnStyle} onClick={() => openPhone(mockBootstrap)}>
          Open (Locked)
        </button>
        <button type="button" style={btnStyle} onClick={openUnlocked}>
          Open (Unlocked)
        </button>
        {visible && (
          <button type="button" style={btnStyle} onClick={closePhone}>
            Close
          </button>
        )}
      </div>
      {visible && (
        <>
          <div style={rowStyle}>
            {QUICK_NAV.map(({ label, screen }) => (
              <button key={screen} type="button" style={btnStyle} onClick={() => navigate(screen)}>
                {label}
              </button>
            ))}
          </div>
          <div style={rowStyle}>
            <button
              type="button"
              style={btnStyle}
              onClick={() =>
                notify('Test Notification', 'This is a sample phone notification.', 'default')
              }
            >
              Notify
            </button>
            <button type="button" style={btnStyle} onClick={() => triggerIncomingCall()}>
              Incoming Call
            </button>
            <button type="button" style={btnStyle} onClick={() => simulateMissedCall()}>
              Missed Call
            </button>
            <button
              type="button"
              style={btnStyle}
              onClick={() =>
                triggerIncomingCall({ name: 'Anonymous', phone: 'Unknown', anonymous: true })
              }
            >
              Incoming (Anon)
            </button>
            <button
              type="button"
              style={btnStyle}
              onClick={() => navigate('chat', { phone: '555-0101', name: 'Jane Doe' })}
            >
              Open Chat
            </button>
            <button
              type="button"
              style={btnStyle}
              onClick={() => {
                setDevServicesWorkerMode(false)
                navigate('services')
              }}
            >
              Services
            </button>
            <button
              type="button"
              style={btnStyle}
              onClick={() => {
                setDevServicesWorkerMode(true)
                navigate('services', { tab: 'jobs' })
              }}
            >
              Services (Worker)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
