import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgePercent,
  Briefcase,
  Car,
  ChevronRight,
  CreditCard,
  History,
  Shield,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

function formatLoanDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLabel(status) {
  if (status === 'paid') return 'Paid off'
  if (status === 'defaulted') return 'Defaulted'
  return status
}

const ICONS = {
  zap: Zap,
  user: User,
  car: Car,
  briefcase: Briefcase,
}

const BAND_COLORS = {
  excellent: '#34c759',
  good: '#30d158',
  fair: '#ff9f0a',
  poor: '#ff453a',
}

function ScoreRing({ score, band, bandLabel }) {
  const color = BAND_COLORS[band] || '#7ee8ca'
  const pct = Math.max(0, Math.min(100, ((score - 300) / 550) * 100))

  return (
    <div className="loans-score-card">
      <div className="loans-score-ring" style={{ '--score-color': color, '--score-pct': `${pct}%` }}>
        <div className="loans-score-value">{score}</div>
        <div className="loans-score-band">{bandLabel}</div>
      </div>
      <div className="loans-score-meta">
        <div>
          <span>Credit band</span>
          <strong style={{ color }}>{bandLabel}</strong>
        </div>
      </div>
    </div>
  )
}

function LoanRow({ loan, onOpen, history = false, active = false }) {
  const statusClass =
    loan.status === 'paid' ? 'paid' : loan.status === 'defaulted' ? 'defaulted' : 'active'
  const closedLabel = formatLoanDate(loan.closedAt)
  const openedLabel = formatLoanDate(loan.createdAt)

  return (
    <button type="button" className={`loans-loan-row${active ? ' is-active' : ''}`} onClick={() => onOpen(loan)}>
      <div className="loans-loan-row-main">
        <div className="loans-loan-title">{loan.productLabel}</div>
        {history ? (
          <div className="loans-loan-sub">
            Borrowed {fmt(loan.principal)} · {loan.paymentsMade}/{loan.paymentsTotal} paid
            {closedLabel ? ` · Closed ${closedLabel}` : openedLabel ? ` · Opened ${openedLabel}` : ''}
          </div>
        ) : (
          <>
            <div className="loans-loan-sub">
              Balance {fmt(loan.balance)} · {loan.paymentsMade}/{loan.paymentsTotal} paid
            </div>
            {loan.status === 'active' && loan.nextDueLabel ? (
              <div className="loans-loan-due">{loan.nextDueLabel}</div>
            ) : null}
          </>
        )}
      </div>
      <div className={`loans-loan-status loans-loan-status--${statusClass}`}>{statusLabel(loan.status)}</div>
      <ChevronRight size={18} />
    </button>
  )
}

export default function LoansScreen() {
  const { goBack, navigate, notify, setBootstrap, phoneFlipped, screen, screenParams } = usePhone()
  const openLoanId = phoneFlipped && screen === 'loan-detail' ? screenParams?.loanId : null
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchNui('getLoansData')
    if (result?.ok && result.data) {
      setData(result.data)
      if (result.data.bank != null) {
        setBootstrap((b) => ({ ...b, money: { ...b.money, bank: result.data.bank } }))
      }
    }
    setLoading(false)
  }, [setBootstrap])

  useEffect(() => {
    load()
  }, [load])

  const credit = data?.credit
  const activeLoans = useMemo(
    () => (data?.loans || []).filter((l) => l.status === 'active'),
    [data?.loans]
  )
  const historyLoans = useMemo(
    () => (data?.loans || []).filter((l) => l.status !== 'active'),
    [data?.loans]
  )

  const openApply = (product) => {
    navigate('loan-apply', { product })
  }

  const openLoan = (loan) => {
    navigate('loan-detail', { loanId: loan.id })
  }

  return (
    <AppScreen
      title="Loans"
      subtitle={data?.lenderName || 'Maze Bank'}
      onBack={goBack}
      className="loans-app"
      tabs={[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'history', label: 'History', icon: History },
        { id: 'products', label: 'Products', icon: BadgePercent },
        { id: 'credit', label: 'Credit', icon: Shield },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    >
      {loading && !data ? (
        <div className="loans-loading">Loading lending profile…</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="loans-tab">
              {credit ? (
                <ScoreRing score={credit.score} band={credit.band} bandLabel={credit.bandLabel} />
              ) : null}

              {data?.blacklisted ? (
                <div className="loans-alert loans-alert--warn">
                  Lending is temporarily restricted due to a recent default.
                </div>
              ) : null}

              <p className="phone-section-label">Active loans</p>
              {activeLoans.length === 0 ? (
                <div className="loans-empty">No active loans. Browse products to apply.</div>
              ) : (
                activeLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} onOpen={openLoan} active={openLoanId === loan.id} />
                ))
              )}

              <button type="button" className="loans-cta" onClick={() => setTab('products')}>
                <CreditCard size={20} />
                Apply for a loan
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {tab === 'history' && (
            <div className="loans-tab">
              <p className="phone-section-label">Loan history</p>
              {historyLoans.length === 0 ? (
                <div className="loans-empty">No past loans yet. Completed and defaulted loans appear here.</div>
              ) : (
                historyLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} onOpen={openLoan} history active={openLoanId === loan.id} />
                ))
              )}
            </div>
          )}

          {tab === 'products' && (
            <div className="loans-tab">
              <p className="phone-section-label">Loan products</p>
              {(data?.products || []).map((product) => {
                const Icon = ICONS[product.icon] || User
                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`loans-product-card${product.eligible ? '' : ' loans-product-card--locked'}`}
                    onClick={() => {
                      if (!product.eligible) {
                        notify('Not Eligible', `Requires credit score ${product.minCreditScore}+`, 'loans')
                        return
                      }
                      openApply(product)
                    }}
                  >
                    <div className="loans-product-icon">
                      <Icon size={22} />
                    </div>
                    <div className="loans-product-body">
                      <div className="loans-product-title">{product.label}</div>
                      <div className="loans-product-desc">{product.description}</div>
                      <div className="loans-product-meta">
                        {fmt(product.minAmount)} – {fmt(product.maxAmount)} for you
                        {product.maxAmountCap > product.maxAmount
                          ? ` · up to ${fmt(product.maxAmountCap)} at excellent credit`
                          : ''}
                        {' · '}from {product.aprPercent}% APR
                      </div>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                )
              })}
            </div>
          )}

          {tab === 'credit' && credit ? (
            <div className="loans-tab">
              <ScoreRing score={credit.score} band={credit.band} bandLabel={credit.bandLabel} />
              <div className="loans-credit-grid">
                <div className="loans-stat-card">
                  <span>Total borrowed</span>
                  <strong>{fmt(credit.totalBorrowed)}</strong>
                </div>
                <div className="loans-stat-card">
                  <span>Total repaid</span>
                  <strong>{fmt(credit.totalRepaid)}</strong>
                </div>
                <div className="loans-stat-card">
                  <span>On-time payments</span>
                  <strong>{credit.onTimePayments}</strong>
                </div>
                <div className="loans-stat-card">
                  <span>Missed payments</span>
                  <strong>{credit.missedPayments}</strong>
                </div>
                <div className="loans-stat-card">
                  <span>Open loans</span>
                  <strong>{credit.openLoans}</strong>
                </div>
              </div>
              <p className="loans-credit-tip">
                Pay on time to improve your score. Higher scores unlock larger borrowing limits and lower APR.
                Missed payments and defaults will lower it and may restrict future lending.
              </p>
            </div>
          ) : null}
        </>
      )}
    </AppScreen>
  )
}
