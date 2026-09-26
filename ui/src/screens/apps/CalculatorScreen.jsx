import { useCallback, useMemo, useState } from 'react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'

const KEYS = [
  { id: 'clear', label: 'AC', type: 'fn' },
  { id: 'sign', label: '±', type: 'fn' },
  { id: 'percent', label: '%', type: 'fn' },
  { id: 'divide', label: '÷', type: 'op' },
  { id: '7', label: '7', type: 'num' },
  { id: '8', label: '8', type: 'num' },
  { id: '9', label: '9', type: 'num' },
  { id: 'multiply', label: '×', type: 'op' },
  { id: '4', label: '4', type: 'num' },
  { id: '5', label: '5', type: 'num' },
  { id: '6', label: '6', type: 'num' },
  { id: 'subtract', label: '−', type: 'op' },
  { id: '1', label: '1', type: 'num' },
  { id: '2', label: '2', type: 'num' },
  { id: '3', label: '3', type: 'num' },
  { id: 'add', label: '+', type: 'op' },
  { id: '0', label: '0', type: 'num', wide: true },
  { id: 'decimal', label: '.', type: 'num' },
  { id: 'equals', label: '=', type: 'eq' },
]

const OP_KEY = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
}

function formatDisplay(value) {
  if (value === 'Error') return value
  const str = String(value)
  if (str.endsWith('.')) {
    const base = str.slice(0, -1)
    if (!base || base === '-') return `${base}.`
    const n = Number(base)
    if (!Number.isFinite(n)) return str
    const formatted = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
    return `${n < 0 ? '-' : ''}${formatted}.`
  }

  const num = Number(value)
  if (!Number.isFinite(num)) return 'Error'

  if (str.includes('e') || str.replace(/[-.]/g, '').length > 12) {
    return num.toPrecision(8).replace(/\.?0+e/, 'e')
  }

  const negative = num < 0
  const abs = Math.abs(num)
  const parts = String(abs).split('.')
  const intPart = Number(parts[0]).toLocaleString('en-US', { maximumFractionDigits: 0 })
  const formatted = parts.length === 1 ? intPart : `${intPart}.${parts[1]}`
  return negative ? `-${formatted}` : formatted
}

function compute(a, b, op) {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return b === 0 ? null : a / b
    default:
      return b
  }
}

export default function CalculatorScreen() {
  const { goBack } = usePhone()
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState(null)
  const [operator, setOperator] = useState(null)
  const [fresh, setFresh] = useState(true)

  const displaySize = useMemo(() => {
    const len = display.replace(/,/g, '').length
    if (len > 9) return 'calc-display-sm'
    if (len > 6) return 'calc-display-md'
    return ''
  }, [display])

  const setDisplayRaw = useCallback((val) => {
    if (val === null || !Number.isFinite(val)) {
      setDisplay('Error')
      setStored(null)
      setOperator(null)
      setFresh(true)
      return
    }
    const s = String(val)
    if (s.length > 14) {
      setDisplay(String(Number(val.toPrecision(10))))
    } else {
      setDisplay(s)
    }
  }, [])

  const inputDigit = useCallback(
    (digit) => {
      if (display === 'Error') {
        setDisplay(digit === '.' ? '0.' : digit)
        setFresh(false)
        return
      }
      if (fresh) {
        setDisplay(digit === '.' ? '0.' : digit)
        setFresh(false)
        return
      }
      if (digit === '.' && display.includes('.')) return
      if (display === '0' && digit !== '.') {
        setDisplay(digit)
        return
      }
      if (display.replace(/[.,-]/g, '').length >= 12) return
      setDisplay(display + digit)
    },
    [display, fresh]
  )

  const clearAll = useCallback(() => {
    setDisplay('0')
    setStored(null)
    setOperator(null)
    setFresh(true)
  }, [])

  const toggleSign = useCallback(() => {
    if (display === 'Error' || display === '0') return
    setDisplay(display.startsWith('-') ? display.slice(1) : `-${display}`)
  }, [display])

  const applyPercent = useCallback(() => {
    const n = parseFloat(display.replace(/,/g, ''))
    if (!Number.isFinite(n)) return
    setDisplayRaw(n / 100)
    setFresh(true)
  }, [display, setDisplayRaw])

  const chooseOperator = useCallback(
    (op) => {
      const current = parseFloat(display.replace(/,/g, ''))
      if (display === 'Error') return

      if (stored !== null && operator && !fresh) {
        const result = compute(stored, current, operator)
        if (result === null) {
          setDisplay('Error')
          setStored(null)
          setOperator(null)
          setFresh(true)
          return
        }
        setStored(result)
        setDisplayRaw(result)
      } else {
        setStored(current)
      }

      setOperator(op)
      setFresh(true)
    },
    [display, stored, operator, fresh, setDisplayRaw]
  )

  const equals = useCallback(() => {
    if (operator === null || stored === null || display === 'Error') return
    const current = parseFloat(display.replace(/,/g, ''))
    const result = compute(stored, current, operator)
    setDisplayRaw(result)
    setStored(null)
    setOperator(null)
    setFresh(true)
  }, [display, stored, operator, setDisplayRaw])

  const onKey = useCallback(
    (id) => {
      if (id >= '0' && id <= '9') inputDigit(id)
      else if (id === 'decimal') inputDigit('.')
      else if (id === 'clear') clearAll()
      else if (id === 'sign') toggleSign()
      else if (id === 'percent') applyPercent()
      else if (id === 'equals') equals()
      else if (id === 'add') chooseOperator('+')
      else if (id === 'subtract') chooseOperator('-')
      else if (id === 'multiply') chooseOperator('*')
      else if (id === 'divide') chooseOperator('/')
    },
    [inputDigit, clearAll, toggleSign, applyPercent, equals, chooseOperator]
  )

  const isOpActive = (keyId) => operator && OP_KEY[operator] === keyId

  return (
    <AppScreen title="Calculator" className="calculator-app" onBack={goBack}>
      <div className="calc-shell">
        <output
          className={`calc-display ${displaySize}`.trim()}
          aria-live="polite"
          htmlFor="calc-keypad"
        >
          <span className="calc-display-value">{formatDisplay(display)}</span>
        </output>

        <div className="calc-keypad" id="calc-keypad">
          {KEYS.map((key) => (
            <button
              key={key.id}
              type="button"
              className={[
                'calc-key',
                `calc-key-${key.type}`,
                key.wide ? 'calc-key-wide' : '',
                isOpActive(key.id) ? 'calc-key-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onKey(key.id)}
              aria-label={key.label}
            >
              {key.label}
            </button>
          ))}
        </div>
      </div>
    </AppScreen>
  )
}
