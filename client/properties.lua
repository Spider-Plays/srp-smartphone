local function resourceStarted(name)
    return name and GetResourceState(name):find('start') ~= nil
end

RegisterNetEvent('sr-smartphone:client:enterNolagProperty', function(propertyId)
    propertyId = tonumber(propertyId)
    if not propertyId then return end

    if not resourceStarted('nolag_properties') then return end

    pcall(function()
        exports['nolag_properties']:WrapIntoProperty(propertyId)
    end)
end)

RegisterNetEvent('sr-smartphone:client:manageNolagProperty', function(propertyId)
    propertyId = tonumber(propertyId)
    if not propertyId then return end

    if not resourceStarted('nolag_properties') then return end

    ClosePhone()

    pcall(function()
        exports['nolag_properties']:ManageProperty(propertyId)
    end)
end)

RegisterNUICallback('setPropertyWaypoint', function(data, cb)
    local propertyId = tonumber(data.id or data.propertyId)
    local provider = data.provider

    if provider == 'nolag_properties' and resourceStarted('nolag_properties') and propertyId then
        local ok = pcall(function()
            exports['nolag_properties']:SetWaypointToProperty(propertyId)
        end)

        if ok then
            SRBridge.Notify({ title = 'Properties', description = 'Waypoint set', type = 'success' })
            cb({ ok = true })
            return
        end
    end

    local x, y = tonumber(data.x), tonumber(data.y)
    if not x or not y then
        cb({ ok = false })
        return
    end

    SetNewWaypoint(x, y)
    SRBridge.Notify({ title = 'Properties', description = 'Waypoint set', type = 'success' })
    cb({ ok = true })
end)

RegisterNUICallback('enterProperty', function(data, cb)
    local ok, result = pcall(function()
        return lib.callback.await('sr-smartphone:server:enterProperty', false, data)
    end)

    if ok and result and result.ok then
        ClosePhone()
    end

    cb(ok and result or { ok = false, error = 'Unable to enter property' })
end)

RegisterNUICallback('manageHouseProperty', function(data, cb)
    local ok, result = pcall(function()
        return lib.callback.await('sr-smartphone:server:manageHouse', false, data)
    end)

    if ok and result and result.ok then
        ClosePhone()
    end

    cb(ok and result or { ok = false, error = 'Unable to manage property' })
end)
