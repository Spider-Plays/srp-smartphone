import { useEffect, useState } from 'react'
import { Check, ChevronRight, FilePlus, FileText, Inbox, Receipt, Send, X } from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

const NAV_TABS = [
  { id: 'received', label: 'Received', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'new', label: 'New', icon: FilePlus },
]

const TAB_TITLES = {
  received: 'Received',
  sent: 'Sent',
  new: 'New Invoice',
}

const STATUS_ACCENT = {
  pending: { bg: 'rgba(255, 149, 0, 0.15)', fg: '#ff9f0a' },
  paid: { bg: 'rgba(52, 199, 89, 0.15)', fg: '#34c759' },
  declined: { bg: 'rgba(255, 69, 58, 0.15)', fg: '#ff453a' },
}

function StatusBadge({ status }) {
  const label = status === 'paid' ? 'Paid' : status === 'declined' ? 'Declined' : 'Pending'
  return <span className={`invoice-status ${status === 'paid' ? 'paid' : status === 'declined' ? 'declined' : 'pending'}`}>{label}</span>
}

function InvoiceLineItem({ inv, direction, showActions, onPay, onDecline }) {
  const accent = STATUS_ACCENT[inv.status] || STATUS_ACCENT.pending

  return (
    <div className="invoice-line-card">
      <div className="invoice-line-row">
        <div className="invoice-line-icon" style={{ background: accent.bg, color: accent.fg }}>
          <Receipt size={22} strokeWidth={2} />
        </div>
        <div className="invoice-line-info">
          <div className="invoice-line-top">
            <div className="invoice-line-amount">{fmt(inv.amount)}</div>
            <StatusBadge status={inv.status} />
          </div>
          <div className="invoice-line-party">{direction}</div>
          {inv.note && <div className="invoice-line-note">{inv.note}</div>}
          {inv.timeAgo && <div className="invoice-line-time">{inv.timeAgo}</div>}
        </div>
      </div>
      {showActions && (
        <div className="invoice-line-actions">
          <button type="button" className="invoice-pay-btn" onClick={() => onPay(inv.id)}>
            <Check size={14} />
            Pay
          </button>
          <button type="button" className="invoice-decline-btn" onClick={() => onDecline(inv.id)}>
            <X size={14} />
            Decline
          </button>
        </div>
      )}
    </div>
  )
}

function NewInvoiceTab({ form, setForm, onSend, sending }) {
  const canSend = form.targetId.trim() && form.amount.trim()

  return (
    <>
      <p className="phone-section-label">Bill another player</p>
      <div className="invoice-form-card">
        <div className="invoice-field">
          <label htmlFor="invoice-target">Player ID</label>
          <input
            id="invoice-target"
            className="invoice-field-input"
            type="number"
            value={form.targetId}
            onChange={(e) => setForm({ ...form, targetId: e.target.value })}
            placeholder="e.g. 1"
          />
        </div>
        <div className="invoice-field">
          <label htmlFor="invoice-amount">Amount</label>
          <input
            id="invoice-amount"
            className="invoice-field-input"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="invoice-field">
          <label htmlFor="invoice-note">Note</label>
          <input
            id="invoice-note"
            className="invoice-field-input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Services rendered"
          />
        </div>
        <div className="invoice-form-footer">
          <span className="invoice-form-hint">Paid from bank</span>
          <button type="button" className="invoice-send-btn" disabled={sending || !canSend} onClick={onSend}>
            SEND
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

function InvoiceList({ list, tab, onPay, onDecline }) {
  if (list.length === 0) {
    return (
      <div className="invoice-empty-center">
        <FileText size={48} strokeWidth={1.5} />
        <p>No invoices</p>
      </div>
    )
  }

  const pendingCount = list.filter((inv) => inv.status === 'pending').length

  return (
    <>
      {pendingCount > 0 && tab === 'received' && (
        <p className="phone-section-label">
          {pendingCount} pending {pendingCount === 1 ? 'invoice' : 'invoices'}
        </p>
      )}
      {list.map((inv) => (
        <InvoiceLineItem
          key={inv.id}
          inv={inv}
          direction={tab === 'received' ? `From ${inv.partyName}` : `To ${inv.partyName}`}
          showActions={tab === 'received' && inv.status === 'pending'}
          onPay={onPay}
          onDecline={onDecline}
        />
      ))}
    </>
  )
}

export default function InvoicesScreen() {
  const { goBack, notify, setBootstrap } = usePhone()
  const [tab, setTab] = useState('received')
  const [data, setData] = useState({ received: [], sent: [] })
  const [form, setForm] = useState({ targetId: '', amount: '', note: '' })
  const [sending, setSending] = useState(false)

  const load = () => fetchNui('getInvoices').then((d) => setData(d || { received: [], sent: [] }))

  useEffect(() => {
    load()
  }, [])

  const sendInvoice = async () => {
    setSending(true)
    const res = await fetchNui('sendInvoice', {
      targetId: parseInt(form.targetId, 10),
      amount: parseInt(form.amount, 10),
      note: form.note,
    })
    setSending(false)
    if (res?.ok) {
      notify('Invoices', 'Invoice sent', 'default')
      setForm({ targetId: '', amount: '', note: '' })
      load()
      setTab('sent')
    } else {
      notify('Invoices', 'Could not send invoice', 'error')
    }
  }

  const pay = async (id) => {
    const res = await fetchNui('payInvoice', { id })
    if (res?.ok) {
      setBootstrap((b) => ({ ...b, money: { ...b.money, bank: res.bank, cash: res.cash } }))
      notify('Invoices', 'Invoice paid', 'default')
      load()
    } else {
      notify('Invoices', 'Payment failed', 'error')
    }
  }

  const decline = async (id) => {
    await fetchNui('declineInvoice', { id })
    load()
  }

  const list = tab === 'received' ? data.received : data.sent

  return (
    <AppScreen
      className="invoices-app"
      title={TAB_TITLES[tab]}
      onBack={goBack}
      tabs={NAV_TABS}
      activeTab={tab}
      onTabChange={setTab}
      tabStyle="bottom"
    >
      {tab === 'new' ? (
        <NewInvoiceTab form={form} setForm={setForm} onSend={sendInvoice} sending={sending} />
      ) : (
        <InvoiceList list={list} tab={tab} onPay={pay} onDecline={decline} />
      )}
    </AppScreen>
  )
}
