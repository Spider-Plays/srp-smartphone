import { usePhone } from '../context/PhoneContext'

export default function LockScreen() {
  const { unlock, isUnlocking } = usePhone()
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className={`lockscreen${isUnlocking ? ' unlocking' : ''}`}>
      <div className="lockscreen-time">{time}</div>
      <div className="lockscreen-date">{date}</div>
      <button type="button" className="home-indicator unlock" onClick={unlock} aria-label="Unlock phone" />
    </div>
  )
}
