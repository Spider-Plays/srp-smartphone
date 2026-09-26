local function getConversationKey(a, b)
    if a < b then return a .. ':' .. b end
    return b .. ':' .. a
end

local function normalizeMessageImage(url)
    if type(url) ~= 'string' or url == '' then return nil end
    url = url:sub(1, 6 * 1024 * 1024)
    local isData = url:sub(1, 11) == 'data:image/'
    local isHttp = url:sub(1, 5) == 'https' or url:sub(1, 4) == 'http'
    if isData or isHttp then return url end
    return nil
end

local function previewText(message, image)
    if image and image ~= '' then
        if not message or message:match('^%s*$') then
            return 'Photo'
        end
    end
    return message
end

lib.callback.register('sr-smartphone:server:getConversations', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    local myPhone = SRBridge.GetPhoneNumber(source)
    if not citizenid or not myPhone then return {} end

    local rows = MySQL.query.await([[
        SELECT
            CASE WHEN sender_citizenid = ? THEN receiver_phone ELSE sender_phone END AS partner_phone,
            CASE WHEN sender_citizenid = ? THEN receiver_citizenid ELSE sender_citizenid END AS partner_citizenid,
            message,
            image,
            created_at,
            read_flag,
            sender_citizenid
        FROM sr_phone_messages
        WHERE sender_citizenid = ? OR receiver_citizenid = ?
        ORDER BY created_at DESC
    ]], { citizenid, citizenid, citizenid, citizenid }) or {}

    local conversations = {}
    local seen = {}

    for _, row in ipairs(rows) do
        local key = getConversationKey(myPhone, row.partner_phone)
        if not seen[key] then
            seen[key] = true
            local partnerName = 'Unknown'
            local partner = exports.qbx_core:GetPlayerByCitizenId(row.partner_citizenid)
            if partner then
                partnerName = SRBridge.GetDisplayName(partner.PlayerData.source)
            else
                local offline = exports.qbx_core:GetOfflinePlayer(row.partner_citizenid)
                if offline and offline.PlayerData and offline.PlayerData.charinfo then
                    local c = offline.PlayerData.charinfo
                    partnerName = ('%s %s'):format(c.firstname or '', c.lastname or '')
                end
            end

            conversations[#conversations + 1] = {
                phone = row.partner_phone,
                citizenid = row.partner_citizenid,
                name = partnerName,
                lastMessage = previewText(row.message, row.image),
                lastAt = row.created_at,
                unread = (row.sender_citizenid ~= citizenid and row.read_flag == 0) and 1 or 0,
            }
        end
    end

    return conversations
end)

lib.callback.register('sr-smartphone:server:getMessages', function(source, partnerPhone)
    local citizenid = SRBridge.GetCitizenId(source)
    local myPhone = SRBridge.GetPhoneNumber(source)
    if not citizenid or not myPhone or not partnerPhone then return {} end

    MySQL.update.await([[
        UPDATE sr_phone_messages
        SET read_flag = 1
        WHERE receiver_citizenid = ? AND sender_phone = ? AND read_flag = 0
    ]], { citizenid, partnerPhone })

    return MySQL.query.await([[
        SELECT id, sender_phone, receiver_phone, message, image, created_at,
               CASE WHEN sender_citizenid = ? THEN 1 ELSE 0 END AS is_mine
        FROM sr_phone_messages
        WHERE (sender_phone = ? AND receiver_phone = ?)
           OR (sender_phone = ? AND receiver_phone = ?)
        ORDER BY created_at ASC
        LIMIT 200
    ]], { citizenid, myPhone, partnerPhone, partnerPhone, myPhone }) or {}
end)

function SRSendPhoneMessage(source, data)
    if not SRCheckRate(source, 'sendMessage', Config.RateLimit.sendMessage) then
        return { ok = false, error = 'rate_limit' }
    end

    local citizenid = SRBridge.GetCitizenId(source)
    local myPhone = SRBridge.GetPhoneNumber(source)
    if not citizenid or not myPhone or not data or not data.phone then
        return { ok = false, error = 'invalid' }
    end

    local message = data.message and tostring(data.message):sub(1, Config.Messages.maxLength) or ''
    local image = normalizeMessageImage(data.image)
    if message:match('^%s*$') and not image then
        return { ok = false, error = 'empty' }
    end

    local targetPhone = tostring(data.phone):sub(1, 20)
    local targetPlayer = SRBridge.GetPlayerByPhone(targetPhone)

    local receiverCitizenid
    if targetPlayer then
        receiverCitizenid = targetPlayer.PlayerData.citizenid
    else
        local result = MySQL.scalar.await(
            'SELECT citizenid FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.phone")) = ? LIMIT 1',
            { targetPhone }
        )
        if not result then
            return { ok = false, error = 'not_found' }
        end
        receiverCitizenid = result
    end

    local id = MySQL.insert.await([[
        INSERT INTO sr_phone_messages
        (sender_citizenid, receiver_citizenid, sender_phone, receiver_phone, message, image)
        VALUES (?, ?, ?, ?, ?, ?)
    ]], { citizenid, receiverCitizenid, myPhone, targetPhone, message, image })

    local targetSource = SRBridge.GetSourceByPhone(targetPhone)
    if targetSource then
        local settings = MySQL.single.await(
            'SELECT notifications FROM sr_phone_settings WHERE citizenid = ?',
            { receiverCitizenid }
        )
        if not settings or settings.notifications == 1 then
            TriggerClientEvent('sr-smartphone:client:newMessage', targetSource, {
                phone = myPhone,
                name = SRBridge.GetDisplayName(source),
                message = previewText(message, image),
                image = image,
                id = id,
            })
        end
    end

    return { ok = true, id = id }
end

lib.callback.register('sr-smartphone:server:sendMessage', function(source, data)
    return SRSendPhoneMessage(source, data)
end)
