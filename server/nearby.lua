local NearbyShare = {}

local function nearbyRadius()
    return (Config.Profile and Config.Profile.NearbyRadius) or 35.0
end

local function vecFrom(data)
    if not data then return nil end
    if type(data) == 'vector3' then return data end
    if data.x and data.y and data.z then
        return vector3(tonumber(data.x) or 0, tonumber(data.y) or 0, tonumber(data.z) or 0)
    end
    return nil
end

lib.callback.register('sr-smartphone:server:setNearbySharing', function(source, enabled, profile)
    if not SRCheckRate(source, 'nearbyShare', 10) then
        return { ok = false }
    end

    if enabled then
        local ped = GetPlayerPed(source)
        if not ped or ped == 0 then
            return { ok = false }
        end
        local displayName = profile and profile.displayName
        if displayName == '' then displayName = nil end
        NearbyShare[source] = {
            citizenid = SRBridge.GetCitizenId(source),
            name = SRBridge.GetDisplayName(source),
            phone = SRBridge.GetPhoneNumber(source),
            displayName = displayName,
            avatarUrl = profile and profile.avatarUrl or nil,
            coords = GetEntityCoords(ped),
        }
    else
        NearbyShare[source] = nil
    end

    return { ok = true, enabled = enabled and true or false }
end)

lib.callback.register('sr-smartphone:server:updateNearbyCoords', function(source, coords)
    local entry = NearbyShare[source]
    if not entry then return false end
    local vec = vecFrom(coords)
    if vec then
        entry.coords = vec
    end
    return true
end)

lib.callback.register('sr-smartphone:server:getNearbySharing', function(source)
    return { enabled = NearbyShare[source] ~= nil }
end)

lib.callback.register('sr-smartphone:server:getNearbyPlayers', function(source)
    if not NearbyShare[source] then
        return {}
    end

    local ped = GetPlayerPed(source)
    if not ped or ped == 0 then return {} end

    local myCoords = GetEntityCoords(ped)
    local radius = nearbyRadius()
    local list = {}

    for src, data in pairs(NearbyShare) do
        if src ~= source and data.coords then
            local dist = #(myCoords - data.coords)
            if dist <= radius then
                list[#list + 1] = {
                    name = (data.displayName and data.displayName ~= '') and data.displayName or data.name,
                    phone = data.phone,
                    distance = math.floor(dist + 0.5),
                    avatarUrl = data.avatarUrl,
                }
            end
        end
    end

    table.sort(list, function(a, b)
        return a.distance < b.distance
    end)

    return list
end)

AddEventHandler('playerDropped', function()
    NearbyShare[source] = nil
end)
