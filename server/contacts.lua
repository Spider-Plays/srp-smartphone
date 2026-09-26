lib.callback.register('sr-smartphone:server:getContacts', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    return MySQL.query.await(
        'SELECT id, name, phone, favorite, note FROM sr_phone_contacts WHERE citizenid = ? ORDER BY favorite DESC, name ASC',
        { citizenid }
    ) or {}
end)

lib.callback.register('sr-smartphone:server:addContact', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.name or not data.phone then
        return { ok = false }
    end

    local name = tostring(data.name):sub(1, 64)
    local phone = tostring(data.phone):sub(1, 20)

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_contacts (citizenid, name, phone, favorite, note) VALUES (?, ?, ?, ?, ?)',
        { citizenid, name, phone, data.favorite and 1 or 0, (data.note or ''):sub(1, 255) }
    )

    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:updateContact', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.id then return { ok = false } end

    local affected = MySQL.update.await(
        'UPDATE sr_phone_contacts SET name = ?, phone = ?, favorite = ?, note = ? WHERE id = ? AND citizenid = ?',
        {
            tostring(data.name):sub(1, 64),
            tostring(data.phone):sub(1, 20),
            data.favorite and 1 or 0,
            (data.note or ''):sub(1, 255),
            data.id,
            citizenid,
        }
    )

    return { ok = (affected or 0) > 0 }
end)

lib.callback.register('sr-smartphone:server:deleteContact', function(source, contactId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not contactId then return { ok = false } end

    local affected = MySQL.update.await(
        'DELETE FROM sr_phone_contacts WHERE id = ? AND citizenid = ?',
        { contactId, citizenid }
    )

    return { ok = (affected or 0) > 0 }
end)
