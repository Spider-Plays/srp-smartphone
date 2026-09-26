local nearbySharing = false

local function nearbyTickMs()
    return (Config.Profile and Config.Profile.NearbyTickMs) or 8000
end

local function pushCoords()
    if not nearbySharing then return end
    local coords = GetEntityCoords(cache.ped or PlayerPedId())
    lib.callback.await('sr-smartphone:server:updateNearbyCoords', false, {
        x = coords.x,
        y = coords.y,
        z = coords.z,
    })
end

local function setSharing(enabled)
    nearbySharing = enabled
    if nearbySharing then
        CreateThread(function()
            while nearbySharing do
                pushCoords()
                Wait(nearbyTickMs())
            end
        end)
    end
end

RegisterNUICallback('setNearbySharing', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:setNearbySharing', false, data.enabled, data.profile)
    if result and result.ok then
        setSharing(data.enabled and true or false)
    end
    cb(result or { ok = false })
end)

RegisterNUICallback('getNearbySharing', function(_, cb)
    local state = lib.callback.await('sr-smartphone:server:getNearbySharing', false)
    cb(state or { enabled = false })
end)

RegisterNUICallback('getNearbyPlayers', function(_, cb)
    local list = lib.callback.await('sr-smartphone:server:getNearbyPlayers', false)
    cb(list or {})
end)

AddEventHandler('sr-smartphone:client:phoneClosed', function()
    if not nearbySharing then return end
    lib.callback.await('sr-smartphone:server:setNearbySharing', false, false)
    nearbySharing = false
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if nearbySharing then
        lib.callback.await('sr-smartphone:server:setNearbySharing', false, false)
        nearbySharing = false
    end
end)
