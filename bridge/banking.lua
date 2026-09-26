--- Banking integration (Renewed-Banking or framework money)
SRBanking = {}

local function bankingResourceStarted()
    return GetResourceState(Config.Bank.resource or 'Renewed-Banking') == 'started'
end

function SRBanking.UseRenewed()
    return Config.Bank.provider == 'renewed' and bankingResourceStarted()
end

function SRBanking.GetBalance(source)
    return SRBridge.GetMoney(source, 'bank')
end

local function formatTimeAgo(epoch)
    if not epoch then return 'Recently' end
    local diff = os.time() - math.floor(epoch)
    if diff < 60 then return 'Just now' end
    if diff < 3600 then return ('%dm ago'):format(math.floor(diff / 60)) end
    if diff < 86400 then return ('%dh ago'):format(math.floor(diff / 3600)) end
    return ('%dd ago'):format(math.floor(diff / 86400))
end

function SRBanking.GetHistory(source)
    if not SRBanking.UseRenewed() then
        return nil
    end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local txs = exports[Config.Bank.resource]:getAccountTransactions(citizenid)
    if not txs or type(txs) ~= 'table' then return {} end

    local myName = SRBridge.GetDisplayName(source)
    local result = {}

    for i, tx in ipairs(txs) do
        local signedAmount = tx.trans_type == 'deposit' and tx.amount or -tx.amount
        local counterparty = tx.trans_type == 'deposit' and (tx.issuer or 'Unknown') or (tx.receiver or 'Unknown')
        if counterparty == myName then
            counterparty = tx.trans_type == 'deposit' and (tx.receiver or 'Unknown') or (tx.issuer or 'Unknown')
        end

        result[#result + 1] = {
            id = tx.trans_id or i,
            amount = signedAmount,
            note = tx.message or '',
            phone = counterparty,
            label = counterparty,
            timeAgo = formatTimeAgo(tx.time),
            direction = tx.trans_type == 'deposit' and 'received' or 'sent',
        }
    end

    return result
end

function SRBanking.FormatTimeAgo(epoch)
    if type(epoch) == 'string' then
        local y, m, d, H, M, S = epoch:match('(%d+)-(%d+)-(%d+) (%d+):(%d+):(%d+)')
        if y then
            epoch = os.time({
                year = tonumber(y),
                month = tonumber(m),
                day = tonumber(d),
                hour = tonumber(H),
                min = tonumber(M),
                sec = tonumber(S),
            })
        else
            return 'Recently'
        end
    end
    return formatTimeAgo(epoch)
end

function SRBanking.RecordTransfer(source, targetSource, amount, note)
    if not SRBanking.UseRenewed() then
        return nil
    end

    local senderCid = SRBridge.GetCitizenId(source)
    local receiverCid = SRBridge.GetCitizenId(targetSource)
    if not senderCid or not receiverCid then return end

    local senderName = SRBridge.GetDisplayName(source)
    local receiverName = SRBridge.GetDisplayName(targetSource)
    local message = (note and note ~= '') and note:sub(1, 128) or 'Phone transfer'
    local banking = exports[Config.Bank.resource]

    local withdrawTx = banking:handleTransaction(
        senderCid,
        ('Personal Account / %s'):format(senderCid),
        amount,
        message,
        senderName,
        receiverName,
        'withdraw'
    )

    local depositTx = banking:handleTransaction(
        receiverCid,
        ('Personal Account / %s'):format(receiverCid),
        amount,
        message,
        senderName,
        receiverName,
        'deposit',
        withdrawTx and withdrawTx.trans_id or nil
    )

    return {
        withdrawId = withdrawTx and withdrawTx.trans_id or nil,
        depositId = depositTx and depositTx.trans_id or nil,
    }
end

function SRBanking.Transfer(source, targetSource, amount, note)
    local total = amount + (Config.Bank.transferFee or 0)
    if SRBanking.GetBalance(source) < total then
        return { ok = false, error = 'insufficient' }
    end

    if not SRBridge.RemoveMoney(source, 'bank', total, 'phone-transfer') then
        return { ok = false, error = 'remove_failed' }
    end

    SRBridge.AddMoney(targetSource, 'bank', amount, 'phone-transfer-received')
    local txIds = SRBanking.RecordTransfer(source, targetSource, amount, note)

    return {
        ok = true,
        bank = SRBanking.GetBalance(source),
        cash = SRBridge.GetMoney(source, 'cash'),
        senderTxId = txIds and txIds.withdrawId or nil,
        receiverTxId = txIds and txIds.depositId or nil,
    }
end
