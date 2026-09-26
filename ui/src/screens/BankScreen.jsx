import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Building2, Clock, History, LayoutDashboard, Send } from 'lucide-react'
import AppScreen from '../components/AppScreen'
import { usePhone } from '../context/PhoneContext'
import { fetchNui, useNuiEvent } from '../hooks/useNui'

function toHistoryList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.history)) return data.history
  return []
}

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0)

export default function BankScreen() {
  const { bootstrap, setBootstrap, goBack, notify, screenParams } = usePhone()
  const [tab, setTab] = useState(screenParams?.tab || 'overview')
  const [targetId, setTargetId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const bank = bootstrap?.money?.bank ?? 0
  const cash = bootstrap?.money?.cash ?? 0

  const loadHistory = useCallback(() => {
    fetchNui('getBankHistory').then((h) => setHistory(toHistoryList(h)))
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (screenParams?.tab) setTab(screenParams.tab)
  }, [screenParams?.tab])

  useNuiEvent(
    useCallback(
      (msg) => {
        if (msg.action === 'bankTransaction' || msg.action === 'updateMoney') {
          loadHistory()
        }
      },
      [loadHistory]
    )
  )

  const transfer = async () => {
    const parsedAmount = parseInt(amount, 10)
    if (!targetId || !parsedAmount || parsedAmount <= 0) {
      notify('Transfer Error', 'Invalid amount or player ID', 'bank')
      return
    }
    if (parsedAmount > bank) {
      notify('Transfer Error', 'Insufficient funds', 'bank')
      return
    }

    setLoading(true)
    const result = await fetchNui('bankTransferById', {
      targetId: parseInt(targetId, 10),
      amount: parsedAmount,
      note,
    })
    setLoading(false)

    if (result?.ok) {
      setBootstrap((b) => ({ ...b, money: { ...b.money, bank: result.bank, cash: result.cash } }))
      setAmount('')
      setNote('')
      setTargetId('')
      setTab('overview')
      loadHistory()
    } else {
      notify('Transfer Failed', 'Transfer could not be completed', 'bank')
    }
  }

  return (
    <AppScreen
      title="Bank"
      onBack={goBack}
      className="bank-app"
      tabs={[
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'transfer', label: 'Transfer', icon: Send },
        { id: 'history', label: 'History', icon: History },
      ]}
      activeTab={tab}
      onTabChange={(t) => {
        setTab(t)
        if (t === 'history') loadHistory()
      }}
    >
        {tab === 'overview' && (
          <div className="overview-tab">
            <div className="balance-card">
              <div className="balance-label">Bank Balance</div>
              <div className="balance-amount">{fmt(bank)}</div>
              <div className="cash-row">
                <span>Cash on hand</span>
                <span>{fmt(cash)}</span>
              </div>
            </div>

            <div className="quick-actions">
              <button type="button" className="action-card" onClick={() => setTab('transfer')}>
                <Send size={24} />
                <span>Transfer Money</span>
              </button>
              <button
                type="button"
                className="action-card"
                onClick={() => {
                  setTab('history')
                  loadHistory()
                }}
              >
                <Clock size={24} />
                <span>View History</span>
              </button>
            </div>

            <div className="recent-section">
              <h3>Recent Transactions</h3>
              {history.slice(0, 3).map((tx, i) => (
                <div key={tx.id || i} className="transaction-item-mini">
                  <div className="tx-icon">
                    {tx.amount >= 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="tx-info">
                    <div className="tx-phone">{tx.phone || tx.label}</div>
                    <div className="tx-time">{tx.timeAgo || 'Recently'}</div>
                  </div>
                  <div className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>{fmt(tx.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'transfer' && (
          <div className="transfer-tab">
            <div className="transfer-form">
              <div className="form-group">
                <label>Player ID</label>
                <input
                  type="number"
                  placeholder="Enter player ID (e.g. 1)"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input">
                  <Building2 size={20} />
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Note (Optional)</label>
                <input
                  type="text"
                  placeholder="What's this for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="available-balance">Available: {fmt(bank)}</div>
              <button
                type="button"
                className="transfer-btn"
                disabled={loading || !targetId || !amount}
                onClick={transfer}
              >
                {loading ? 'Processing...' : 'Send Money'}
              </button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="history-tab">
            {history.length === 0 ? (
              <div className="no-transactions">
                <Clock size={48} />
                <p>No transactions yet</p>
              </div>
            ) : (
              history.map((tx, i) => (
                <div key={tx.id || i} className="transaction-item">
                  <div className="tx-icon-large">
                    {tx.amount >= 0 ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div className="tx-details">
                    <div className="tx-header">
                      <span className="tx-type">{tx.amount >= 0 ? 'Received from' : 'Sent to'}</span>
                      <span className={`tx-amount-large ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                        {fmt(Math.abs(tx.amount))}
                      </span>
                    </div>
                    <div className="tx-phone-large">{tx.phone || tx.label}</div>
                    {tx.note && <div className="tx-note">{tx.note}</div>}
                    <div className="tx-time-large">{tx.timeAgo}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
    </AppScreen>
  )
}
