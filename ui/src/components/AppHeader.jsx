import { ChevronLeft } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'
import './AppHeader.css'

export default function AppHeader({ title, onBack, right, subtitle }) {
  const { goBack } = usePhone()

  return (
    <header className="app-header">
      <button type="button" className="header-back" onClick={onBack || goBack} aria-label="Back">
        <ChevronLeft size={20} />
      </button>
      <div className="header-titles">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-right">{right || <span />}</div>
    </header>
  )
}
