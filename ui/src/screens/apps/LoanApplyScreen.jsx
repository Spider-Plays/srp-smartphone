import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function LoanApplyScreen() {
  const { goBack, screenParams, notify, navigate } = usePhone()
  const product = screenParams.product || {}
  const maxAmount = product.maxAmount || product.maxAmountCap || 1000
  const maxAmountCap = product.maxAmountCap || maxAmount
  const [amount, setAmount] = useState(String(Math.min(product.minAmount || 1000, maxAmount)))
  const [termDays, setTermDays] = useState(product.minTermDays || 7)
  const [quote, setQuote] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [termOpen, setTermOpen] = useState(false)
  const termRef = useRef(null)

  const termOptions = useMemo(() => {
    const min = product.minTermDays || 7
    const max = product.maxTermDays || 30
    const options = []
    for (let d = min; d <= max; d += d < 14 ? 1 : 7) {
      options.push(d)
    }
    if (!options.includes(max)) options.push(max)
    return [...new Set(options)].sort((a, b) => a - b)
  }, [product.minTermDays, product.maxTermDays])

  const refreshQuote = useCallback(async () => {
    const parsedAmount = Math.floor(Number(amount))
    if (!parsedAmount || !product.id) return

    const result = await fetchNui('previewLoan', {
      productId: product.id,
      amount: parsedAmount,
      termDays,
    })
    setQuote(result?.ok ? result.quote : null)
  }, [amount, termDays, product.id])

  useEffect(() => {
    const timer = setTimeout(refreshQuote, 200)
    return () => clearTimeout(timer)
  }, [refreshQuote])

  useEffect(() => {
    const parsed = Math.floor(Number(amount))
    if (parsed > maxAmount) {
      setAmount(String(maxAmount))
    }
  }, [amount, maxAmount])

  useEffect(() => {
    if (!termOpen) return undefined

    const onPointerDown = (e) => {
      if (termRef.current && !termRef.current.contains(e.target)) {
        setTermOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [termOpen])

  const apply = async () => {
    const parsedAmount = Math.floor(Number(amount))
    if (!parsedAmount || !product.id) return

    setSubmitting(true)
    const result = await fetchNui('applyLoan', {
      productId: product.id,
      amount: parsedAmount,
      termDays,
    })
    setSubmitting(false)

    if (result?.ok) {
      notify('Loan Approved', `${fmt(parsedAmount)} deposited to your bank`, 'loans')
      navigate('loan-detail', { loanId: result.loanId })
      return
    }

    const errors = {
      low_credit: 'Credit score too low for this product',
      max_loans: 'You already have the maximum active loans for this product',
      blacklisted: 'Lending is temporarily restricted',
      invalid_amount: 'Amount exceeds your credit-based borrowing limit',
      invalid_term: 'Term is outside allowed range',
      rate_limit: 'Please wait before applying again',
    }
    notify('Application Denied', errors[result?.error] || 'Could not approve loan', 'loans')
  }

  return (
    <AppScreen
      title="Apply"
      subtitle={product.label || 'Loan'}
      onBack={goBack}
      className="loans-app loans-apply-app"
    >
      <div className="loans-apply-form">
        <div className="loans-field">
          <label htmlFor="loan-amount">Loan amount</label>
          <input
            id="loan-amount"
            type="number"
            min={product.minAmount}
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="loans-field-hint">
            {fmt(product.minAmount)} – {fmt(maxAmount)} for your credit score
            {maxAmountCap > maxAmount ? ` (up to ${fmt(maxAmountCap)} with excellent credit)` : ''}
          </span>
        </div>

        <div className="loans-field">
          <span className="loans-field-label" id="loan-term-label">
            Term (days)
          </span>
          <div className="loans-term-select" ref={termRef}>
            <button
              type="button"
              id="loan-term"
              className="loans-term-trigger"
              aria-haspopup="listbox"
              aria-expanded={termOpen}
              aria-labelledby="loan-term-label"
              onClick={() => setTermOpen((open) => !open)}
            >
              <span>{termDays} days</span>
              <ChevronDown size={18} className={termOpen ? 'loans-term-chevron--open' : ''} />
            </button>
            {termOpen ? (
              <div className="loans-term-menu" role="listbox" aria-labelledby="loan-term-label">
                {termOptions.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="option"
                    aria-selected={termDays === d}
                    className={`loans-term-option${termDays === d ? ' loans-term-option--active' : ''}`}
                    onClick={() => {
                      setTermDays(d)
                      setTermOpen(false)
                    }}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {quote ? (
          <div className="loans-quote-card">
            <div className="loans-quote-row">
              <span>APR</span>
              <strong>{quote.aprPercent}%</strong>
            </div>
            <div className="loans-quote-row">
              <span>Origination fee</span>
              <strong>{fmt(quote.originationFee)}</strong>
            </div>
            <div className="loans-quote-row">
              <span>Total interest</span>
              <strong>{fmt(quote.totalInterest)}</strong>
            </div>
            <div className="loans-quote-row">
              <span>Payment amount</span>
              <strong>{fmt(quote.paymentAmount)}</strong>
            </div>
            <div className="loans-quote-row">
              <span>Payments</span>
              <strong>
                {quote.paymentsTotal} × every {quote.paymentIntervalHours}h
              </strong>
            </div>
            <div className="loans-quote-total">
              <span>Total repayable</span>
              <strong>{fmt(quote.totalRepay)}</strong>
            </div>
          </div>
        ) : null}

        <button type="button" className="loans-submit-btn" onClick={apply} disabled={submitting || !quote}>
          {submitting ? 'Processing…' : 'Submit application'}
        </button>
      </div>
    </AppScreen>
  )
}
