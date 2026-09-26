local MailCfg = Config.Mail or {}

local function mailDomain()
    return MailCfg.domain or 'spider.mail'
end

local function systemAddress()
    return MailCfg.systemAddress or ('noreply@' .. mailDomain())
end

local function normalizePhoneDigits(phone)
    if not phone then return '' end
    return tostring(phone):gsub('%D', '')
end

local function phoneToEmail(phone)
    local digits = normalizePhoneDigits(phone)
    if digits == '' then return nil end
    return ('%s@%s'):format(digits, mailDomain())
end

local function parseEmailAddress(email)
    if not email or email == '' then return nil end
    local trimmed = tostring(email):lower():gsub('^%s+', ''):gsub('%s+$', '')
    local localPart, domain = trimmed:match('^([^@]+)@(.+)$')
    if not localPart then return nil end
    if domain ~= mailDomain():lower() then return nil end
    if not localPart:match('^[%w%.%-]+$') then return nil end
    return localPart
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

local function formatMailDate(createdAt)
    if not createdAt then return '' end
    if type(createdAt) == 'string' then
        local y, m, d, h, min = createdAt:match('(%d+)-(%d+)-(%d+) (%d+):(%d+)')
        if y then
            return ('%s/%s/%s %s:%s'):format(m, d, y:sub(-2), h, min)
        end
    end
    return tostring(createdAt)
end

local function bodySnippet(body, maxLen)
    local text = (body or ''):gsub('\r\n', ' '):gsub('\n', ' '):gsub('%s+', ' ')
    if #text <= (maxLen or 120) then return text end
    return text:sub(1, maxLen or 120) .. '…'
end

local function isValidMailImageUrl(url)
    if not url or url == '' then return false end
    if type(url) ~= 'string' or #url > 512 then return false end
    if url:sub(1, 11) == 'data:image/' then return false end
    if url:sub(1, 8) ~= 'https://' and url:sub(1, 7) ~= 'http://' then return false end
    if url:find('discordapp%.com', 1, true) or url:find('discord%.net', 1, true) then return true end
    if url:match('%.png') or url:match('%.jpe?g') or url:match('%.gif') or url:match('%.webp') then return true end
    return false
end

local function parseAttachments(raw)
    if not raw or raw == '' then return {} end
    local ok, parsed = pcall(json.decode, raw)
    if not ok or type(parsed) ~= 'table' then return {} end
    local list = {}
    for _, url in ipairs(parsed) do
        if type(url) == 'string' and isValidMailImageUrl(url) then
            list[#list + 1] = url
        end
    end
    return list
end

local function sanitizeAttachments(list)
    local out = {}
    local max = MailCfg.maxAttachments or 5
    if type(list) ~= 'table' then return out end
    for _, url in ipairs(list) do
        if type(url) == 'string' then
            url = url:sub(1, 512)
            if isValidMailImageUrl(url) then
                out[#out + 1] = url
                if #out >= max then break end
            end
        end
    end
    return out
end

local function encodeAttachments(list)
    if not list or #list == 0 then return nil end
    local ok, encoded = pcall(json.encode, list)
    return ok and encoded or nil
end

local function listSnippet(body, attachments)
    local count = attachments and #attachments or 0
    local text = bodySnippet(body, 80)
    if count > 0 then
        local hint = count == 1 and '1 attachment' or ('%d attachments'):format(count)
        if text == '' then return hint end
        return text .. ' · ' .. hint
    end
    return bodySnippet(body, 100)
end

local function notifyPhone(source, title, description, nType)
    TriggerClientEvent('sr-smartphone:client:notify', source, {
        title = title,
        description = description,
        type = nType or 'inform',
        app = 'mail',
    })
end

local function pushMailRefresh(source)
    TriggerClientEvent('sr-smartphone:client:mailUpdated', source)
end

local function decorateRow(row)
    if not row then return nil end
    row.attachments = parseAttachments(row.attachments)
    row.attachmentCount = #row.attachments
    row.timeAgo = formatTimeAgo(row.created_at)
    row.formattedDate = formatMailDate(row.created_at)
    row.snippet = listSnippet(row.body, row.attachments)
    row.peerLabel = row.folder == 'sent'
        and (row.recipient_label or row.recipient_email or 'Unknown')
        or (row.sender_label or row.sender_email or 'Unknown')
    row.peerEmail = row.folder == 'sent' and row.recipient_email or row.sender_email
    return row
end

local MAIL_SELECT = [[
    SELECT id, citizenid, folder, sender_label, sender_email, sender_citizenid,
           recipient_email, recipient_citizenid, subject, body, attachments, read_flag, starred, created_at
    FROM sr_phone_mail
]]

local function resolveCitizenByEmail(email)
    local localPart = parseEmailAddress(email)
    if not localPart then return nil, 'invalid_email' end

    if localPart == 'noreply' or localPart == 'system' then
        return nil, 'system_address'
    end

    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local phone = SRBridge.GetPhoneNumber(src)
        if phone and normalizePhoneDigits(phone) == localPart then
            local player = SRBridge.GetPlayer(src)
            if player then
                return player.PlayerData.citizenid, nil, phone, SRBridge.GetDisplayName(src)
            end
        end
    end

    local citizenid = MySQL.scalar.await([[
        SELECT citizenid FROM players
        WHERE REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.phone")), '-', ''), ' ', '') = ?
        LIMIT 1
    ]], { localPart })

    if not citizenid then return nil, 'not_found' end

    local phone = MySQL.scalar.await(
        'SELECT JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.phone")) FROM players WHERE citizenid = ? LIMIT 1',
        { citizenid }
    )
    local name = MySQL.scalar.await(
        'SELECT CONCAT(JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.firstname")), " ", JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.lastname"))) FROM players WHERE citizenid = ? LIMIT 1',
        { citizenid }
    )
    return citizenid, nil, phone, (name and name:gsub('^%s+', ''):gsub('%s+$', '') ~= '' and name) or 'Unknown'
end

local function insertMailRow(payload)
    return MySQL.insert.await([[
        INSERT INTO sr_phone_mail
        (citizenid, folder, sender_label, sender_email, sender_citizenid,
         recipient_email, recipient_citizenid, subject, body, attachments, read_flag, starred)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ]], {
        payload.citizenid,
        payload.folder or 'inbox',
        payload.sender_label or 'Unknown',
        payload.sender_email,
        payload.sender_citizenid,
        payload.recipient_email,
        payload.recipient_citizenid,
        payload.subject or '(No subject)',
        payload.body or '',
        encodeAttachments(payload.attachments),
        payload.read_flag or 0,
        payload.starred or 0,
    })
end

function SRMailDeliver(citizenid, opts)
    if not citizenid then return false end
    opts = opts or {}
    local senderLabel = opts.senderLabel or opts.sender_label or 'System'
    local senderEmail = opts.senderEmail or opts.sender_email or systemAddress()
    local subject = (opts.subject or 'Notice'):sub(1, MailCfg.maxSubjectLength or 128)
    local body = opts.body or ''
    local attachments = sanitizeAttachments(opts.attachments)

    insertMailRow({
        citizenid = citizenid,
        folder = 'inbox',
        sender_label = senderLabel,
        sender_email = senderEmail,
        sender_citizenid = opts.senderCitizenid,
        subject = subject,
        body = body:sub(1, MailCfg.maxBodyLength or 4000),
        attachments = attachments,
        read_flag = 0,
    })

    local target = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    if target then
        notifyPhone(target.PlayerData.source, 'Mail', subject, 'inform')
        pushMailRefresh(target.PlayerData.source)
    end
    return true
end

lib.callback.register('sr-smartphone:server:getMailAccount', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end

    local phone = SRBridge.GetPhoneNumber(source)
    local email = phoneToEmail(phone)
    local name = SRBridge.GetDisplayName(source)

    local unread = MySQL.scalar.await(
        "SELECT COUNT(*) FROM sr_phone_mail WHERE citizenid = ? AND folder = 'inbox' AND read_flag = 0",
        { citizenid }
    ) or 0

    return {
        email = email,
        name = name,
        domain = mailDomain(),
        unread = tonumber(unread) or 0,
    }
end)

lib.callback.register('sr-smartphone:server:getMail', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local folder = data and data.folder or 'inbox'
    local search = data and data.search and tostring(data.search):lower() or ''
    local limit = MailCfg.listLimit or 80

    local rows
    if folder == 'starred' then
        rows = MySQL.query.await(
            MAIL_SELECT .. [[
            WHERE citizenid = ? AND starred = 1 AND folder != 'trash'
            ORDER BY created_at DESC LIMIT ?
        ]],
            { citizenid, limit }
        ) or {}
    else
        rows = MySQL.query.await(
            MAIL_SELECT .. [[
            WHERE citizenid = ? AND folder = ?
            ORDER BY created_at DESC LIMIT ?
        ]],
            { citizenid, folder, limit }
        ) or {}
    end

    for i, row in ipairs(rows) do
        if row.recipient_citizenid and row.folder == 'sent' then
            local label = MySQL.scalar.await(
                'SELECT CONCAT(JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.firstname")), " ", JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.lastname"))) FROM players WHERE citizenid = ? LIMIT 1',
                { row.recipient_citizenid }
            )
            row.recipient_label = label and label:gsub('^%s+', ''):gsub('%s+$', '') or row.recipient_email
        end
        rows[i] = decorateRow(row)
    end

    if search ~= '' then
        local filtered = {}
        for _, row in ipairs(rows) do
            local hay = ('%s %s %s %s %s %s'):format(
                row.subject or '',
                row.body or '',
                row.sender_label or '',
                row.sender_email or '',
                row.recipient_email or '',
                row.peerLabel or ''
            ):lower()
            if hay:find(search, 1, true) then
                filtered[#filtered + 1] = row
            end
        end
        rows = filtered
    end

    return rows
end)

lib.callback.register('sr-smartphone:server:readMail', function(source, mailId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    MySQL.update.await('UPDATE sr_phone_mail SET read_flag = 1 WHERE id = ? AND citizenid = ?', { mailId, citizenid })
    local row = MySQL.single.await(MAIL_SELECT .. ' WHERE id = ? AND citizenid = ?', { mailId, citizenid })
    return { ok = true, mail = decorateRow(row) }
end)

lib.callback.register('sr-smartphone:server:markMailUnread', function(source, mailId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await('UPDATE sr_phone_mail SET read_flag = 0 WHERE id = ? AND citizenid = ?', { mailId, citizenid })
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:starMail', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.id then return { ok = false } end
    local starred = data.starred and 1 or 0
    MySQL.update.await('UPDATE sr_phone_mail SET starred = ? WHERE id = ? AND citizenid = ?', { starred, data.id, citizenid })
    return { ok = true, starred = starred == 1 }
end)

lib.callback.register('sr-smartphone:server:deleteMail', function(source, mailId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local row = MySQL.single.await('SELECT folder FROM sr_phone_mail WHERE id = ? AND citizenid = ?', { mailId, citizenid })
    if not row then return { ok = false } end

    if row.folder == 'trash' then
        MySQL.update.await('DELETE FROM sr_phone_mail WHERE id = ? AND citizenid = ?', { mailId, citizenid })
    else
        MySQL.update.await("UPDATE sr_phone_mail SET folder = 'trash' WHERE id = ? AND citizenid = ?", { mailId, citizenid })
    end
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:restoreMail', function(source, mailId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local row = MySQL.single.await(
        'SELECT folder, recipient_citizenid FROM sr_phone_mail WHERE id = ? AND citizenid = ?',
        { mailId, citizenid }
    )
    if not row or row.folder ~= 'trash' then return { ok = false } end

    local restoreFolder = row.recipient_citizenid and 'sent' or 'inbox'
    MySQL.update.await('UPDATE sr_phone_mail SET folder = ? WHERE id = ? AND citizenid = ?', { restoreFolder, mailId, citizenid })
    return { ok = true, folder = restoreFolder }
end)

lib.callback.register('sr-smartphone:server:sendMail', function(source, data)
    if not SRCheckRate(source, 'mail', Config.RateLimit.mail) then
        return { ok = false, error = 'rate_limit' }
    end

    local citizenid = SRBridge.GetCitizenId(source)
    local myPhone = SRBridge.GetPhoneNumber(source)
    local myEmail = phoneToEmail(myPhone)
    if not citizenid or not myEmail or not data then
        return { ok = false, error = 'invalid' }
    end

    local toEmail = tostring(data.to or ''):lower():gsub('^%s+', ''):gsub('%s+$', '')
    local subject = (data.subject and tostring(data.subject) or '(No subject)'):sub(1, MailCfg.maxSubjectLength or 128)
    local body = (data.body and tostring(data.body) or ''):sub(1, MailCfg.maxBodyLength or 4000)
    local attachments = sanitizeAttachments(data.attachments)

    if subject:match('^%s*$') then
        return { ok = false, error = 'empty' }
    end
    if body:match('^%s*$') and #attachments == 0 then
        return { ok = false, error = 'empty' }
    end

    if toEmail == myEmail then
        return { ok = false, error = 'self' }
    end

    local receiverCitizenid, resolveErr, receiverPhone, receiverName = resolveCitizenByEmail(toEmail)
    if resolveErr == 'system_address' then
        return { ok = false, error = 'system_address' }
    end
    if not receiverCitizenid then
        return { ok = false, error = resolveErr or 'not_found' }
    end

    local senderName = SRBridge.GetDisplayName(source)
    local recipientEmail = phoneToEmail(receiverPhone) or toEmail

    insertMailRow({
        citizenid = receiverCitizenid,
        folder = 'inbox',
        sender_label = senderName,
        sender_email = myEmail,
        sender_citizenid = citizenid,
        recipient_email = recipientEmail,
        recipient_citizenid = citizenid,
        subject = subject,
        body = body,
        attachments = attachments,
        read_flag = 0,
    })

    insertMailRow({
        citizenid = citizenid,
        folder = 'sent',
        sender_label = senderName,
        sender_email = myEmail,
        sender_citizenid = citizenid,
        recipient_email = recipientEmail,
        recipient_citizenid = receiverCitizenid,
        subject = subject,
        body = body,
        attachments = attachments,
        read_flag = 1,
    })

    local target = exports.qbx_core:GetPlayerByCitizenId(receiverCitizenid)
    if target then
        local targetSource = target.PlayerData.source
        notifyPhone(targetSource, 'New Mail', subject, 'inform')
        pushMailRefresh(targetSource)
    end
    pushMailRefresh(source)

    return { ok = true }
end)

exports('SendMail', function(citizenid, senderLabel, subject, body)
    return SRMailDeliver(citizenid, {
        senderLabel = senderLabel,
        subject = subject,
        body = body,
    })
end)
