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

local function notifyPhone(source, title, description, nType)
    TriggerClientEvent('sr-smartphone:client:notify', source, {
        title = title,
        description = description,
        type = nType or 'inform',
    })
end

local function decodeJson(value, fallback)
    if not value or value == '' then return fallback end
    local ok, parsed = pcall(json.decode, value)
    if ok and parsed ~= nil then return parsed end
    return fallback
end

local function encodeJson(value)
    local ok, encoded = pcall(json.encode, value or {})
    return ok and encoded or '[]'
end

local function enrichTemplate(row)
    if not row then return nil end
    row.fields = decodeJson(row.fields, {})
    row.requiresSignature = row.requires_signature == 1
    row.baseContent = row.base_content or ''
    row.timeAgo = formatTimeAgo(row.updated_at or row.created_at)
    return row
end

local function enrichDocument(row, viewerCitizenid)
    if not row then return nil end
    row.fieldValues = decodeJson(row.field_values, {})
    row.content = row.content or ''
    row.requiresSignature = row.requires_signature == 1
    row.signed = row.signed == 1
    row.read = row.read_flag == 1
    row.isOwner = viewerCitizenid and row.owner_citizenid == viewerCitizenid
    row.isRecipient = viewerCitizenid and row.recipient_citizenid == viewerCitizenid
    row.timeAgo = formatTimeAgo(row.updated_at or row.created_at)
    row.templateIcon = row.template_icon
    return row
end

local function mergeDocumentContent(baseContent, content, templateFields, fieldValues)
    local html = (baseContent and baseContent ~= '') and baseContent or (content or '')
    if type(templateFields) ~= 'table' then templateFields = {} end
    if type(fieldValues) ~= 'table' then fieldValues = {} end
    for _, field in ipairs(templateFields) do
        local val = fieldValues[field.id]
        if val and tostring(val) ~= '' then
            local label = field.label or field.id or 'Field'
            html = html .. ('<p><strong>%s:</strong> %s</p>'):format(label, tostring(val))
        end
    end
    return html
end

local function validateRequiredFields(templateFields, fieldValues)
    if type(templateFields) ~= 'table' then return true end
    if type(fieldValues) ~= 'table' then fieldValues = {} end
    for _, field in ipairs(templateFields) do
        if field.required then
            local val = fieldValues[field.id]
            if not val or tostring(val):gsub('%s', '') == '' then
                return false, field.label or field.id
            end
        end
    end
    return true
end

local function resolveSendTarget(source, data)
    if not data then return nil, 'invalid_target' end
    if data.targetPhone and data.targetPhone ~= '' then
        local player = SRBridge.GetPlayerByPhone(tostring(data.targetPhone))
        if not player then return nil, 'offline' end
        return player, nil
    end
    local targetId = tonumber(data.targetId)
    if not targetId then return nil, 'invalid_target' end
    local player = exports.qbx_core:GetPlayer(targetId)
    if not player then return nil, 'offline' end
    return player, nil
end

local function insertDocNotification(citizenid, documentId, title, body)
    if not citizenid then return end
    MySQL.insert.await(
        'INSERT INTO sr_phone_doc_notifications (citizenid, document_id, title, body) VALUES (?, ?, ?, ?)',
        { citizenid, documentId, title or 'Document', body or '' }
    )
    local target = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    if target then
        notifyPhone(target.PlayerData.source, title or 'Documents', body or '', 'inform')
    end
end

-- ─── Templates ──────────────────────────────────────────────────────────────

local function mapPremadeTemplate(entry)
    return {
        id = 'premade:' .. tostring(entry.slug or 'template'),
        name = entry.name or 'Template',
        description = entry.description or '',
        icon = entry.icon or 'document',
        category = entry.category or 'general',
        fields = entry.fields or {},
        requiresSignature = entry.requiresSignature and true or false,
        baseContent = entry.baseContent or '',
        isPremade = true,
        timeAgo = 'Starter',
    }
end

lib.callback.register('sr-smartphone:server:getDocTemplates', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local list = {}
    for _, entry in ipairs((Config.Documents and Config.Documents.premadeTemplates) or {}) do
        list[#list + 1] = mapPremadeTemplate(entry)
    end

    local rows = MySQL.query.await(
        'SELECT id, name, description, icon, fields, requires_signature, base_content, created_at, updated_at FROM sr_phone_doc_templates WHERE citizenid = ? ORDER BY updated_at DESC',
        { citizenid }
    ) or {}

    for _, row in ipairs(rows) do
        enrichTemplate(row)
        row.isPremade = false
        list[#list + 1] = row
    end
    return list
end)

lib.callback.register('sr-smartphone:server:saveDocTemplate', function(source, data)
    if not SRCheckRate(source, 'documents', 15) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return { ok = false } end
    if data.id and tostring(data.id):match('^premade:') then return { ok = false, error = 'forbidden' } end

    local name = tostring(data.name or ''):gsub('^%s+', ''):gsub('%s+$', '')
    if name == '' then return { ok = false, error = 'missing_name' } end
    name = name:sub(1, 64)
    local description = tostring(data.description or ''):sub(1, 255)
    local icon = tostring(data.icon or 'document'):sub(1, 32)
    local fields = encodeJson(data.fields or {})
    local requiresSignature = data.requiresSignature and 1 or 0
    local baseContent = tostring(data.baseContent or ''):sub(1, 50000)

    if data.id then
        MySQL.update.await(
            'UPDATE sr_phone_doc_templates SET name = ?, description = ?, icon = ?, fields = ?, requires_signature = ?, base_content = ? WHERE id = ? AND citizenid = ?',
            { name, description, icon, fields, requiresSignature, baseContent, data.id, citizenid }
        )
        return { ok = true, id = data.id }
    end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_doc_templates (citizenid, name, description, icon, fields, requires_signature, base_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
        { citizenid, name, description, icon, fields, requiresSignature, baseContent }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteDocTemplate', function(source, templateId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    if tostring(templateId):match('^premade:') then return { ok = false, error = 'forbidden' } end
    MySQL.update.await('DELETE FROM sr_phone_doc_templates WHERE id = ? AND citizenid = ?', { templateId, citizenid })
    return { ok = true }
end)

-- ─── Documents ────────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getDocuments', function(source)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local rows = MySQL.query.await([[
        SELECT d.id, d.owner_citizenid, d.recipient_citizenid, d.template_id, d.title, d.category,
               d.status, d.field_values, d.content, d.requires_signature, d.signed, d.read_flag,
               d.created_at, d.updated_at,
               t.icon AS template_icon,
               po.charinfo AS owner_charinfo, pr.charinfo AS recipient_charinfo
        FROM sr_phone_documents d
        LEFT JOIN sr_phone_doc_templates t ON t.id = d.template_id
        LEFT JOIN players po ON ]] .. SRPhoneJoinCitizenId('po.citizenid', 'd.owner_citizenid') .. [[
        LEFT JOIN players pr ON ]] .. SRPhoneJoinCitizenId('pr.citizenid', 'd.recipient_citizenid') .. [[
        WHERE d.owner_citizenid = ? OR d.recipient_citizenid = ?
        ORDER BY d.updated_at DESC
        LIMIT 80
    ]], { citizenid, citizenid }) or {}

    for _, row in ipairs(rows) do
        enrichDocument(row, citizenid)
        row.partyName = 'Unknown'
        local charinfo = row.isOwner and row.recipient_charinfo or row.owner_charinfo
        if charinfo then
            local ok, info = pcall(json.decode, charinfo)
            if ok and info then
                row.partyName = ('%s %s'):format(info.firstname or '', info.lastname or ''):gsub('^%s+', ''):gsub('%s+$', '')
            end
        end
        row.owner_charinfo = nil
        row.recipient_charinfo = nil
    end
    return rows
end)

lib.callback.register('sr-smartphone:server:getDocument', function(source, docId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local row = MySQL.single.await([[
        SELECT d.*, t.name AS template_name, t.icon AS template_icon, t.fields AS template_fields, t.base_content AS template_base_content,
               po.charinfo AS owner_charinfo, pr.charinfo AS recipient_charinfo
        FROM sr_phone_documents d
        LEFT JOIN sr_phone_doc_templates t ON t.id = d.template_id
        LEFT JOIN players po ON ]] .. SRPhoneJoinCitizenId('po.citizenid', 'd.owner_citizenid') .. [[
        LEFT JOIN players pr ON ]] .. SRPhoneJoinCitizenId('pr.citizenid', 'd.recipient_citizenid') .. [[
        WHERE d.id = ? AND (d.owner_citizenid = ? OR d.recipient_citizenid = ?)
    ]], { docId, citizenid, citizenid })

    if not row then return { ok = false, error = 'not_found' } end

    enrichDocument(row, citizenid)
    row.templateFields = decodeJson(row.template_fields, {})
    row.templateBaseContent = row.template_base_content or ''
    row.template_fields = nil
    row.template_base_content = nil
    row.partyName = 'Unknown'
    local charinfo = row.isOwner and row.recipient_charinfo or row.owner_charinfo
    if charinfo then
        local ok, info = pcall(json.decode, charinfo)
        if ok and info then
            row.partyName = ('%s %s'):format(info.firstname or '', info.lastname or ''):gsub('^%s+', ''):gsub('%s+$', '')
        end
    end
    row.owner_charinfo = nil
    row.recipient_charinfo = nil

    if row.recipient_citizenid == citizenid and row.read_flag == 0 then
        MySQL.update.await('UPDATE sr_phone_documents SET read_flag = 1 WHERE id = ?', { docId })
        row.read = true
    end

    return { ok = true, document = row }
end)

lib.callback.register('sr-smartphone:server:saveDocument', function(source, data)
    if not SRCheckRate(source, 'documents', 15) then return { ok = false, error = 'rate_limit' } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return { ok = false } end

    local title = tostring(data.title or ''):gsub('^%s+', ''):gsub('%s+$', '')
    if title == '' then return { ok = false, error = 'missing_title' } end
    title = title:sub(1, 128)
    local category = tostring(data.category or 'general'):sub(1, 32)
    local fieldValues = encodeJson(data.fieldValues or {})
    local content = tostring(data.content or ''):sub(1, 50000)
    local requiresSignature = data.requiresSignature and 1 or 0
    local templateId = tonumber(data.templateId)

    local templateFields = {}
    local templateBaseContent = ''
    if templateId then
        local tpl = MySQL.single.await(
            'SELECT fields, base_content FROM sr_phone_doc_templates WHERE id = ?',
            { templateId }
        )
        if tpl then
            templateFields = decodeJson(tpl.fields, {})
            templateBaseContent = tpl.base_content or ''
        end
    end

    local fieldValuesTable = data.fieldValues or {}
    local mergedContent = mergeDocumentContent(templateBaseContent, content, templateFields, fieldValuesTable)
    if mergedContent ~= '' then
        content = mergedContent:sub(1, 50000)
    end

    if data.id then
        local existing = MySQL.single.await(
            'SELECT owner_citizenid, status, signed FROM sr_phone_documents WHERE id = ?',
            { data.id }
        )
        if not existing or existing.owner_citizenid ~= citizenid then
            return { ok = false, error = 'forbidden' }
        end
        if existing.status ~= 'draft' or existing.signed == 1 then
            return { ok = false, error = 'not_draft' }
        end
        MySQL.update.await(
            'UPDATE sr_phone_documents SET title = ?, category = ?, field_values = ?, content = ?, requires_signature = ?, template_id = ? WHERE id = ? AND owner_citizenid = ? AND status = ?',
            { title, category, fieldValues, content, requiresSignature, templateId, data.id, citizenid, 'draft' }
        )
        return { ok = true, id = data.id }
    end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_documents (owner_citizenid, template_id, title, category, status, field_values, content, requires_signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        { citizenid, templateId, title, category, 'draft', fieldValues, content, requiresSignature }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteDocument', function(source, docId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local doc = MySQL.single.await(
        'SELECT id, signed, status FROM sr_phone_documents WHERE id = ? AND owner_citizenid = ?',
        { docId, citizenid }
    )
    if not doc then return { ok = false, error = 'not_found' } end
    if doc.signed == 1 then return { ok = false, error = 'signed' } end

    MySQL.update.await('DELETE FROM sr_phone_documents WHERE id = ? AND owner_citizenid = ?', { docId, citizenid })
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:getDocSendTargets', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local contacts = MySQL.query.await(
        'SELECT name, phone FROM sr_phone_contacts WHERE citizenid = ? ORDER BY favorite DESC, name ASC',
        { citizenid }
    ) or {}

    local targets = {}
    local seen = {}
    for _, contact in ipairs(contacts) do
        local phone = contact.phone
        if phone and phone ~= '' and not seen[phone] then
            seen[phone] = true
            local player = SRBridge.GetPlayerByPhone(phone)
            if player and player.PlayerData.source ~= source then
                targets[#targets + 1] = {
                    serverId = player.PlayerData.source,
                    name = contact.name or SRBridge.GetDisplayName(player.PlayerData.source),
                    phone = phone,
                }
            end
        end
    end

    table.sort(targets, function(a, b)
        return (a.name or ''):lower() < (b.name or ''):lower()
    end)

    return targets
end)

lib.callback.register('sr-smartphone:server:sendDocument', function(source, data)
    if not SRCheckRate(source, 'documents', 10) then return { ok = false, error = 'rate_limit' } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.id then return { ok = false, error = 'not_found' } end

    local targetPlayer, targetErr = resolveSendTarget(source, data)
    if not targetPlayer then return { ok = false, error = targetErr or 'invalid_target' } end
    if targetPlayer.PlayerData.source == source then return { ok = false, error = 'self' } end

    local doc = MySQL.single.await([[
        SELECT d.id, d.title, d.owner_citizenid, d.status, d.signed, d.field_values, d.content, d.template_id,
               t.fields AS template_fields, t.base_content AS template_base_content
        FROM sr_phone_documents d
        LEFT JOIN sr_phone_doc_templates t ON t.id = d.template_id
        WHERE d.id = ? AND d.owner_citizenid = ?
    ]], { data.id, citizenid })
    if not doc then return { ok = false, error = 'not_found' } end
    if doc.status ~= 'draft' or doc.signed == 1 then return { ok = false, error = 'not_draft' } end

    local title = tostring(doc.title or ''):gsub('^%s+', ''):gsub('%s+$', '')
    if title == '' then return { ok = false, error = 'missing_title' } end

    local templateFields = decodeJson(doc.template_fields, {})
    local fieldValues = decodeJson(doc.field_values, {})
    local fieldsOk, missingField = validateRequiredFields(templateFields, fieldValues)
    if not fieldsOk then return { ok = false, error = 'missing_field', field = missingField } end

    local mergedContent = mergeDocumentContent(doc.template_base_content, doc.content, templateFields, fieldValues)
    if mergedContent == '' then return { ok = false, error = 'missing_field', field = 'Content' } end

    local recipientCitizenid = targetPlayer.PlayerData.citizenid
    if recipientCitizenid == citizenid then return { ok = false, error = 'self' } end

    MySQL.update.await([[
        UPDATE sr_phone_documents
        SET recipient_citizenid = ?, status = ?, read_flag = 0, content = ?
        WHERE id = ?
    ]], { recipientCitizenid, 'sent', mergedContent:sub(1, 50000), doc.id })

    local senderName = SRBridge.GetDisplayName(source)
    insertDocNotification(
        recipientCitizenid,
        doc.id,
        'New document',
        ('%s sent you "%s"'):format(senderName, doc.title or 'Document')
    )
    return { ok = true, recipientName = SRBridge.GetDisplayName(targetPlayer.PlayerData.source) }
end)

lib.callback.register('sr-smartphone:server:signDocument', function(source, docId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local doc = MySQL.single.await(
        'SELECT id, title, requires_signature, signed, recipient_citizenid, owner_citizenid FROM sr_phone_documents WHERE id = ?',
        { docId }
    )
    if not doc then return { ok = false, error = 'not_found' } end
    if doc.requires_signature ~= 1 then return { ok = false, error = 'no_signature' } end
    if doc.signed == 1 then return { ok = false, error = 'already_signed' } end
    if doc.recipient_citizenid ~= citizenid then return { ok = false, error = 'forbidden' } end
    if doc.status ~= 'sent' then return { ok = false, error = 'not_draft' } end

    MySQL.update.await(
        'UPDATE sr_phone_documents SET signed = 1, signed_at = NOW(), status = ? WHERE id = ?',
        { 'signed', docId }
    )

    insertDocNotification(
        doc.owner_citizenid,
        doc.id,
        'Document signed',
        ('"%s" was signed'):format(doc.title or 'Document')
    )
    return { ok = true }
end)

-- ─── Notifications ────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getDocNotifications', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local rows = MySQL.query.await(
        'SELECT id, document_id, title, body, read_flag, created_at FROM sr_phone_doc_notifications WHERE citizenid = ? ORDER BY created_at DESC LIMIT 50',
        { citizenid }
    ) or {}

    for _, row in ipairs(rows) do
        row.read = row.read_flag == 1
        row.timeAgo = formatTimeAgo(row.created_at)
    end
    return rows
end)

lib.callback.register('sr-smartphone:server:markDocNotificationRead', function(source, notifId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await(
        'UPDATE sr_phone_doc_notifications SET read_flag = 1 WHERE id = ? AND citizenid = ?',
        { notifId, citizenid }
    )
    return { ok = true }
end)

exports('SendDocumentNotification', function(citizenid, title, body, documentId)
    insertDocNotification(citizenid, documentId, title, body)
    return true
end)
