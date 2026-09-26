import { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseIso(value) {
  if (!value || typeof value !== 'string') return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function toIso(date) {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function formatDisplay(iso) {
  const d = parseIso(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function startOfMonth(year, month) {
  return new Date(year, month, 1)
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export default function DocDateField({ value, onChange, readOnly = false, placeholder = 'Select date' }) {
  const parsed = parseIso(value)
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth())

  const calendarDays = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth)
    const total = daysInMonth(viewYear, viewMonth)
    const startPad = first.getDay()
    const cells = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let day = 1; day <= total; day++) cells.push(day)
    return cells
  }, [viewYear, viewMonth])

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const pickDay = (day) => {
    if (!day) return
    onChange(toIso(new Date(viewYear, viewMonth, day)))
    setOpen(false)
  }

  const pickToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onChange(toIso(now))
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setOpen(false)
  }

  if (readOnly) {
    return (
      <input
        type="text"
        className="doc-date-input"
        value={formatDisplay(value) || '—'}
        readOnly
      />
    )
  }

  return (
    <div className={`doc-date-field${open ? ' open' : ''}`}>
      <button
        type="button"
        className="doc-date-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={value ? '' : 'placeholder'}>{formatDisplay(value) || placeholder}</span>
        <Calendar size={18} />
      </button>

      {open && (
        <div className="doc-date-calendar" role="dialog" aria-label="Choose date">
          <div className="doc-date-calendar-header">
            <button type="button" className="doc-date-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <span className="doc-date-month-label">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className="doc-date-nav" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="doc-date-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="doc-date-grid">
            {calendarDays.map((day, idx) => {
              const isSelected =
                day &&
                parsed &&
                parsed.getFullYear() === viewYear &&
                parsed.getMonth() === viewMonth &&
                parsed.getDate() === day
              const isToday =
                day &&
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day
              return (
                <button
                  key={idx}
                  type="button"
                  className={[
                    'doc-date-day',
                    !day ? 'empty' : '',
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!day}
                  onClick={() => pickDay(day)}
                >
                  {day || ''}
                </button>
              )
            })}
          </div>

          <div className="doc-date-calendar-footer">
            <button type="button" className="doc-date-footer-btn" onClick={clear}>
              Clear
            </button>
            <button type="button" className="doc-date-footer-btn primary" onClick={pickToday}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
