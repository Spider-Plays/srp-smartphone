local CRYPTO_TICK_SECONDS = 300 -- crypto: real-time tick every 5 minutes

local function tradingCfg()
    return Config.Trading or { maxAlerts = 15, maxWatchlist = 30, historyTicks = 24, historyWeekDays = 7, tradeFeePercent = 0 }
end

local function resolveGameTime(data)
    if data and data.gameTime and data.gameTime.hour ~= nil then
        return data.gameTime
    end
    return {
        hour = tonumber(os.date('%H')) or 12,
        minute = tonumber(os.date('%M')) or 0,
        day = tonumber(os.date('%d')) or 1,
        month = tonumber(os.date('%m')) or 1,
        dayKey = tonumber(os.date('%m')) * 100 + tonumber(os.date('%d')),
    }
end

local function isMarketOpen(cfg, gt)
    local mh = cfg and cfg.marketHours
    if not mh or mh.alwaysOpen == true then return true end
    local openH = mh.openHour or 9
    local closeH = mh.closeHour or 17
    local now = (gt.hour or 0) * 60 + (gt.minute or 0)
    return now >= (openH * 60) and now < (closeH * 60)
end

local function minutesUntilMarketEvent(cfg, gt)
    local mh = cfg and cfg.marketHours
    if not mh or mh.alwaysOpen then return nil end
    local openH, closeH = mh.openHour or 9, mh.closeHour or 17
    local now = (gt.hour or 0) * 60 + (gt.minute or 0)
    local openM, closeM = openH * 60, closeH * 60
    if now < openM then
        return { event = 'opens', minutes = openM - now }
    end
    if now >= closeM then
        return { event = 'opens', minutes = (24 * 60 - now) + openM }
    end
    return { event = 'closes', minutes = closeM - now }
end

local function buildMarketStatus(cfg, gt)
    local mh = cfg and cfg.marketHours
    if not mh or mh.alwaysOpen then
        return { isOpen = true, alwaysOpen = true, label = 'Open 24/7' }
    end
    local open = isMarketOpen(cfg, gt)
    local nextEv = minutesUntilMarketEvent(cfg, gt)
    return {
        isOpen = open,
        alwaysOpen = false,
        openHour = mh.openHour or 9,
        closeHour = mh.closeHour or 17,
        nextEvent = nextEv and nextEv.event or nil,
        minutesUntil = nextEv and nextEv.minutes or nil,
        gameHour = gt.hour,
        gameMinute = gt.minute,
    }
end

local function getCryptoTick()
    return math.floor(os.time() / CRYPTO_TICK_SECONDS)
end

local function getStockTick(gt, cfg)
    local mh = cfg.marketHours or { openHour = 9, closeHour = 17, tickMinutes = 5 }
    local openH, closeH = mh.openHour or 9, mh.closeHour or 17
    local openM, closeM = openH * 60, closeH * 60
    local dayKey = gt.dayKey or ((gt.month or 1) * 100 + (gt.day or 1))
    local now = (gt.hour or 0) * 60 + (gt.minute or 0)
    local sessionLen = math.max(closeM - openM, 1)
    local tickStep = math.max(mh.tickMinutes or 5, 1)
    local maxIntradayTick = math.max(math.floor(sessionLen / tickStep) - 1, 0)

    if now < openM then
        return (dayKey - 1) * 1000 + maxIntradayTick, false
    end
    if now >= closeM then
        return dayKey * 1000 + maxIntradayTick, false
    end

    local intraday = now - openM
    return dayKey * 1000 + math.floor(intraday / tickStep), true
end

local function getPriceTick(asset, marketKind, gt)
    if marketKind == 'stocks' then
        local cfg = Config.StockMarket or {}
        local tick = getStockTick(gt, cfg)
        return tick
    end
    return getCryptoTick()
end

local function notifyPhone(source, title, description, nType)
    TriggerClientEvent('sr-smartphone:client:notify', source, {
        title = title,
        description = description,
        type = nType or 'inform',
    })
end

local function formatTimeAgo(createdAt)
    if not createdAt then return 'Recently' end
    local ts = createdAt
    if type(createdAt) == 'string' then
        local y, m, d, h, min, s = createdAt:match('(%d+)-(%d+)-(%d+) (%d+):(%d+):(%d+)')
        if y then
            ts = os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d), hour = tonumber(h), min = tonumber(min), sec = tonumber(s) })
        end
    end
    local diff = os.time() - (tonumber(ts) or os.time())
    if diff < 60 then return 'Just now' end
    if diff < 3600 then return ('%dm ago'):format(math.floor(diff / 60)) end
    if diff < 86400 then return ('%dh ago'):format(math.floor(diff / 3600)) end
    return ('%dd ago'):format(math.floor(diff / 86400))
end

local function hashSeed(str)
    local h = 0
    for i = 1, #str do
        h = (h * 31 + string.byte(str, i)) % 2147483647
    end
    return h
end

local function priceAtTick(basePrice, volatility, assetKey, tick)
    local seed = hashSeed(assetKey) + tick
    local wave1 = math.sin(seed * 0.017) * volatility
    local wave2 = math.cos(seed * 0.031) * (volatility * 0.6)
    return basePrice * (1 + wave1 + wave2)
end

local function getLivePrice(asset, marketKind, gt)
    local tick = getPriceTick(asset, marketKind, gt)
    return priceAtTick(asset.basePrice, asset.volatility, asset.id, tick)
end

local function getChangePercent(asset, marketKind, gt)
    local tick = getPriceTick(asset, marketKind, gt)
    local current = priceAtTick(asset.basePrice, asset.volatility, asset.id, tick)
    local previous = priceAtTick(asset.basePrice, asset.volatility, asset.id, tick - 1)
    if previous <= 0 then return 0 end
    return ((current - previous) / previous) * 100
end

local function getPriceHistory(asset, marketKind, gt, count)
    count = count or tradingCfg().historyTicks or 24
    local tick = getPriceTick(asset, marketKind, gt)
    local history = {}
    for i = count - 1, 0, -1 do
        history[#history + 1] = priceAtTick(asset.basePrice, asset.volatility, asset.id, tick - i)
    end
    return history
end

local function getMaxIntradayTick(cfg)
    local mh = (cfg and cfg.marketHours) or { openHour = 9, closeHour = 17, tickMinutes = 5 }
    local openM = (mh.openHour or 9) * 60
    local closeM = (mh.closeHour or 17) * 60
    local sessionLen = math.max(closeM - openM, 1)
    local tickStep = math.max(mh.tickMinutes or 5, 1)
    return math.max(math.floor(sessionLen / tickStep) - 1, 0)
end

--- One closing price per day for the weekly chart (7 points by default).
local function getWeeklyHistory(asset, marketKind, gt)
    local days = tradingCfg().historyWeekDays or 7
    local history = {}

    if marketKind == 'crypto' then
        local tick = getCryptoTick()
        local ticksPerDay = math.max(math.floor(86400 / CRYPTO_TICK_SECONDS), 1)
        for d = days - 1, 0, -1 do
            history[#history + 1] = priceAtTick(asset.basePrice, asset.volatility, asset.id, tick - (d * ticksPerDay))
        end
    else
        local cfg = Config.StockMarket or {}
        local dayKey = gt.dayKey or ((gt.month or 1) * 100 + (gt.day or 1))
        local closeTick = getMaxIntradayTick(cfg)
        for d = days - 1, 0, -1 do
            local tick = (dayKey - d) * 1000 + closeTick
            history[#history + 1] = priceAtTick(asset.basePrice, asset.volatility, asset.id, tick)
        end
    end

    return history
end

local function getDayStats(asset, marketKind, gt)
    local history = getPriceHistory(asset, marketKind, gt, tradingCfg().historyTicks or 24)
    if #history == 0 then return { dayHigh = 0, dayLow = 0, dayOpen = 0 } end
    local dayHigh, dayLow, dayOpen = history[1], history[1], history[1]
    for _, price in ipairs(history) do
        if price > dayHigh then dayHigh = price end
        if price < dayLow then dayLow = price end
    end
    return { dayHigh = dayHigh, dayLow = dayLow, dayOpen = dayOpen }
end

local function simulatedVolume(asset, marketKind, gt)
    local tick = getPriceTick(asset, marketKind, gt)
    local seed = hashSeed(asset.id .. '_vol') + tick
    return math.floor(500000 + (math.abs(math.sin(seed * 0.02)) * 4500000))
end

local function secondsUntilNextTick(marketKind, gt)
    if marketKind == 'stocks' then
        local cfg = Config.StockMarket or {}
        local mh = cfg.marketHours or { openHour = 9, closeHour = 17, tickMinutes = 5 }
        if not isMarketOpen(cfg, gt) then return nil end
        local tickStep = math.max(mh.tickMinutes or 5, 1)
        local now = (gt.hour or 0) * 60 + (gt.minute or 0)
        local openM = (mh.openHour or 9) * 60
        local minsIntoSession = now - openM
        local nextTickMin = (math.floor(minsIntoSession / tickStep) + 1) * tickStep
        return (nextTickMin - minsIntoSession) * 60
    end
    return CRYPTO_TICK_SECONDS - (os.time() % CRYPTO_TICK_SECONDS)
end

local function findAsset(list, id)
    for _, asset in ipairs(list) do
        if asset.id == id then return asset end
    end
    return nil
end

local function buildAssetList(configList, marketKind, gt, includeHistory)
    local assets = {}
    for _, asset in ipairs(configList or {}) do
        local price = getLivePrice(asset, marketKind, gt)
        local stats = getDayStats(asset, marketKind, gt)
        local entry = {
            id = asset.id,
            symbol = asset.symbol,
            name = asset.name,
            color = asset.color,
            price = price,
            changePct = getChangePercent(asset, marketKind, gt),
            dayHigh = stats.dayHigh,
            dayLow = stats.dayLow,
            dayOpen = stats.dayOpen,
            volume = simulatedVolume(asset, marketKind, gt),
        }
        if includeHistory then
            entry.history = getPriceHistory(asset, marketKind, gt)
        end
        assets[#assets + 1] = entry
    end
    return assets
end

local function getHoldings(citizenid, tableName, idColumn)
    return MySQL.query.await(
        ('SELECT %s AS asset_id, quantity, avg_cost FROM %s WHERE citizenid = ? AND quantity > 0'):format(idColumn, tableName),
        { citizenid }
    ) or {}
end

local function getTransactions(citizenid, tableName, idColumn, limit)
    local rows = MySQL.query.await(
        ('SELECT id, %s AS asset_id, action, quantity, price, total, created_at FROM %s WHERE citizenid = ? ORDER BY created_at DESC LIMIT ?'):format(idColumn, tableName),
        { citizenid, limit or 30 }
    ) or {}

    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.created_at)
    end
    return rows
end

local function enrichPortfolio(holdings, assets, assetLookup, marketKind, gt)
    local portfolio = {}
    local totalValue = 0
    local totalCost = 0

    for _, h in ipairs(holdings) do
        local asset = assetLookup[h.asset_id]
        if asset then
            local price = getLivePrice(asset, marketKind, gt)
            local qty = tonumber(h.quantity) or 0
            local avgCost = tonumber(h.avg_cost) or 0
            local value = qty * price
            local cost = qty * avgCost
            local pnl = value - cost
            local pnlPct = cost > 0 and ((pnl / cost) * 100) or 0

            portfolio[#portfolio + 1] = {
                assetId = h.asset_id,
                symbol = asset.symbol,
                name = asset.name,
                color = asset.color,
                quantity = qty,
                avgCost = avgCost,
                price = price,
                value = value,
                pnl = pnl,
                pnlPct = pnlPct,
            }
            totalValue = totalValue + value
            totalCost = totalCost + cost
        end
    end

    return portfolio, totalValue, totalCost
end

local function applyTradeFee(amount)
    local feePct = tradingCfg().tradeFeePercent or 0
    if feePct <= 0 then return amount, 0 end
    local fee = math.floor(amount * feePct / 100)
    return amount + fee, fee
end

local function executeBuy(source, citizenid, cfg, tableName, idColumn, assetId, amount, marketKind, gt)
    local asset = findAsset(cfg.assets, assetId)
    if not asset then return { ok = false, error = 'invalid_asset' } end

    if marketKind == 'stocks' and not isMarketOpen(cfg, gt) then
        return { ok = false, error = 'market_closed' }
    end

    amount = math.floor(tonumber(amount) or 0)
    if amount < cfg.minTrade or amount > cfg.maxTrade then
        return { ok = false, error = 'invalid_amount' }
    end

    local debitAmount, fee = applyTradeFee(amount)
    if SRBanking.GetBalance(source) < debitAmount then
        return { ok = false, error = 'insufficient' }
    end

    local price = getLivePrice(asset, marketKind, gt)
    if price <= 0 then return { ok = false, error = 'invalid_price' } end

    local quantity = amount / price
    if quantity <= 0 then return { ok = false, error = 'invalid_quantity' } end

    if not SRBridge.RemoveMoney(source, 'bank', debitAmount, cfg.label .. ' buy') then
        return { ok = false, error = 'remove_failed' }
    end

    local existing = MySQL.single.await(
        ('SELECT quantity, avg_cost FROM %s WHERE citizenid = ? AND %s = ?'):format(tableName, idColumn),
        { citizenid, assetId }
    )

    if existing then
        local oldQty = tonumber(existing.quantity) or 0
        local oldAvg = tonumber(existing.avg_cost) or 0
        local newQty = oldQty + quantity
        local newAvg = ((oldQty * oldAvg) + amount) / newQty
        MySQL.update.await(
            ('UPDATE %s SET quantity = ?, avg_cost = ? WHERE citizenid = ? AND %s = ?'):format(tableName, idColumn),
            { newQty, newAvg, citizenid, assetId }
        )
    else
        MySQL.insert.await(
            ('INSERT INTO %s (citizenid, %s, quantity, avg_cost) VALUES (?, ?, ?, ?)'):format(tableName, idColumn),
            { citizenid, assetId, quantity, price }
        )
    end

    MySQL.insert.await(
        ('INSERT INTO %s (citizenid, %s, action, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)'):format(tableName:gsub('_holdings', '_transactions'), idColumn),
        { citizenid, assetId, 'buy', quantity, price, amount }
    )

    return {
        ok = true,
        bank = SRBanking.GetBalance(source),
        cash = SRBridge.GetMoney(source, 'cash'),
        fee = fee,
    }
end

local function executeSell(source, citizenid, cfg, tableName, idColumn, assetId, quantity, marketKind, gt)
    local asset = findAsset(cfg.assets, assetId)
    if not asset then return { ok = false, error = 'invalid_asset' } end

    if marketKind == 'stocks' and not isMarketOpen(cfg, gt) then
        return { ok = false, error = 'market_closed' }
    end

    quantity = tonumber(quantity) or 0
    if quantity <= 0 then return { ok = false, error = 'invalid_quantity' } end

    local holding = MySQL.single.await(
        ('SELECT quantity FROM %s WHERE citizenid = ? AND %s = ?'):format(tableName, idColumn),
        { citizenid, assetId }
    )
    if not holding then return { ok = false, error = 'no_holding' } end

    local owned = tonumber(holding.quantity) or 0
    if quantity > owned + 0.0000001 then
        return { ok = false, error = 'insufficient_holdings' }
    end

    local price = getLivePrice(asset, marketKind, gt)
    local gross = math.floor(quantity * price)
    if gross <= 0 then return { ok = false, error = 'invalid_total' } end

    local feePct = tradingCfg().tradeFeePercent or 0
    local fee = feePct > 0 and math.floor(gross * feePct / 100) or 0
    local total = gross - fee

    local remaining = owned - quantity
    if remaining < 0.0000001 then
        MySQL.update.await(
            ('DELETE FROM %s WHERE citizenid = ? AND %s = ?'):format(tableName, idColumn),
            { citizenid, assetId }
        )
    else
        MySQL.update.await(
            ('UPDATE %s SET quantity = ? WHERE citizenid = ? AND %s = ?'):format(tableName, idColumn),
            { remaining, citizenid, assetId }
        )
    end

    SRBridge.AddMoney(source, 'bank', total, (cfg.label or 'Trade') .. ' sell')

    MySQL.insert.await(
        ('INSERT INTO %s (citizenid, %s, action, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)'):format(tableName:gsub('_holdings', '_transactions'), idColumn),
        { citizenid, assetId, 'sell', quantity, price, gross }
    )

    return {
        ok = true,
        bank = SRBanking.GetBalance(source),
        cash = SRBridge.GetMoney(source, 'cash'),
        fee = fee,
    }
end

local function buildTradingData(source, cfg, holdingsTable, txTable, idColumn, marketKind, gt)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end

    local assetLookup = {}
    for _, asset in ipairs(cfg.assets or {}) do
        assetLookup[asset.id] = asset
    end

    local holdings = getHoldings(citizenid, holdingsTable, idColumn)
    local portfolio, totalValue, totalCost = enrichPortfolio(holdings, cfg.assets, assetLookup, marketKind, gt)
    local totalPnl = totalValue - totalCost
    local totalPnlPct = totalCost > 0 and ((totalPnl / totalCost) * 100) or 0

    local transactions = getTransactions(citizenid, txTable, idColumn, 30)
    for _, tx in ipairs(transactions) do
        local asset = assetLookup[tx.asset_id]
        if asset then
            tx.symbol = asset.symbol
            tx.name = asset.name
        end
    end

    return {
        assets = buildAssetList(cfg.assets, marketKind, gt, false),
        portfolio = portfolio,
        portfolioSummary = {
            totalValue = totalValue,
            totalCost = totalCost,
            totalPnl = totalPnl,
            totalPnlPct = totalPnlPct,
        },
        transactions = transactions,
        minTrade = cfg.minTrade,
        maxTrade = cfg.maxTrade,
        marketStatus = buildMarketStatus(cfg, gt),
    }
end

local function getWatchlist(citizenid)
    return MySQL.query.await(
        'SELECT market_kind, asset_id FROM sr_phone_trading_watchlist WHERE citizenid = ?',
        { citizenid }
    ) or {}
end

local function watchlistKey(marketKind, assetId)
    return ('%s:%s'):format(marketKind, assetId)
end

local function getAlerts(citizenid, assetLookupByMarket, gt)
    local rows = MySQL.query.await(
        'SELECT id, market_kind, asset_id, direction, target_price, triggered, created_at FROM sr_phone_trading_alerts WHERE citizenid = ? AND triggered = 0 ORDER BY created_at DESC',
        { citizenid }
    ) or {}

    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.created_at)
        local lookup = assetLookupByMarket[row.market_kind]
        local asset = lookup and lookup[row.asset_id]
        if asset then
            row.symbol = asset.symbol
            row.name = asset.name
            row.color = asset.color
            row.currentPrice = getLivePrice(asset, row.market_kind, gt)
        end
    end
    return rows
end

local function checkAndTriggerAlerts(source, citizenid, assetLookupByMarket, gt)
    local alerts = MySQL.query.await(
        'SELECT id, market_kind, asset_id, direction, target_price FROM sr_phone_trading_alerts WHERE citizenid = ? AND triggered = 0',
        { citizenid }
    ) or {}

    local triggered = {}
    for _, alert in ipairs(alerts) do
        local lookup = assetLookupByMarket[alert.market_kind]
        local asset = lookup and lookup[alert.asset_id]
        if asset then
            local price = getLivePrice(asset, alert.market_kind, gt)
            local hit = (alert.direction == 'above' and price >= tonumber(alert.target_price))
                or (alert.direction == 'below' and price <= tonumber(alert.target_price))
            if hit then
                MySQL.update.await('UPDATE sr_phone_trading_alerts SET triggered = 1 WHERE id = ?', { alert.id })
                local label = ('%s %s $%s'):format(
                    asset.symbol,
                    alert.direction == 'above' and 'rose above' or 'fell below',
                    alert.target_price
                )
                notifyPhone(source, 'Price Alert', label, 'success')
                triggered[#triggered + 1] = {
                    id = alert.id,
                    symbol = asset.symbol,
                    direction = alert.direction,
                    targetPrice = tonumber(alert.target_price),
                    currentPrice = price,
                }
            end
        end
    end
    return triggered
end

local function buildTopMovers(assets, count)
    count = count or 3
    local sortedUp, sortedDown = {}, {}
    for _, a in ipairs(assets or {}) do
        sortedUp[#sortedUp + 1] = a
        sortedDown[#sortedDown + 1] = a
    end
    table.sort(sortedUp, function(x, y) return (x.changePct or 0) > (y.changePct or 0) end)
    table.sort(sortedDown, function(x, y) return (x.changePct or 0) < (y.changePct or 0) end)
    local gainers, losers = {}, {}
    for i = 1, math.min(count, #sortedUp) do gainers[#gainers + 1] = sortedUp[i] end
    for i = 1, math.min(count, #sortedDown) do losers[#losers + 1] = sortedDown[i] end
    return gainers, losers
end

-- ─── Combined trading app ───────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getTradingData', function(source, payload)
    local gt = resolveGameTime(payload)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end

    local bank = SRBanking.GetBalance(source)
    local crypto, stocks
    local assetLookupByMarket = {}

    if Config.Crypto and Config.Crypto.enabled then
        crypto = buildTradingData(source, Config.Crypto, 'sr_phone_crypto_holdings', 'sr_phone_crypto_transactions', 'asset_id', 'crypto', gt)
        assetLookupByMarket.crypto = {}
        for _, asset in ipairs(Config.Crypto.assets or {}) do
            assetLookupByMarket.crypto[asset.id] = asset
        end
    end

    if Config.StockMarket and Config.StockMarket.enabled then
        stocks = buildTradingData(source, Config.StockMarket, 'sr_phone_stock_holdings', 'sr_phone_stock_transactions', 'asset_id', 'stocks', gt)
        assetLookupByMarket.stocks = {}
        for _, asset in ipairs(Config.StockMarket.assets or {}) do
            assetLookupByMarket.stocks[asset.id] = asset
        end
    end

    if not crypto and not stocks then return nil end

    checkAndTriggerAlerts(source, citizenid, assetLookupByMarket, gt)

    local watchlistRows = getWatchlist(citizenid)
    local watchlist = {}
    for _, row in ipairs(watchlistRows) do
        watchlist[#watchlist + 1] = watchlistKey(row.market_kind, row.asset_id)
    end

    local alerts = getAlerts(citizenid, assetLookupByMarket, gt)

    local portfolioValue = 0
    if crypto and crypto.portfolioSummary then portfolioValue = portfolioValue + crypto.portfolioSummary.totalValue end
    if stocks and stocks.portfolioSummary then portfolioValue = portfolioValue + stocks.portfolioSummary.totalValue end

    local allAssets = {}
    if crypto then
        for _, a in ipairs(crypto.assets or {}) do
            a.marketKind = 'crypto'
            allAssets[#allAssets + 1] = a
        end
    end
    if stocks then
        for _, a in ipairs(stocks.assets or {}) do
            a.marketKind = 'stocks'
            allAssets[#allAssets + 1] = a
        end
    end
    local topGainers, topLosers = buildTopMovers(allAssets, 3)

    local cfg = tradingCfg()
    return {
        bank = bank,
        crypto = crypto,
        stocks = stocks,
        watchlist = watchlist,
        alerts = alerts,
        overview = {
            netWorth = bank + portfolioValue,
            bank = bank,
            portfolioValue = portfolioValue,
            topGainers = topGainers,
            topLosers = topLosers,
        },
        gameTime = gt,
        config = {
            maxAlerts = cfg.maxAlerts,
            maxWatchlist = cfg.maxWatchlist,
            tradeFeePercent = cfg.tradeFeePercent or 0,
            nextPriceUpdate = secondsUntilNextTick('crypto', gt),
            stockNextPriceUpdate = secondsUntilNextTick('stocks', gt),
        },
    }
end)

lib.callback.register('sr-smartphone:server:getTradingAssetDetail', function(source, data)
    if not data or not data.marketKind or not data.assetId then return nil end
    local gt = resolveGameTime(data)
    local marketKind = data.marketKind
    local cfg = marketKind == 'crypto' and Config.Crypto or Config.StockMarket
    if not cfg or not cfg.enabled then return nil end
    local asset = findAsset(cfg.assets, data.assetId)
    if not asset then return nil end

    local price = getLivePrice(asset, marketKind, gt)
    local stats = getDayStats(asset, marketKind, gt)
    local citizenid = SRBridge.GetCitizenId(source)
    local holding = citizenid and MySQL.single.await(
        ('SELECT quantity, avg_cost FROM %s WHERE citizenid = ? AND asset_id = ?'):format(
            marketKind == 'crypto' and 'sr_phone_crypto_holdings' or 'sr_phone_stock_holdings'
        ),
        { citizenid, data.assetId }
    ) or nil

    return {
        id = asset.id,
        symbol = asset.symbol,
        name = asset.name,
        color = asset.color,
        price = price,
        changePct = getChangePercent(asset, marketKind, gt),
        dayHigh = stats.dayHigh,
        dayLow = stats.dayLow,
        dayOpen = stats.dayOpen,
        volume = simulatedVolume(asset, marketKind, gt),
        history = getPriceHistory(asset, marketKind, gt),
        history1D = getPriceHistory(asset, marketKind, gt),
        history1W = getWeeklyHistory(asset, marketKind, gt),
        marketStatus = buildMarketStatus(cfg, gt),
        holding = holding and {
            quantity = tonumber(holding.quantity) or 0,
            avgCost = tonumber(holding.avg_cost) or 0,
        } or nil,
    }
end)

lib.callback.register('sr-smartphone:server:toggleTradingWatchlist', function(source, data)
    if not data or not data.marketKind or not data.assetId then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local exists = MySQL.scalar.await(
        'SELECT 1 FROM sr_phone_trading_watchlist WHERE citizenid = ? AND market_kind = ? AND asset_id = ?',
        { citizenid, data.marketKind, data.assetId }
    )

    if exists then
        MySQL.update.await(
            'DELETE FROM sr_phone_trading_watchlist WHERE citizenid = ? AND market_kind = ? AND asset_id = ?',
            { citizenid, data.marketKind, data.assetId }
        )
        return { ok = true, watching = false }
    end

    local count = MySQL.scalar.await('SELECT COUNT(*) FROM sr_phone_trading_watchlist WHERE citizenid = ?', { citizenid }) or 0
    if count >= (tradingCfg().maxWatchlist or 30) then
        return { ok = false, error = 'watchlist_full' }
    end

    MySQL.insert.await(
        'INSERT INTO sr_phone_trading_watchlist (citizenid, market_kind, asset_id) VALUES (?, ?, ?)',
        { citizenid, data.marketKind, data.assetId }
    )
    return { ok = true, watching = true }
end)

lib.callback.register('sr-smartphone:server:createTradingAlert', function(source, data)
    if not SRCheckRate(source, 'tradingAlert', Config.RateLimit.tradingAlert) then
        return { ok = false, error = 'rate_limit' }
    end
    if not data or not data.marketKind or not data.assetId or not data.direction or not data.targetPrice then
        return { ok = false, error = 'invalid' }
    end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local cfg = data.marketKind == 'crypto' and Config.Crypto or Config.StockMarket
    if not cfg or not findAsset(cfg.assets, data.assetId) then return { ok = false, error = 'invalid_asset' } end

    if data.direction ~= 'above' and data.direction ~= 'below' then return { ok = false, error = 'invalid' } end

    local targetPrice = tonumber(data.targetPrice)
    if not targetPrice or targetPrice <= 0 then return { ok = false, error = 'invalid_price' } end

    local count = MySQL.scalar.await(
        'SELECT COUNT(*) FROM sr_phone_trading_alerts WHERE citizenid = ? AND triggered = 0',
        { citizenid }
    ) or 0
    if count >= (tradingCfg().maxAlerts or 15) then
        return { ok = false, error = 'alerts_full' }
    end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_trading_alerts (citizenid, market_kind, asset_id, direction, target_price) VALUES (?, ?, ?, ?, ?)',
        { citizenid, data.marketKind, data.assetId, data.direction, targetPrice }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteTradingAlert', function(source, alertId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await('DELETE FROM sr_phone_trading_alerts WHERE id = ? AND citizenid = ?', { alertId, citizenid })
    return { ok = true }
end)

-- ─── Crypto ─────────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getCryptoData', function(source, payload)
    if not Config.Crypto or not Config.Crypto.enabled then return nil end
    local gt = resolveGameTime(payload)
    return buildTradingData(source, Config.Crypto, 'sr_phone_crypto_holdings', 'sr_phone_crypto_transactions', 'asset_id', 'crypto', gt)
end)

lib.callback.register('sr-smartphone:server:cryptoTrade', function(source, data)
    if not Config.Crypto or not Config.Crypto.enabled then return { ok = false, error = 'disabled' } end
    if not SRCheckRate(source, 'cryptoTrade', Config.RateLimit.cryptoTrade) then
        return { ok = false, error = 'rate_limit' }
    end

    local gt = resolveGameTime(data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.assetId or not data.action then
        return { ok = false, error = 'invalid' }
    end

    if data.action == 'buy' then
        return executeBuy(source, citizenid, Config.Crypto, 'sr_phone_crypto_holdings', 'asset_id', data.assetId, data.amount, 'crypto', gt)
    elseif data.action == 'sell' then
        return executeSell(source, citizenid, Config.Crypto, 'sr_phone_crypto_holdings', 'asset_id', data.assetId, data.quantity, 'crypto', gt)
    end

    return { ok = false, error = 'invalid_action' }
end)

-- ─── Stocks ─────────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getStockData', function(source, payload)
    if not Config.StockMarket or not Config.StockMarket.enabled then return nil end
    local gt = resolveGameTime(payload)
    return buildTradingData(source, Config.StockMarket, 'sr_phone_stock_holdings', 'sr_phone_stock_transactions', 'asset_id', 'stocks', gt)
end)

lib.callback.register('sr-smartphone:server:stockTrade', function(source, data)
    if not Config.StockMarket or not Config.StockMarket.enabled then return { ok = false, error = 'disabled' } end
    if not SRCheckRate(source, 'stockTrade', Config.RateLimit.stockTrade) then
        return { ok = false, error = 'rate_limit' }
    end

    local gt = resolveGameTime(data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.assetId or not data.action then
        return { ok = false, error = 'invalid' }
    end

    if data.action == 'buy' then
        return executeBuy(source, citizenid, Config.StockMarket, 'sr_phone_stock_holdings', 'asset_id', data.assetId, data.amount, 'stocks', gt)
    elseif data.action == 'sell' then
        return executeSell(source, citizenid, Config.StockMarket, 'sr_phone_stock_holdings', 'asset_id', data.assetId, data.quantity, 'stocks', gt)
    end

    return { ok = false, error = 'invalid_action' }
end)
