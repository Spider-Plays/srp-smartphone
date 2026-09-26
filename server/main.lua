lib.callback.register('sr-smartphone:server:canOpen', function(source)
    return SRHasPhoneItem(source)
end)

local function normalizePhoneScale(value)
    local presets = Config.PhoneScale and Config.PhoneScale.presets or { 85, 100, 110, 120 }
    local parsed = math.floor(tonumber(value) or Config.PhoneScale.default or 100)
    local nearest = presets[1] or 100
    local minDiff = math.abs(parsed - nearest)
    for _, preset in ipairs(presets) do
        local diff = math.abs(parsed - preset)
        if diff < minDiff then
            minDiff = diff
            nearest = preset
        end
    end
    return nearest
end

lib.callback.register('sr-smartphone:server:getBootstrap', function(source)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end

    local settings = MySQL.single.await(
        'SELECT wallpaper, ringtone, notifications, phone_scale FROM sr_phone_settings WHERE citizenid = ?',
        { citizenid }
    )

    if not settings then
        MySQL.insert.await(
            'INSERT INTO sr_phone_settings (citizenid, wallpaper, ringtone, phone_scale) VALUES (?, ?, ?, ?)',
            { citizenid, Config.DefaultWallpaper, Config.DefaultRingtone, Config.PhoneScale.default }
        )
        settings = {
            wallpaper = Config.DefaultWallpaper,
            ringtone = Config.DefaultRingtone,
            notifications = 1,
            phone_scale = Config.PhoneScale.default,
        }
    end

    settings.phone_scale = normalizePhoneScale(settings.phone_scale)

    return {
        citizenid = citizenid,
        phone = SRBridge.GetPhoneNumber(source),
        name = SRBridge.GetDisplayName(source),
        stateId = SRBridge.GetStateId(source),
        apartment = SRBridge.GetApartmentLabel(source),
        properties = (type(SRProperties) == 'table' and SRProperties.GetSections and SRProperties.GetSections(source))
            or { apartments = {}, houses = {} },
        money = {
            cash = SRBridge.GetMoney(source, 'cash'),
            bank = SRBanking.GetBalance(source),
        },
        settings = settings,
        apps = SRPhoneResolveApps(citizenid),
        bankConfig = Config.Bank,
        marketCategories = Config.Market and Config.Market.categories or {},
        jobCenter = (function()
            local jc = Config.Market and Config.Market.jobCenter
            if not jc or jc.enabled == false then return { enabled = false, jobs = {} } end
            return { enabled = true, jobs = jc.jobs or {} }
        end)(),
        dispatchCategories = Config.Dispatch and Config.Dispatch.categories or {},
        emergencyConfig = Config.Dispatch and {
            policeNumber = Config.Dispatch.policeNumber or '911',
            medicalNumber = Config.Dispatch.medicalNumber or '811',
            dispatchNumber = Config.Dispatch.dispatchNumber or '311',
        } or {},
        serviceTypes = Config.Services and Config.Services.types or {},
        docCategories = Config.Documents and Config.Documents.categories or {},
        newsConfig = (function()
            local cfg = Config.News or { appName = 'Weazel News' }
            return {
                appName = cfg.appName or 'Weazel News',
                defaultOutlet = cfg.defaultOutlet or 'weazel',
                canPublish = SRNewsCanPublish(source),
            }
        end)(),
        mailConfig = Config.Mail or { domain = 'spider.mail', maxAttachments = 5 },
    }
end)

lib.callback.register('sr-smartphone:server:saveSettings', function(source, data)
    if not SRCheckRate(source, 'settings', 20) then return false end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return false end

    MySQL.update.await(
        'UPDATE sr_phone_settings SET wallpaper = ?, ringtone = ?, notifications = ?, phone_scale = ? WHERE citizenid = ?',
        {
            data.wallpaper or Config.DefaultWallpaper,
            data.ringtone or Config.DefaultRingtone,
            data.notifications and 1 or 0,
            normalizePhoneScale(data.phone_scale),
            citizenid,
        }
    )
    return true
end)

lib.callback.register('sr-smartphone:server:lookupPhone', function(source, phone)
    local target = SRBridge.GetPlayerByPhone(phone)
    if not target then
        return { online = false, name = nil, citizenid = nil }
    end

    return {
        online = true,
        name = SRBridge.GetDisplayName(target.PlayerData.source),
        citizenid = target.PlayerData.citizenid,
        source = target.PlayerData.source,
    }
end)

local function pushBankTransactionNotification(targetSource, payload)
    TriggerClientEvent('sr-smartphone:client:bankTransaction', targetSource, payload)
end

local function notifyBankTransferParties(senderSource, receiverSource, amount, note, txMeta)
    local senderName = SRBridge.GetDisplayName(senderSource)
    local receiverName = SRBridge.GetDisplayName(receiverSource)
    local value = tonumber(amount) or 0

    pushBankTransactionNotification(senderSource, {
        id = txMeta and txMeta.senderTxId or nil,
        title = 'Bank Transfer',
        message = ('Sent $%s to %s'):format(value, receiverName),
        amount = -value,
        direction = 'sent',
        counterparty = receiverName,
        note = note or '',
        app = 'bank',
    })

    pushBankTransactionNotification(receiverSource, {
        id = txMeta and txMeta.receiverTxId or nil,
        title = 'Bank Deposit',
        message = ('Received $%s from %s'):format(value, senderName),
        amount = value,
        direction = 'received',
        counterparty = senderName,
        note = note or '',
        app = 'bank',
    })
end

lib.callback.register('sr-smartphone:server:bankTransfer', function(source, data)
    if not Config.Bank.enabled or not Config.Bank.allowTransfer then return { ok = false, error = 'disabled' } end
    if not SRCheckRate(source, 'bankTransfer', Config.RateLimit.bankTransfer) then
        return { ok = false, error = 'rate_limit' }
    end

    local amount = tonumber(data.amount)
    local targetPhone = data.phone

    if not amount or amount < Config.Bank.minTransfer or amount > Config.Bank.maxTransfer then
        return { ok = false, error = 'invalid_amount' }
    end

    local targetPlayer = SRBridge.GetPlayerByPhone(targetPhone)
    if not targetPlayer then
        return { ok = false, error = 'offline' }
    end

    local targetSource = targetPlayer.PlayerData.source
    if targetSource == source then
        return { ok = false, error = 'self' }
    end

    local result = SRBanking.Transfer(source, targetSource, amount, data.note)
    if not result.ok then return result end

    notifyBankTransferParties(source, targetSource, amount, data.note, {
        senderTxId = result.senderTxId,
        receiverTxId = result.receiverTxId,
    })

    return result
end)

lib.callback.register('sr-smartphone:server:bankTransferById', function(source, data)
    if not Config.Bank.enabled or not Config.Bank.allowTransfer then return { ok = false, error = 'disabled' } end
    if not SRCheckRate(source, 'bankTransfer', Config.RateLimit.bankTransfer) then
        return { ok = false, error = 'rate_limit' }
    end

    local amount = tonumber(data.amount)
    local targetId = tonumber(data.targetId)
    if not amount or not targetId then return { ok = false, error = 'invalid' } end
    if amount < Config.Bank.minTransfer or amount > Config.Bank.maxTransfer then
        return { ok = false, error = 'invalid_amount' }
    end

    local targetPlayer = exports.qbx_core:GetPlayer(targetId)
    if not targetPlayer then return { ok = false, error = 'offline' } end
    if targetId == source then return { ok = false, error = 'self' } end

    local result = SRBanking.Transfer(source, targetId, amount, data.note)
    if not result.ok then return result end

    local historyId
    if not SRBanking.UseRenewed() then
        local senderCitizenid = SRBridge.GetCitizenId(source)
        local receiverCitizenid = targetPlayer.PlayerData.citizenid
        historyId = MySQL.insert.await(
            'INSERT INTO sr_phone_bank_history (sender_citizenid, receiver_citizenid, amount, note) VALUES (?, ?, ?, ?)',
            { senderCitizenid, receiverCitizenid, amount, (data.note or ''):sub(1, 128) }
        )
    end

    notifyBankTransferParties(source, targetId, amount, data.note, {
        senderTxId = result.senderTxId or (historyId and ('phone_%s_sent'):format(historyId)),
        receiverTxId = result.receiverTxId or (historyId and ('phone_%s_recv'):format(historyId)),
    })

    return result
end)

lib.callback.register('sr-smartphone:server:getBankHistory', function(source)
    local renewedHistory = SRBanking.GetHistory(source)
    if renewedHistory then
        return renewedHistory
    end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local rows = MySQL.query.await([[
        SELECT h.id, h.amount, h.note, h.created_at,
               CASE WHEN h.receiver_citizenid = ? THEN 'received' ELSE 'sent' END AS direction,
               p.charinfo
        FROM sr_phone_bank_history h
        LEFT JOIN players p ON ]] .. SRPhoneJoinCitizenId('p.citizenid', [[CASE
            WHEN h.receiver_citizenid = ? THEN h.sender_citizenid
            ELSE h.receiver_citizenid END]]) .. [[
        WHERE h.sender_citizenid = ? OR h.receiver_citizenid = ?
        ORDER BY h.created_at DESC
        LIMIT 30
    ]], { citizenid, citizenid, citizenid, citizenid }) or {}

    local result = {}
    for _, row in ipairs(rows) do
        local phone = 'Unknown'
        if row.charinfo then
            local ok, info = pcall(json.decode, row.charinfo)
            if ok and info?.phone then phone = info.phone end
        end
        local signedAmount = row.direction == 'received' and row.amount or -row.amount
        result[#result + 1] = {
            id = row.id,
            amount = signedAmount,
            note = row.note,
            phone = phone,
            label = phone,
            timeAgo = SRBanking.FormatTimeAgo(row.created_at),
            direction = row.direction,
        }
    end
    return result
end)

-- ─── Emergency / Dispatch (registered here so callbacks always load) ────────

local function dispatchNotifyPhone(source, title, description, nType)
    TriggerClientEvent('sr-smartphone:client:notify', source, {
        title = title,
        description = description,
        type = nType or 'inform',
    })
end

local function playersOnDutyForJob(jobName)
    local list = {}
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local player = exports.qbx_core:GetPlayer(src)
        if player and player.PlayerData.job.name == jobName and player.PlayerData.job.onduty then
            list[#list + 1] = src
        end
    end
    return list
end

local function playersForEmergencyJob(jobName, specialty)
    local list = {}
    if not jobName or jobName == '' then return list end

    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local player = exports.qbx_core:GetPlayer(src)
        if player and player.PlayerData.job.name == jobName then
            local job = player.PlayerData.job
            list[#list + 1] = {
                name = SRBridge.GetDisplayName(src),
                phone = SRBridge.GetPhoneNumber(src) or '',
                online = job.onduty == true,
                specialty = specialty or job.label or '',
            }
        end
    end

    table.sort(list, function(a, b)
        if a.online ~= b.online then return a.online end
        return (a.name or '') < (b.name or '')
    end)

    return list
end

local function psDispatchRunning()
    local cfg = Config.Dispatch or {}
    if cfg.usePsDispatch == false then return false end
    return GetResourceState(cfg.psDispatchResource or 'ps-dispatch') == 'started'
end

lib.callback.register('sr-smartphone:server:getDispatchConfig', function()
    return {
        categories = Config.Dispatch and Config.Dispatch.categories or {},
    }
end)

lib.callback.register('sr-smartphone:server:getEmergencyData', function()
    local cfg = Config.Dispatch or {}
    local lawyers = playersForEmergencyJob(cfg.lawyerJob or 'lawyer', 'Criminal')
    local judges = playersForEmergencyJob(cfg.judgeJob or 'judge', nil)

    local legislation = {}
    for _, row in ipairs(cfg.legislation or {}) do
        legislation[#legislation + 1] = {
            id = row.id,
            title = row.title,
            summary = row.summary,
        }
    end

    return {
        lawyers = lawyers,
        judges = judges,
        proceedings = {},
        legislation = legislation,
    }
end)

lib.callback.register('sr-smartphone:server:sendDispatch', function(source, data)
    if type(data) ~= 'table' or not data.category or data.category == '' then
        return { ok = false, error = 'invalid' }
    end

    if not SRCheckRate(source, 'dispatch', 10) then
        return { ok = false, error = 'rate_limit' }
    end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then
        return { ok = false, error = 'not_loaded' }
    end

    local category = tostring(data.category):sub(1, 32)
    local message = tostring(data.message or ''):sub(1, 500)
    local callerName = SRBridge.GetDisplayName(source)
    local callerPhone = SRBridge.GetPhoneNumber(source)
    local coords = data.coords or {}

    if psDispatchRunning() then
        TriggerClientEvent('sr-smartphone:client:psDispatch', source, category, message)
        return { ok = true, via = 'ps-dispatch' }
    end

    local okInsert, id = pcall(function()
        return MySQL.insert.await(
            'INSERT INTO sr_phone_dispatch_calls (caller_citizenid, caller_phone, caller_name, category, message, status, x, y, z) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            {
                citizenid,
                callerPhone or '',
                callerName,
                category,
                message,
                'open',
                tonumber(coords.x) or 0.0,
                tonumber(coords.y) or 0.0,
                tonumber(coords.z) or 0.0,
            }
        )
    end)

    if not okInsert or not id then
        print(('[sr-smartphone] sendDispatch insert failed (src=%s): %s'):format(source, tostring(id)))
        return { ok = false, error = 'database' }
    end

    local jobs = Config.Dispatch and Config.Dispatch.jobs or { 'police', 'ambulance' }
    for _, jobName in ipairs(jobs) do
        for _, target in ipairs(playersOnDutyForJob(jobName)) do
            dispatchNotifyPhone(target, 'Emergency — ' .. category, callerName .. ': ' .. message, 'error')
            TriggerClientEvent('sr-smartphone:client:dispatchAlert', target, {
                id = id,
                category = category,
                message = message,
                caller = callerName,
                phone = callerPhone,
                coords = coords,
            })
        end
    end

    return { ok = true, id = id }
end)

exports('GetPlayerPhone', function(playerSource)
    return SRBridge.GetPhoneNumber(playerSource)
end)

exports('SendMessageToPhone', function(phone, message, senderLabel)
    local targetSource = SRBridge.GetSourceByPhone(phone)
    if not targetSource then return false end

    TriggerClientEvent('sr-smartphone:client:notify', targetSource, {
        type = 'message',
        title = senderLabel or 'New Message',
        body = message,
    })
    return true
end)
