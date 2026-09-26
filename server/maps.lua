-- Maps callbacks (loaded early so NUI always has getMapsData)

lib.callback.register('sr-smartphone:server:getMapsData', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then
        return { defaultPins = Config.Maps and Config.Maps.defaultPins or {}, saved = {} }
    end

    local saved = MySQL.query.await(
        'SELECT id, label, x, y, z, category FROM sr_phone_map_pins WHERE citizenid = ? ORDER BY label ASC',
        { citizenid }
    ) or {}

    return {
        defaultPins = Config.Maps and Config.Maps.defaultPins or {},
        saved = saved,
    }
end)

lib.callback.register('sr-smartphone:server:saveMapPin', function(source, data)
    if not SRCheckRate(source, 'maps', 15) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.label then return { ok = false } end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_map_pins (citizenid, label, x, y, z, category) VALUES (?, ?, ?, ?, ?, ?)',
        {
            citizenid,
            tostring(data.label):sub(1, 64),
            tonumber(data.x) or 0.0,
            tonumber(data.y) or 0.0,
            tonumber(data.z) or 0.0,
            tostring(data.category or 'custom'):sub(1, 32),
        }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteMapPin', function(source, pinId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await('DELETE FROM sr_phone_map_pins WHERE id = ? AND citizenid = ?', { pinId, citizenid })
    return { ok = true }
end)
