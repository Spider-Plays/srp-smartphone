import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function LoanDetailScreen() {
  const { goBack, screenParams, notify, setBootstrap } = usePhone()
  const loanId = screenParams.loanId
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    if (!loanId) return
    setLoading(true)
    const result = await fetchNui('getLoanDetail', { loanId })
    if (result?.ok && result.data) {
      setDetail(result.data)
      if (result.data.bank != null) {
        setBootstrap((b) => ({ ...b, money: { ...b.money, bank: result.data.bank } }))
      }
    }
    setLoading(false)
  }, [loanId, setBootstrap])

  useEffect(() => {
    load()
  }, [load])

  const payNext = async () => {
    setPaying(true)
    const result = await fetchNui('payLoan', { loanId })
    setPaying(false)

    if (result?.ok) {
      notify('Payment Sent', 'Installment paid successfully', 'loans')
      if (result.bank != null) {
        setBootstrap((b) => ({ ...b, money: { ...b.money, bank: result.bank } }))
      }
      if (result.detail) setDetail(result.detail)
      else load()
      return
    }

    const errors = {
      insufficient: 'Insufficient bank balance',
      no_payment_due: 'No payment due right now',
      not_found: 'Loan not found',
    }
    notify('Payment Failed', errors[result?.error] || 'Could not process payment', 'loans')
  }

  const toggleAutopay = async () => {
    if (!detail?.loan) return
    const result = await fetchNui('setLoanAutopay', {
      loanId,
      enabled: !detail.loan.autopay,
    })
    if (result?.ok && result.detail) {
      setDetail(result.detail)
      notify('Autopay', result.detail.loan.autopay ? 'Enabled' : 'Disabled', 'loans')
    }
  }

  const loan = detail?.loan
  const isActive = loan?.status === 'active'
  const closedLabel = loan?.closedAt
    ? new Date(loan.closedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <AppScreen
      title={loan?.productLabel || 'Loan'}
      subtitle={
        isActive
          ? loan.nextDueLabel
          : closedLabel
            ? `${loan.status === 'paid' ? 'Paid off' : 'Closed'} · ${closedLabel}`
            : loan?.status
      }
      onBack={goBack}
      className="loans-app loans-detail-app"
    >
      {loading && !loan ? (
        <div className="loans-loading">Loading loan…</div>
      ) : loan ? (
        <div className="loans-detail">
          <div className="loans-detail-summary">
            <div>
              <span>{isActive ? 'Balance remaining' : 'Amount borrowed'}</span>
              <strong>{fmt(isActive ? loan.balance : loan.principal)}</strong>
            </div>
            <div>
              <span>Installment</span>
              <strong>{fmt(loan.paymentAmount)}</strong>
            </div>
            <div>
              <span>Progress</span>
              <strong>
                {loan.paymentsMade}/{loan.paymentsTotal}
              </strong>
            </div>
            <div>
              <span>APR</span>
              <strong>{loan.aprPercent}%</strong>
            </div>
          </div>

          <div className="loans-progress-bar">
            <div
              className="loans-progress-fill"
              style={{ width: `${Math.min(100, (loan.paymentsMade / loan.paymentsTotal) * 100)}%` }}
            />
          </div>

          {isActive ? (
            <div className="loans-detail-actions">
              <button type="button" className="loans-submit-btn" onClick={payNext} disabled={paying}>
                {paying ? 'Processing…' : `Pay ${fmt(loan.paymentAmount)}`}
              </button>
              <button type="button" className="loans-secondary-btn" onClick={toggleAutopay}>
                Autopay: {loan.autopay ? 'On' : 'Off'}
              </button>
            </div>
          ) : (
            <div className="loans-paid-badge">
              <CheckCircle2 size={20} />
              Loan {loan.status}
            </div>
          )}

          <p className="phone-section-label">{isActive ? 'Payment schedule' : 'Payment history'}</p>
          <div className="loans-payment-list">
            {(detail.payments || []).map((p) => (
              <div key={p.id} className={`loans-payment-row loans-payment-row--${p.status}`}>
                <div className="loans-payment-left">
                  {p.status === 'paid' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  <div>
                    <div>Payment #{p.installment}</div>
                    <div className="loans-payment-due">
                      {p.status === 'paid'
                        ? p.paidAt
                          ? `Paid ${new Date(p.paidAt * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : 'Paid'
                        : p.dueLabel}
                    </div>
                  </div>
                </div>
                <div className="loans-payment-amt">{fmt(p.status === 'paid' ? p.amountPaid || p.amountDue : p.amountDue)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="loans-loading">Loan not found.</div>
      )}
    </AppScreen>
  )
}
