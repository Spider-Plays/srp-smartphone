RegisterNUICallback('setMapWaypoint', function(data, cb)
    local x, y = tonumber(data.x), tonumber(data.y)
    if not x or not y then
        cb({ ok = false })
        return
    end
    SetNewWaypoint(x, y)
    SRBridge.Notify({ title = 'Maps', description = 'Waypoint set', type = 'success' })
    cb({ ok = true })
end)

RegisterNUICallback('getPlayerCoords', function(_, cb)
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    cb({
        x = coords.x,
        y = coords.y,
        z = coords.z,
    })
end)

RegisterNetEvent('sr-smartphone:client:dispatchAlert', function(data)
    if not data then return end

    local title = data.title or ('Emergency — ' .. tostring(data.category or 'report'))
    local desc = data.description
        or (data.caller and data.message and (data.caller .. ': ' .. data.message))
        or data.message
        or 'New emergency report'

    SRBridge.Notify({
        title = title,
        description = desc,
        type = 'error',
    })

    SendNUIMessage({
        action = 'dispatchAlert',
        data = {
            title = title,
            message = desc,
            category = data.category,
            coords = data.coords,
        },
    })

    if data.coords then
        local x, y = tonumber(data.coords.x), tonumber(data.coords.y)
        if x and y then
            SetNewWaypoint(x, y)
        end
    end
end)

RegisterNetEvent('sr-smartphone:client:serviceRequest', function(data)
    if not data or not data.coords then return end
    local x, y = tonumber(data.coords.x), tonumber(data.coords.y)
    if x and y then
        SetNewWaypoint(x, y)
    end
end)
