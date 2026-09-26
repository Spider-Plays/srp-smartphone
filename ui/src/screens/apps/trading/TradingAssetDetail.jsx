import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Bell, Star } from 'lucide-react'
import AppScreen from '../../../components/AppScreen'
import { fetchNui } from '../../../hooks/useNui'
import TradingActionTray, { TradingActionItem } from './TradingActionTray'
import TradingSparkline from './TradingSparkline'
import { fmtMoney, fmtPct, fmtPrice, fmtQty, fmtVolume, formatMarketStatus, MARKETS, watchKey } from './tradingFormat'

function ChangeBadge({ value }) {
  const n = Number(value) || 0
  const positive = n >= 0
  return (
    <span className={`trading-change ${positive ? 'up' : 'down'}`}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmtPct(n)}
    </span>
  )
}

export default function TradingAssetDetail({
  marketKind,
  assetId,
  initialAsset,
  isWatching,
  bank,
  minTrade,
  maxTrade,
  feePercent,
  onBack,
  onTrade,
  onWatchToggled,
  onAlert,
  notify,
}) {
  const [asset, setAsset] = useState(initialAsset || null)
  const [initialLoading, setInitialLoading] = useState(!initialAsset)
  const [chartRange, setChartRange] = useState('1D')
  const meta = MARKETS[marketKind] || MARKETS.crypto
  const refreshMsRef = useRef(60000)
  const onBackRef = useRef(onBack)
  const notifyRef = useRef(notify)
  const initialAssetRef = useRef(initialAsset)

  onBackRef.current = onBack
  notifyRef.current = notify
  initialAssetRef.current = initialAsset

  const parseDetail = useCallback((detail) => {
    const history1D = Array.isArray(detail.history1D)
      ? detail.history1D.map((p) => Number(p)).filter((p) => !Number.isNaN(p))
      : Array.isArray(detail.history)
        ? detail.history.map((p) => Number(p)).filter((p) => !Number.isNaN(p))
        : []
    const history1W = Array.isArray(detail.history1W)
      ? detail.history1W.map((p) => Number(p)).filter((p) => !Number.isNaN(p))
      : []
    return {
      ...(initialAssetRef.current || {}),
      ...detail,
      id: assetId,
      history: history1D,
      history1D,
      history1W,
    }
  }, [assetId])

  const loadDetail = useCallback(({ silent = false } = {}) => {
    if (!assetId) return
    if (!silent) setInitialLoading(true)

    fetchNui('getTradingAssetDetail', { marketKind, assetId })
      .then((detail) => {
        if (!detail || typeof detail !== 'object' || !detail.symbol) {
          if (!silent) {
            notifyRef.current('Trade', 'Could not load asset details', 'error')
            onBackRef.current()
          }
          return
        }
        setAsset(parseDetail(detail))
      })
      .catch(() => {
        if (!silent) {
          notifyRef.current('Trade', 'Could not load asset details', 'error')
          onBackRef.current()
        }
      })
      .finally(() => {
        if (!silent) setInitialLoading(false)
      })
  }, [assetId, marketKind, parseDetail])

  useEffect(() => {
    loadDetail({ silent: false })

    let timeoutId
    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        loadDetail({ silent: true })
        schedule()
      }, refreshMsRef.current)
    }
    schedule()

    return () => window.clearTimeout(timeoutId)
  }, [assetId, marketKind, loadDetail])

  const marketStatus = asset?.marketStatus
  const canTrade = marketKind === 'crypto' || marketStatus?.isOpen !== false
  const statusLabel = formatMarketStatus(marketStatus)

  const chartHistory = useMemo(() => {
    if (chartRange === '1W') {
      const w = asset?.history1W
      return Array.isArray(w) && w.length ? w : []
    }
    const h = asset?.history1D ?? asset?.history
    return Array.isArray(h) && h.length ? h : []
  }, [asset?.history, asset?.history1D, asset?.history1W, chartRange])

  const toggleWatch = async () => {
    const res = await fetchNui('toggleTradingWatchlist', { marketKind, assetId })
    if (res?.ok) {
      onWatchToggled?.()
      notify('Trade', res.watching ? 'Added to watchlist' : 'Removed from watchlist', 'default')
    }
  }

  const symbol = asset?.symbol || initialAsset?.symbol || '?'
  const name = asset?.name || initialAsset?.name || ''
  const color = asset?.color || initialAsset?.color || '#7ee8ca'

  const actionTray = asset ? (
      <TradingActionTray
        hint={!canTrade ? 'Stock exchange is closed. Trading resumes when the market opens in-game.' : null}
      >
        <TradingActionItem
          icon={ArrowUpRight}
          label="Buy"
          variant="buy"
          active
          disabled={!canTrade}
          onClick={() => onTrade({ marketKind, asset, mode: 'buy' })}
        />
        {asset.holding && (
          <TradingActionItem
            icon={ArrowDownRight}
            label="Sell"
            variant="sell"
            disabled={!canTrade}
            onClick={() => onTrade({ marketKind, asset, mode: 'sell', holding: asset.holding })}
          />
        )}
        <TradingActionItem
          icon={Bell}
          label="Alert"
          variant="alert"
          onClick={() => (onAlert ? onAlert({ marketKind, assetId, asset }) : notify('Trade', 'Set alerts from the Alerts tab', 'default'))}
        />
      </TradingActionTray>
    ) : null

  return (
    <AppScreen
      title={symbol}
      subtitle={name}
      onBack={onBack}
      className="trading-app trading-detail-screen"
      footer={actionTray}
      headerRight={
        <button
          type="button"
          className={`phone-app-back trading-detail-star ${isWatching ? 'active' : ''}`}
          onClick={toggleWatch}
          aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star size={18} fill={isWatching ? 'currentColor' : 'none'} />
        </button>
      }
    >
      {initialLoading && !asset && (
        <div className="phone-empty">
          <p>Loading chart...</p>
        </div>
      )}

      {asset && (
        <>
          {statusLabel && (
            <div className={`trading-market-banner ${marketStatus?.isOpen ? 'open' : 'closed'}`}>{statusLabel}</div>
          )}

          <div className="trading-detail-hero">
            <div className="trading-detail-price-row">
              <span className="trading-detail-price-main">{fmtPrice(asset.price, meta.priceDecimals)}</span>
              <ChangeBadge value={asset.changePct} />
            </div>
            <p className="phone-card-meta">
              Today: O {fmtPrice(asset.dayOpen, meta.priceDecimals)} · H {fmtPrice(asset.dayHigh, meta.priceDecimals)} · L{' '}
              {fmtPrice(asset.dayLow, meta.priceDecimals)}
            </p>
          </div>

          <div className="trading-chart-card phone-card">
            <div className="trading-chart-tabs">
              {['1D', '1W'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`phone-btn ${chartRange === r ? 'phone-btn-primary' : 'phone-btn-ghost'}`}
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => setChartRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            {chartHistory.length > 1 ? (
              <TradingSparkline key={chartRange} history={chartHistory} color={color} height={140} />
            ) : (
              <div className="trading-chart-empty">No chart data yet</div>
            )}
          </div>

          <div className="trading-detail-grid">
            <div>
              <span>Volume</span>
              <strong>{fmtVolume(asset.volume)}</strong>
            </div>
            <div>
              <span>Market</span>
              <strong>{meta.label}</strong>
            </div>
            <div>
              <span>Day range</span>
              <strong>
                {fmtPrice(asset.dayLow, meta.priceDecimals)} – {fmtPrice(asset.dayHigh, meta.priceDecimals)}
              </strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{canTrade ? 'Trading enabled' : 'Market closed'}</strong>
            </div>
          </div>

          {asset.holding && (
            <div className="phone-card">
              <p className="phone-section-label" style={{ marginTop: 0 }}>
                Your position
              </p>
              <div className="trading-stat-row">
                <span>Quantity</span>
                <strong>{fmtQty(asset.holding.quantity, meta.qtyDecimals)}</strong>
              </div>
              <div className="trading-stat-row">
                <span>Avg cost</span>
                <strong>{fmtPrice(asset.holding.avgCost, meta.priceDecimals)}</strong>
              </div>
              <div className="trading-stat-row">
                <span>Value</span>
                <strong>{fmtMoney((asset.holding.quantity || 0) * (asset.price || 0))}</strong>
              </div>
            </div>
          )}

        </>
      )}
    </AppScreen>
  )
}
