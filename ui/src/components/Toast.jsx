import { motion } from 'framer-motion'
import { Briefcase, MessageCircle } from 'lucide-react'
import './Toast.css'

export default function Toast({ data, onDismiss, onTap }) {
  const handleClick = () => {
    onTap?.()
    onDismiss?.()
  }

  return (
    <motion.div
      className="phone-toast"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={handleClick}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <div className="toast-icon">
        {data.type === 'job' ? <Briefcase size={18} /> : <MessageCircle size={18} />}
      </div>
      <div>
        <strong>{data.name || data.title || 'Notification'}</strong>
        <p>{data.message || data.body}</p>
      </div>
    </motion.div>
  )
}
