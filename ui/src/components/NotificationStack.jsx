import { usePhone } from '../context/PhoneContext'
import { getNotificationIcon } from './notificationIcons'
import {
  canNavigateNotification,
  handleNotificationTap,
} from '../utils/notificationNavigation'

export default function NotificationStack() {
  const { notifications, dismissNotification, navigate, locked, unlock } = usePhone()

  if (!notifications.length) return null

  const onTap = (n) => {
    handleNotificationTap(n, {
      navigate,
      dismissNotification,
      locked,
      unlock,
    })
  }

  return (
    <div className="notification-container">
      {notifications.map((n) => {
        const Icon = getNotificationIcon(n)
        const clickable = canNavigateNotification(n)
        return (
          <div
            key={n.id}
            className={`notification-item${clickable ? ' is-clickable' : ''}`}
            onClick={() => clickable && onTap(n)}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
          >
            <div className="notification-icon">
              <Icon size={20} color="#000" />
            </div>
            <div className="notification-content">
              <div className="notification-header">
                <span className="notification-title">{n.title}</span>
                <span className="notification-time">{n.time}</span>
              </div>
              <p className="notification-message">{n.message}</p>
            </div>
            <button
              type="button"
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation()
                dismissNotification(n.id)
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
