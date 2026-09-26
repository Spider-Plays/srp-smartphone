const PRODUCTS = [
  {
    id: 'payday',
    label: 'Payday Loan',
    description: 'Fast cash for short-term needs. Higher rates apply.',
    minAmount: 500,
    maxAmount: 5000,
    minTermDays: 3,
    maxTermDays: 7,
    baseApr: 0.45,
    originationFee: 0.03,
    minCreditScore: 500,
    maxOpenLoans: 1,
    icon: 'zap',
  },
  {
    id: 'personal',
    label: 'Personal Loan',
    description: 'Flexible financing for everyday expenses.',
    minAmount: 1000,
    maxAmount: 25000,
    minTermDays: 7,
    maxTermDays: 30,
    baseApr: 0.18,
    originationFee: 0.02,
    minCreditScore: 550,
    maxOpenLoans: 2,
    icon: 'user',
  },
  {
    id: 'auto',
    label: 'Auto Loan',
    description: 'Finance a vehicle purchase with competitive rates.',
    minAmount: 5000,
    maxAmount: 75000,
    minTermDays: 14,
    maxTermDays: 60,
    baseApr: 0.12,
    originationFee: 0.015,
    minCreditScore: 600,
    maxOpenLoans: 1,
    icon: 'car',
  },
  {
    id: 'business',
    label: 'Business Loan',
    description: 'Capital for employed professionals and business owners.',
    minAmount: 10000,
    maxAmount: 100000,
    minTermDays: 30,
    maxTermDays: 90,
    baseApr: 0.1,
    originationFee: 0.01,
    minCreditScore: 650,
    maxOpenLoans: 1,
    icon: 'briefcase',
  },
]

const PAYMENT_INTERVAL_HOURS = 24

let devBank = 15000
let nextLoanId = 2
let nextPaymentId = 20

const devCredit = {
  score: 682,
  band: 'good',
  bandLabel: 'Good',
  onTimePayments: 8,
  missedPayments: 1,
  totalBorrowed: 12000,
  totalRepaid: 8400,
  openLoans: 1,
}

let devLoans = [
  {
    id: 1,
    productId: 'personal',
    productLabel: 'Personal Loan',
    status: 'active',
    principal: 5000,
    balance: 4120,
    apr: 0.1656,
    aprPercent: 16.6,
    termDays: 14,
    paymentAmount: 1030,
    paymentsTotal: 5,
    paymentsMade: 1,
    missedCount: 0,
    nextDueAt: Math.floor(Date.now() / 1000) + 3600 * 18,
    nextDueLabel: 'Due in 18h',
    autopay: false,
    createdAt: new Date().toISOString(),
  },
]

let devPayments = {
  1: [
    { id: 11, installment: 1, amountDue: 1030, amountPaid: 1030, status: 'paid', dueAt: Math.floor(Date.now() / 1000) - 86400, dueLabel: 'Paid', paidAt: Math.floor(Date.now() / 1000) - 86000 },
    { id: 12, installment: 2, amountDue: 1030, amountPaid: 0, status: 'pending', dueAt: Math.floor(Date.now() / 1000) + 3600 * 18, dueLabel: 'Due in 18h', paidAt: null },
    { id: 13, installment: 3, amountDue: 1030, amountPaid: 0, status: 'pending', dueAt: Math.floor(Date.now() / 1000) + 86400 * 2, dueLabel: 'Due in 2d', paidAt: null },
    { id: 14, installment: 4, amountDue: 1030, amountPaid: 0, status: 'pending', dueAt: Math.floor(Date.now() / 1000) + 86400 * 3, dueLabel: 'Due in 3d', paidAt: null },
    { id: 15, installment: 5, amountDue: 1030, amountPaid: 0, status: 'pending', dueAt: Math.floor(Date.now() / 1000) + 86400 * 4, dueLabel: 'Due in 4d', paidAt: null },
  ],
}

function getProduct(productId) {
  return PRODUCTS.find((p) => p.id === productId)
}

function formatDueLabel(epoch) {
  if (!epoch) return '—'
  const diff = epoch - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Due now'
  if (diff < 3600) return `Due in ${Math.ceil(diff / 60)}m`
  if (diff < 86400) return `Due in ${Math.ceil(diff / 3600)}h`
  return `Due in ${Math.ceil(diff / 86400)}d`
}

const AMOUNT_LIMIT_TIERS = [
  { minScore: 740, multiplier: 1.0 },
  { minScore: 670, multiplier: 0.85 },
  { minScore: 580, multiplier: 0.65 },
  { minScore: 0, multiplier: 0.45 },
]

function getMaxAmount(product, creditScore = 620) {
  const tier = AMOUNT_LIMIT_TIERS.find((t) => creditScore >= t.minScore) || AMOUNT_LIMIT_TIERS.at(-1)
  const capped = Math.floor((product.maxAmount || 0) * tier.multiplier)
  return Math.max(product.minAmount || 0, capped)
}

function calculateQuote(productId, amount, termDays, creditScore = 620) {
  const product = getProduct(productId)
  if (!product) return { error: 'invalid_product' }

  amount = Math.floor(Number(amount) || 0)
  termDays = Math.floor(Number(termDays) || 0)
  const maxAllowed = getMaxAmount(product, creditScore)
  if (amount < product.minAmount || amount > maxAllowed) return { error: 'invalid_amount' }
  if (termDays < product.minTermDays || termDays > product.maxTermDays) return { error: 'invalid_term' }

  let apr = product.baseApr
  if (creditScore >= 740) apr *= 0.85
  else if (creditScore >= 670) apr *= 0.92
  else if (creditScore < 580) apr *= 1.15

  const originationFee = Math.floor(amount * product.originationFee)
  const totalInterest = Math.floor(amount * apr * (termDays / 365))
  const totalRepay = amount + originationFee + totalInterest
  const paymentsTotal = Math.max(1, Math.ceil((termDays * 24) / PAYMENT_INTERVAL_HOURS))
  const paymentAmount = Math.ceil(totalRepay / paymentsTotal)

  return {
    productId: product.id,
    productLabel: product.label,
    amount,
    termDays,
    apr,
    aprPercent: Math.floor(apr * 1000) / 10,
    originationFee,
    totalInterest,
    totalRepay,
    paymentAmount,
    paymentsTotal,
    paymentIntervalHours: PAYMENT_INTERVAL_HOURS,
    maxAmount: maxAllowed,
    maxAmountCap: product.maxAmount,
  }
}

function buildProducts() {
  return PRODUCTS.map((product) => {
    const openForProduct = devLoans.filter((l) => l.productId === product.id && l.status === 'active').length
    const eligible =
      devCredit.score >= product.minCreditScore && openForProduct < product.maxOpenLoans
    const maxAmount = getMaxAmount(product, devCredit.score)
    return {
      id: product.id,
      label: product.label,
      description: product.description,
      minAmount: product.minAmount,
      maxAmount,
      maxAmountCap: product.maxAmount,
      minTermDays: product.minTermDays,
      maxTermDays: product.maxTermDays,
      baseApr: product.baseApr,
      aprPercent: Math.floor(product.baseApr * 1000) / 10,
      minCreditScore: product.minCreditScore,
      eligible,
      icon: product.icon,
    }
  })
}

function refreshLoanDueLabels(loan) {
  const payments = devPayments[loan.id] || []
  const next = payments.find((p) => p.status === 'pending' || p.status === 'late')
  if (next) {
    loan.nextDueAt = next.dueAt
    loan.nextDueLabel = formatDueLabel(next.dueAt)
  }
  return loan
}

export function buildDevLoansDashboard() {
  devLoans.forEach(refreshLoanDueLabels)
  devCredit.openLoans = devLoans.filter((l) => l.status === 'active').length

  return {
    lenderName: 'Maze Bank',
    credit: { ...devCredit },
    blacklisted: false,
    products: buildProducts(),
    loans: devLoans.map((l) => ({ ...l })),
    bank: devBank,
  }
}

export function buildDevLoanDetail(loanId) {
  const loan = devLoans.find((l) => l.id === Number(loanId))
  if (!loan) return null
  refreshLoanDueLabels(loan)
  const payments = (devPayments[loan.id] || []).map((p) => ({
    ...p,
    dueLabel: p.status === 'paid' ? 'Paid' : formatDueLabel(p.dueAt),
  }))
  return { loan: { ...loan }, payments, bank: devBank }
}

export function devPreviewLoan(data) {
  const quote = calculateQuote(data.productId, data.amount, data.termDays, devCredit.score)
  if (quote.error) return { ok: false, error: quote.error }
  return { ok: true, quote }
}

export function devApplyLoan(data) {
  const product = getProduct(data.productId)
  if (!product) return { ok: false, error: 'invalid_product' }
  if (devCredit.score < product.minCreditScore) return { ok: false, error: 'low_credit' }

  const openForProduct = devLoans.filter((l) => l.productId === product.id && l.status === 'active').length
  if (openForProduct >= product.maxOpenLoans) return { ok: false, error: 'max_loans' }

  const quote = calculateQuote(data.productId, data.amount, data.termDays, devCredit.score)
  if (quote.error) return { ok: false, error: quote.error }

  const loanId = nextLoanId++
  const now = Math.floor(Date.now() / 1000)
  const interval = PAYMENT_INTERVAL_HOURS * 3600

  const payments = []
  for (let i = 1; i <= quote.paymentsTotal; i += 1) {
    payments.push({
      id: nextPaymentId++,
      installment: i,
      amountDue: quote.paymentAmount,
      amountPaid: 0,
      status: 'pending',
      dueAt: now + i * interval,
      dueLabel: formatDueLabel(now + i * interval),
      paidAt: null,
    })
  }
  devPayments[loanId] = payments

  const loan = {
    id: loanId,
    productId: product.id,
    productLabel: product.label,
    status: 'active',
    principal: quote.amount,
    balance: quote.totalRepay,
    apr: quote.apr,
    aprPercent: quote.aprPercent,
    termDays: quote.termDays,
    paymentAmount: quote.paymentAmount,
    paymentsTotal: quote.paymentsTotal,
    paymentsMade: 0,
    missedCount: 0,
    nextDueAt: payments[0].dueAt,
    nextDueLabel: formatDueLabel(payments[0].dueAt),
    autopay: false,
    createdAt: new Date().toISOString(),
  }
  devLoans.unshift(loan)
  devBank += quote.amount
  devCredit.totalBorrowed += quote.amount
  devCredit.openLoans += 1

  return { ok: true, loanId }
}

export function devPayLoan(data) {
  const loanId = Number(data.loanId)
  const loan = devLoans.find((l) => l.id === loanId && l.status === 'active')
  if (!loan) return { ok: false, error: 'not_found' }

  const payments = devPayments[loanId] || []
  const payment = payments.find((p) => p.status === 'pending' || p.status === 'late')
  if (!payment) return { ok: false, error: 'no_payment_due' }

  if (devBank < payment.amountDue) return { ok: false, error: 'insufficient' }

  devBank -= payment.amountDue
  payment.status = 'paid'
  payment.amountPaid = payment.amountDue
  payment.paidAt = Math.floor(Date.now() / 1000)
  payment.dueLabel = 'Paid'

  loan.paymentsMade += 1
  loan.balance = Math.max(0, loan.balance - payment.amountDue)
  devCredit.totalRepaid += payment.amountDue
  devCredit.onTimePayments += 1

  const next = payments.find((p) => p.status === 'pending' || p.status === 'late')
  if (!next || loan.paymentsMade >= loan.paymentsTotal || loan.balance <= 0) {
    loan.status = 'paid'
    loan.balance = 0
    loan.nextDueAt = null
    loan.nextDueLabel = null
    devCredit.openLoans = Math.max(0, devCredit.openLoans - 1)
  } else {
    loan.nextDueAt = next.dueAt
    loan.nextDueLabel = formatDueLabel(next.dueAt)
  }

  const detail = buildDevLoanDetail(loanId)
  return { ok: true, bank: devBank, detail }
}

export function devSetLoanAutopay(data) {
  const loan = devLoans.find((l) => l.id === Number(data.loanId) && l.status === 'active')
  if (!loan) return { ok: false }
  loan.autopay = Boolean(data.enabled)
  return { ok: true, detail: buildDevLoanDetail(loan.id) }
}
