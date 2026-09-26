import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Briefcase,
  Check,
  History,
  LayoutDashboard,
  RefreshCw,
  Star,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import FoldEmpty from '../../components/FoldEmpty'
import FoldSplit from '../../components/FoldSplit'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import TradingAssetDetail from './trading/TradingAssetDetail'
import TradingActionTray, { TradingActionItem } from './trading/TradingActionTray'
import TradingLineItem from './trading/TradingLineItem'
import { fmtMoney, fmtPct, fmtPrice, fmtQty, formatMarketStatus, MARKETS, watchKey } from './trading/tradingFormat'

const SORT_OPTIONS = [
  { id: 'change', label: 'Change' },
  { id: 'price', label: 'Price' },
  { id: 'name', label: 'Name' },
]

function ChangeBadge({ value }) {
  const positive = value >= 0
  return (
    <span className={`trading-change ${positive ? 'up' : 'down'}`}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmtPct(value)}
    </span>
  )
}

function MarketKindTabs({ kinds, active, onChange }) {
  if (!kinds?.length || kinds.length <= 1) return null
  return (
    <div className="phone-app-subtabs" role="tablist">
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          role="tab"
          aria-selected={active === kind}
          className={`phone-app-subtab ${active === kind ? 'active' : ''}`}
          onClick={() => onChange(kind)}
        >
          {MARKETS[kind].label}
        </button>
      ))}
    </div>
  )
}

function StatRow({ label, value, valueClass = '' }) {
  return (
    <div className="trading-stat-row">
      <span>{label}</span>
      <strong className={valueClass}>{value}</strong>
    </div>
  )
}

function QuickAmounts({ bank, minTrade, maxTrade, onPick }) {
  const picks = [
    { label: '25%', pct: 0.25 },
    { label: '50%', pct: 0.5 },
    { label: '75%', pct: 0.75 },
    { label: 'Max', pct: 1 },
  ]
  return (
    <div className="trading-quick-amounts">
      {picks.map(({ label, pct }) => {
        const val = Math.min(maxTrade, Math.floor(bank * pct))
        if (val < minTrade) return null
        return (
          <button key={label} type="button" className="phone-btn phone-btn-ghost" onClick={() => onPick(val)}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function TradePanel({ asset, mode, holding, bank, minTrade, maxTrade, priceDecimals, qtyDecimals, feePercent, onClose, onConfirm, loading }) {
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('')

  const parsedAmount = parseInt(amount, 10) || 0
  const parsedQty = parseFloat(quantity) || 0
  const fee = feePercent > 0 ? Math.floor(parsedAmount * feePercent / 100) : 0
  const estimatedQty = mode === 'buy' && asset?.price > 0 ? parsedAmount / asset.price : parsedQty
  const estimatedTotal = mode === 'sell' ? Math.floor(parsedQty * (asset?.price || 0)) : parsedAmount

  const canSubmit =
    mode === 'buy'
      ? parsedAmount >= minTrade && parsedAmount <= maxTrade && parsedAmount + fee <= bank
      : parsedQty > 0 && parsedQty <= (holding?.quantity || 0)

  const symbol = asset?.symbol || '?'

  return (
    <div className="trading-trade-panel">
      <div className="trading-trade-panel-body">
        <div className="trading-sheet-header">
          <div className="trading-sheet-title">
            <span className="trading-symbol-badge" style={{ background: asset?.color || '#7ee8ca' }}>{symbol.charAt(0)}</span>
            <div>
              <strong>{mode === 'buy' ? 'Buy' : 'Sell'} {symbol}</strong>
              <span>{fmtPrice(asset?.price, priceDecimals)}</span>
            </div>
          </div>
        <button type="button" className="phone-app-back" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {mode === 'buy' ? (
        <>
          <div className="phone-form-group">
            <label>Amount (USD)</label>
            <input
              type="number"
              placeholder={`Min ${fmtMoney(minTrade)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <QuickAmounts bank={bank} minTrade={minTrade} maxTrade={maxTrade} onPick={setAmount} />
          </div>
          <div className="trading-sheet-hint">
            ≈ {fmtQty(estimatedQty, qtyDecimals)} {symbol}
            {fee > 0 && ` · Fee ${fmtMoney(fee)}`}
            <br />
            Bank: {fmtMoney(bank)}
          </div>
        </>
      ) : (
        <>
          <p className="phone-card-meta" style={{ marginTop: 0, marginBottom: 12 }}>
            You own: <strong style={{ color: '#fff' }}>{fmtQty(holding?.quantity || 0, qtyDecimals)}</strong> {symbol}
          </p>
          <div className="phone-form-group">
            <label>Quantity to sell</label>
            <input type="number" step="any" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <button type="button" className="phone-btn phone-btn-ghost trading-sell-all" onClick={() => setQuantity(String(holding?.quantity || 0))}>
              Sell all
            </button>
          </div>
          <div className="trading-sheet-hint">Estimated: {fmtMoney(estimatedTotal)}</div>
        </>
      )}
      </div>

      <TradingActionTray>
        <TradingActionItem icon={X} label="Cancel" onClick={onClose} disabled={loading} />
        <TradingActionItem
          icon={Check}
          label={loading ? 'Wait' : mode === 'buy' ? 'Buy' : 'Sell'}
          variant={mode === 'buy' ? 'buy' : 'sell'}
          active
          disabled={loading || !canSubmit}
          onClick={() => onConfirm(mode === 'buy' ? { amount: parsedAmount } : { quantity: parsedQty })}
        />
      </TradingActionTray>
    </div>
  )
}

function AssetCard({ asset, meta, isWatching, onToggleWatch, onOpen }) {
  return (
    <TradingLineItem
      symbol={asset.symbol}
      name={asset.name}
      color={asset.color}
      priceLine={fmtPrice(asset.price, meta.priceDecimals)}
      changePct={asset.changePct}
      onPress={onOpen}
      onWatch={onToggleWatch}
      isWatching={isWatching}
    />
  )
}

export default function TradingScreen() {
  const { goBack, notify, setBootstrap, phoneFlipped, foldLayout } = usePhone()
  const folded = phoneFlipped && foldLayout?.mode === 'span'
  const [tab, setTab] = useState('overview')
  const [marketKind, setMarketKind] = useState('crypto')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tradeTarget, setTradeTarget] = useState(null)
  const [detailView, setDetailView] = useState(null)
  const detailOpeningRef = useRef(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('change')
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [alertForm, setAlertForm] = useState({ marketKind: 'crypto', assetId: '', direction: 'above', targetPrice: '' })

  const watchSet = useMemo(() => new Set(data?.watchlist || []), [data?.watchlist])
  const feePercent = data?.config?.tradeFeePercent || 0

  const availableMarkets = useMemo(() => {
    const list = []
    if (data?.crypto) list.push('crypto')
    if (data?.stocks) list.push('stocks')
    return list
  }, [data])

  const marketMeta = MARKETS[marketKind] || MARKETS.crypto
  const marketData = data?.[marketKind]

  const refreshMsRef = useRef(60000)

  const load = useCallback((silent = false) => {
    fetchNui('getTradingData').then((d) => {
      if (!d || (!d.crypto && !d.stocks)) {
        if (!silent) setData(null)
        return
      }
      setData(d)
      const cryptoNext = d?.config?.nextPriceUpdate
      const stockNext = d?.config?.stockNextPriceUpdate
      const secs = Math.min(
        typeof cryptoNext === 'number' ? cryptoNext : 60,
        typeof stockNext === 'number' ? stockNext : 60,
      )
      refreshMsRef.current = Math.max(secs * 1000, 30000)
      if (d.crypto && !d.stocks) setMarketKind('crypto')
      else if (d.stocks && !d.crypto) setMarketKind('stocks')
    })
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (detailView) return undefined

    let timeoutId
    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        load(true)
        schedule()
      }, refreshMsRef.current)
    }
    schedule()

    return () => window.clearTimeout(timeoutId)
  }, [load, detailView])

  useEffect(() => {
    if (availableMarkets.length && !availableMarkets.includes(marketKind)) {
      setMarketKind(availableMarkets[0])
    }
  }, [availableMarkets, marketKind])

  const closeDetail = useCallback(() => setDetailView(null), [])

  const handleDetailTrade = useCallback((target) => {
    setDetailView(null)
    setTradeTarget(target)
  }, [])

  const handleDetailAlert = useCallback(({ marketKind: mk, assetId: id, asset }) => {
    setDetailView(null)
    setTab('alerts')
    setAlertForm({
      marketKind: mk,
      assetId: id,
      direction: 'above',
      targetPrice: asset?.price ? String(asset.price) : '',
    })
  }, [])

  const openAssetDetail = (kind, asset) => {
    if (detailOpeningRef.current) return
    const assetId = asset?.id ?? asset?.assetId
    if (!assetId) {
      notify('Trade', 'Invalid asset', 'error')
      return
    }
    detailOpeningRef.current = true
    setDetailView({ marketKind: kind, assetId, asset: { ...asset, id: assetId } })
    setTimeout(() => {
      detailOpeningRef.current = false
    }, 400)
  }

  const toggleWatch = async (kind, assetId) => {
    const res = await fetchNui('toggleTradingWatchlist', { marketKind: kind, assetId })
    if (res?.ok) {
      load(true)
      notify('Trade', res.watching ? 'Added to watchlist' : 'Removed from watchlist', 'default')
    }
  }

  const filteredAssets = useMemo(() => {
    let list = [...(marketData?.assets || [])]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    }
    if (watchlistOnly) {
      list = list.filter((a) => watchSet.has(watchKey(marketKind, a.id)))
    }
    if (sortBy === 'change') list.sort((a, b) => (b.changePct || 0) - (a.changePct || 0))
    else if (sortBy === 'price') list.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sortBy === 'name') list.sort((a, b) => a.symbol.localeCompare(b.symbol))
    return list
  }, [marketData?.assets, search, sortBy, watchlistOnly, watchSet, marketKind])

  const combinedPortfolio = useMemo(() => {
    const items = []
    if (data?.crypto?.portfolio) data.crypto.portfolio.forEach((p) => items.push({ ...p, marketKind: 'crypto' }))
    if (data?.stocks?.portfolio) data.stocks.portfolio.forEach((p) => items.push({ ...p, marketKind: 'stocks' }))
    return items
  }, [data])

  const combinedSummary = useMemo(() => {
    let totalValue = 0
    let totalCost = 0
    combinedPortfolio.forEach((h) => {
      totalValue += h.value || 0
      totalCost += (h.quantity || 0) * (h.avgCost || 0)
    })
    const totalPnl = totalValue - totalCost
    return { totalValue, totalCost, totalPnl, totalPnlPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0 }
  }, [combinedPortfolio])

  const alertAssetOptions = useMemo(() => {
    const items = []
    if (data?.crypto?.assets) data.crypto.assets.forEach((a) => items.push({ ...a, marketKind: 'crypto' }))
    if (data?.stocks?.assets) data.stocks.assets.forEach((a) => items.push({ ...a, marketKind: 'stocks' }))
    return items
  }, [data])

  const combinedHistory = useMemo(() => {
    const txs = []
    if (data?.crypto?.transactions) data.crypto.transactions.forEach((tx) => txs.push({ ...tx, marketKind: 'crypto' }))
    if (data?.stocks?.transactions) data.stocks.transactions.forEach((tx) => txs.push({ ...tx, marketKind: 'stocks' }))
    return txs.sort((a, b) => (b.id || 0) - (a.id || 0))
  }, [data])

  const executeTrade = async (kind, mode, asset, payload) => {
    const meta = MARKETS[kind]
    setLoading(true)
    const result = await fetchNui(meta.tradeEvent, { assetId: asset.id, action: mode, ...payload })
    setLoading(false)

    if (result?.ok) {
      setBootstrap((b) => ({ ...b, money: { ...b.money, bank: result.bank, cash: result.cash } }))
      const feeMsg = result.fee > 0 ? ` (fee ${fmtMoney(result.fee)})` : ''
      notify('Trade', `${mode === 'buy' ? 'Bought' : 'Sold'} ${asset.symbol}${feeMsg}`, 'default')
      setTradeTarget(null)
      setDetailView(null)
      load(true)
    } else {
      const md = data?.[kind]
      const errors = {
        insufficient: 'Insufficient bank balance',
        insufficient_holdings: 'Not enough holdings',
        invalid_amount: `Amount must be between ${fmtMoney(md?.minTrade)} and ${fmtMoney(md?.maxTrade)}`,
        rate_limit: 'Too many trades, try again later',
        market_closed: 'Stock market is closed (9 AM – 5 PM in-game)',
      }
      notify('Trade', errors[result?.error] || 'Trade failed', 'error')
    }
  }

  const createAlert = async () => {
    const targetPrice = parseFloat(alertForm.targetPrice)
    if (!alertForm.assetId || !targetPrice) {
      notify('Trade', 'Select asset and enter a target price', 'error')
      return
    }
    const res = await fetchNui('createTradingAlert', {
      marketKind: alertForm.marketKind,
      assetId: alertForm.assetId,
      direction: alertForm.direction,
      targetPrice,
    })
    if (res?.ok) {
      notify('Trade', 'Price alert created', 'default')
      setAlertForm({ marketKind: marketKind, assetId: '', direction: 'above', targetPrice: '' })
      load(true)
    } else {
      const err = { alerts_full: 'Alert limit reached', rate_limit: 'Too many requests' }
      notify('Trade', err[res?.error] || 'Could not create alert', 'error')
    }
  }

  const deleteAlert = async (id) => {
    await fetchNui('deleteTradingAlert', { id })
    load(true)
  }

  const overview = data?.overview
  const nextUpdate = data?.config?.nextPriceUpdate
  const stockMarketStatus = marketData?.marketStatus || data?.stocks?.marketStatus
  const stockStatusLabel = marketKind === 'stocks' ? formatMarketStatus(stockMarketStatus) : null

  const tradeLayer = tradeTarget ? (
    <div className="trading-overlay" role="presentation" onClick={() => !loading && setTradeTarget(null)}>
      <div className="trading-overlay-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${tradeTarget.mode === 'buy' ? 'Buy' : 'Sell'} ${tradeTarget.asset?.symbol || ''}`}>
        <TradePanel
          asset={tradeTarget.asset}
          mode={tradeTarget.mode}
          holding={tradeTarget.holding}
          bank={data?.bank ?? 0}
          minTrade={data?.[tradeTarget.marketKind]?.minTrade ?? 50}
          maxTrade={data?.[tradeTarget.marketKind]?.maxTrade ?? 50000}
          priceDecimals={MARKETS[tradeTarget.marketKind].priceDecimals}
          qtyDecimals={MARKETS[tradeTarget.marketKind].qtyDecimals}
          feePercent={feePercent}
          loading={loading}
          onClose={() => !loading && setTradeTarget(null)}
          onConfirm={(payload) => executeTrade(tradeTarget.marketKind, tradeTarget.mode, tradeTarget.asset, payload)}
        />
      </div>
    </div>
  ) : null

  const detailNode = detailView ? (
      <TradingAssetDetail
        marketKind={detailView.marketKind}
        assetId={detailView.assetId}
        initialAsset={detailView.asset}
        isWatching={watchSet.has(watchKey(detailView.marketKind, detailView.assetId))}
        bank={data?.bank ?? 0}
        minTrade={data?.[detailView.marketKind]?.minTrade ?? 50}
        maxTrade={data?.[detailView.marketKind]?.maxTrade ?? 50000}
        feePercent={feePercent}
        onBack={closeDetail}
        onTrade={handleDetailTrade}
          onWatchToggled={() => load(true)}
          onAlert={handleDetailAlert}
          notify={notify}
      />
  ) : null

  const market = (
    <AppScreen
      title="Trade"
      onBack={goBack}
      className={`trading-app${tradeTarget ? ' trading-app-modal-open' : ''}${tab === 'alerts' ? ' trading-alerts-tab' : ''}`}
      headerRight={
        <button type="button" className="phone-app-back" onClick={() => load(false)} aria-label="Refresh">
          <RefreshCw size={18} />
        </button>
      }
      tabs={[
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'market', label: 'Market', icon: TrendingUp },
        { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
        { id: 'alerts', label: 'Alerts', icon: Bell },
        { id: 'history', label: 'History', icon: History },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      layer={tradeLayer}
      footer={
        tab === 'alerts' ? (
          <TradingActionTray>
            <TradingActionItem icon={Bell} label="Create alert" variant="alert" active onClick={createAlert} />
          </TradingActionTray>
        ) : null
      }
    >
      {tab === 'overview' && overview && (
        <>
          <div className="phone-hero-card orange">
            <div className="phone-hero-label">Net worth</div>
            <div className="phone-hero-value">{fmtMoney(overview.netWorth)}</div>
            <div className="phone-card-meta">
              Bank {fmtMoney(overview.bank)} · Investments {fmtMoney(overview.portfolioValue)}
            </div>
            {nextUpdate != null && (
              <div className="phone-card-meta" style={{ marginTop: 8 }}>
                Prices refresh in {Math.ceil(nextUpdate / 60)}m {nextUpdate % 60}s
              </div>
            )}
          </div>

          {combinedSummary.totalValue > 0 && (
            <div className="phone-card">
              <StatRow
                label="Portfolio P/L"
                value={`${fmtMoney(combinedSummary.totalPnl)} (${fmtPct(combinedSummary.totalPnlPct)})`}
                valueClass={combinedSummary.totalPnl >= 0 ? 'positive' : 'negative'}
              />
            </div>
          )}

          <p className="phone-section-label">Top gainers</p>
          {(overview.topGainers || []).map((a) => (
            <TradingLineItem
              key={a.id + a.symbol}
              symbol={a.symbol}
              name={a.name}
              color={a.color}
              priceLine={fmtPrice(a.price)}
              changePct={a.changePct}
              onPress={() => {
                if (a.marketKind) setMarketKind(a.marketKind)
                setTab('market')
              }}
            />
          ))}

          <p className="phone-section-label">Top losers</p>
          {(overview.topLosers || []).map((a) => (
            <TradingLineItem
              key={'l-' + a.id}
              symbol={a.symbol}
              name={a.name}
              color={a.color}
              priceLine={fmtPrice(a.price)}
              changePct={a.changePct}
              onPress={() => {
                if (a.marketKind) setMarketKind(a.marketKind)
                setTab('market')
              }}
            />
          ))}

          {combinedHistory[0] && (
            <>
              <p className="phone-section-label">Recent activity</p>
              <div className="phone-card">
                <div className="trading-stat-row">
                  <span className={`trading-tx-label ${combinedHistory[0].action}`}>
                    {combinedHistory[0].action === 'buy' ? 'Bought' : 'Sold'} {combinedHistory[0].symbol}
                  </span>
                  <strong>{fmtMoney(combinedHistory[0].total)}</strong>
                </div>
                <div className="phone-card-meta">{combinedHistory[0].timeAgo}</div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'market' && (
        <>
          <MarketKindTabs kinds={availableMarkets} active={marketKind} onChange={setMarketKind} />

          {stockStatusLabel && (
            <div className={`trading-market-banner ${stockMarketStatus?.isOpen ? 'open' : 'closed'}`}>{stockStatusLabel}</div>
          )}

          <div className="contacts-search">
            <input
              className="search-input"
              placeholder="Search symbol or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="trading-sort-row">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`phone-btn ${sortBy === opt.id ? 'phone-btn-primary' : 'phone-btn-ghost'}`}
                style={{ padding: '8px 12px', fontSize: 12 }}
                onClick={() => setSortBy(opt.id)}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              className={`phone-btn ${watchlistOnly ? 'phone-btn-primary' : 'phone-btn-ghost'}`}
              style={{ padding: '8px 12px', fontSize: 12 }}
              onClick={() => setWatchlistOnly(!watchlistOnly)}
            >
              <Star size={14} /> Watchlist
            </button>
          </div>

          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              meta={marketMeta}
              isWatching={watchSet.has(watchKey(marketKind, asset.id))}
              onToggleWatch={() => toggleWatch(marketKind, asset.id)}
              onOpen={() => openAssetDetail(marketKind, asset)}
            />
          ))}
          {!filteredAssets.length && (
            <div className="phone-empty">
              <TrendingUp size={48} />
              <p>{watchlistOnly ? 'No watchlist items' : data ? 'No assets found' : 'Could not load market data'}</p>
              {!data && (
                <button type="button" className="phone-btn phone-btn-primary" onClick={load}>
                  Retry
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'portfolio' && (
        <>
          {!combinedPortfolio.length ? (
            <div className="phone-empty">
              <Briefcase size={48} />
              <p>No holdings yet</p>
              <button type="button" className="phone-btn phone-btn-primary" onClick={() => setTab('market')}>
                Browse market
              </button>
            </div>
          ) : (
            <>
              <div className="phone-card">
                <StatRow label="Total value" value={fmtMoney(combinedSummary.totalValue)} />
                <StatRow
                  label="Total P/L"
                  value={`${fmtMoney(combinedSummary.totalPnl)} (${fmtPct(combinedSummary.totalPnlPct)})`}
                  valueClass={combinedSummary.totalPnl >= 0 ? 'positive' : 'negative'}
                />
              </div>

              {combinedSummary.totalValue > 0 && (
                <div className="phone-card">
                  <p className="phone-section-label" style={{ marginTop: 0 }}>Allocation</p>
                  {combinedPortfolio.map((h) => {
                    const pct = (h.value / combinedSummary.totalValue) * 100
                    return (
                      <div key={`${h.marketKind}-${h.assetId}`} className="trading-alloc-row">
                        <span>{h.symbol}</span>
                        <div className="trading-alloc-bar-wrap">
                          <div className="trading-alloc-bar" style={{ width: `${pct}%`, background: h.color }} />
                        </div>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {combinedPortfolio.map((h) => {
                const meta = MARKETS[h.marketKind]
                const asset = { ...h, id: h.assetId, price: h.price }
                return (
                  <TradingLineItem
                    key={`${h.marketKind}-${h.assetId}`}
                    symbol={h.symbol}
                    name={h.name}
                    color={h.color}
                    subtitle={`${meta.label.toUpperCase()} · ${fmtQty(h.quantity, meta.qtyDecimals)} units`}
                    priceLine={`${fmtMoney(h.value)} · ${fmtPct(h.pnlPct)}`}
                    changePct={h.pnlPct}
                    onPress={() => openAssetDetail(h.marketKind, asset)}
                  />
                )
              })}
            </>
          )}
        </>
      )}

      {tab === 'alerts' && (
        <>
          <div className="phone-card">
            <h3>New price alert</h3>
            <div className="phone-form-group">
              <label>Asset</label>
              <select
                value={alertForm.assetId ? `${alertForm.marketKind}:${alertForm.assetId}` : ''}
                onChange={(e) => {
                  const [mk, id] = e.target.value.split(':')
                  setAlertForm({ ...alertForm, marketKind: mk || marketKind, assetId: id || '' })
                }}
              >
                <option value="">Select...</option>
                {alertAssetOptions.map((a) => (
                  <option key={`${a.marketKind}:${a.id}`} value={`${a.marketKind}:${a.id}`}>
                    [{MARKETS[a.marketKind].label}] {a.symbol} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="phone-form-group">
              <label>Condition</label>
              <select value={alertForm.direction} onChange={(e) => setAlertForm({ ...alertForm, direction: e.target.value })}>
                <option value="above">Price goes above</option>
                <option value="below">Price goes below</option>
              </select>
            </div>
            <div className="phone-form-group">
              <label>Target price ($)</label>
              <input
                type="number"
                step="any"
                value={alertForm.targetPrice}
                onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {!data?.alerts?.length ? (
            <div className="phone-empty">
              <Bell size={48} />
              <p>No active alerts</p>
            </div>
          ) : (
            data.alerts.map((alert) => (
              <TradingLineItem
                key={alert.id}
                symbol={alert.symbol}
                color="#ff9500"
                subtitle={`Alert ${alert.direction} ${fmtPrice(alert.target_price)}`}
                priceLine={`Now ${fmtPrice(alert.currentPrice)} · ${alert.timeAgo}`}
                showChevron={false}
                right={
                  <button
                    type="button"
                    className="trading-line-btn"
                    style={{ background: 'rgba(255, 149, 0, 0.2)', color: '#ff9500' }}
                    onClick={() => deleteAlert(alert.id)}
                    aria-label="Remove alert"
                  >
                    <Trash2 size={18} />
                  </button>
                }
              />
            ))
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {!combinedHistory.length ? (
            <div className="phone-empty">
              <History size={48} />
              <p>No trades yet</p>
            </div>
          ) : (
            combinedHistory.map((tx) => {
              const meta = MARKETS[tx.marketKind]
              const isBuy = tx.action === 'buy'
              return (
                <TradingLineItem
                  key={`${tx.marketKind}-${tx.id}`}
                  symbol={tx.symbol || tx.asset_id}
                  color={isBuy ? '#34c759' : '#ff453a'}
                  subtitle={`${isBuy ? 'Bought' : 'Sold'} · ${meta.label.toUpperCase()}`}
                  priceLine={`${fmtQty(tx.quantity, meta.qtyDecimals)} @ ${fmtPrice(tx.price, meta.priceDecimals)}`}
                  showChevron={false}
                  right={<span className="trading-line-amount">{fmtMoney(tx.total)}</span>}
                />
              )
            })
          )}
        </>
      )}

    </AppScreen>
  )

  if (folded) {
    return (
      <FoldSplit
        menu={market}
        detail={
          detailNode ? (
            <>
              {detailNode}
              {tradeLayer}
            </>
          ) : (
            <FoldEmpty title="Select an asset" subtitle="Quotes, charts, and trades open on this screen." />
          )
        }
      />
    )
  }

  if (detailNode) {
    return (
      <>
        {detailNode}
        {tradeLayer}
      </>
    )
  }

  return market
}
