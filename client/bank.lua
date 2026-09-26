--- Bank transaction phone notifications (Renewed-Banking / history polling).

local seenBankTxIds = {}
local bankHistorySeeded = false

local function markBankTxSeen(id)
    if id == nil then return end
    seenBankTxIds[tostring(id)] = true
end

local function pushBankTransactionToPhone(data)
    if data and data.id then
        markBankTxSeen(data.id)
    end

    SendNUIMessage({
        action = 'bankTransaction',
        data = data,
    })

    if not PhoneOpen then
        SRBridge.Notify({
            title = data.title or 'Bank',
            description = data.message or '',
            type = data.direction == 'received' and 'success' or 'inform',
        })
    end
end

local function buildMessageFromTx(tx)
    local amount = math.abs(tonumber(tx.amount) or 0)
    local party = tx.label or tx.phone or tx.counterparty or 'Unknown'
    if tx.direction == 'received' or (tx.amount and tx.amount > 0) then
        return ('Received $%s from %s'):format(amount, party)
    end
    return ('Sent $%s to %s'):format(amount, party)
end

local function syncBankHistoryNotifications()
    if not PlayerLoaded then return end

    local history = lib.callback.await('sr-smartphone:server:getBankHistory', false)
    if type(history) ~= 'table' then return end

    if not bankHistorySeeded then
        for _, tx in ipairs(history) do
            markBankTxSeen(tx.id)
        end
        bankHistorySeeded = true
        return
    end

    for i = 1, math.min(#history, 5) do
        local tx = history[i]
        local txId = tx.id
        if txId == nil then
            txId = ('fallback_%s_%s_%s'):format(i, tx.note or '', tx.timeAgo or '')
        end
        local key = tostring(txId)
        if not seenBankTxIds[key] then
            markBankTxSeen(key)
            local received = tx.direction == 'received' or (tx.amount and tx.amount > 0)
            pushBankTransactionToPhone({
                id = txId,
                title = received and 'Bank Deposit' or 'Bank Transfer',
                message = buildMessageFromTx(tx),
                amount = tx.amount,
                direction = received and 'received' or 'sent',
                counterparty = tx.label or tx.phone,
                note = tx.note,
                app = 'bank',
            })
        end
    end
end

RegisterNetEvent('sr-smartphone:client:bankTransaction', function(data)
    if not data then return end
    pushBankTransactionToPhone(data)
end)

RegisterNetEvent('QBCore:Client:OnMoneyChange', function(moneyType)
    if moneyType ~= 'bank' then return end
    SetTimeout(600, syncBankHistoryNotifications)
end)

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    bankHistorySeeded = false
    seenBankTxIds = {}
    SetTimeout(4000, syncBankHistoryNotifications)
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    bankHistorySeeded = false
    seenBankTxIds = {}
end)

RegisterNetEvent('qbx_core:client:playerLoggedOut', function()
    bankHistorySeeded = false
    seenBankTxIds = {}
end)

CreateThread(function()
    while true do
        if PlayerLoaded then
            syncBankHistoryNotifications()
            Wait(45000)
        else
            Wait(2000)
        end
    end
end)
