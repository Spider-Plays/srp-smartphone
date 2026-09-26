--- Dynamic status-bar signal while the phone is open (interior / depth + jitter).

local function getBaseNetworkStrength()
    local ped = PlayerPedId()
    if not ped or ped == 0 then return 4 end

    if GetInteriorFromEntity(ped) ~= 0 then
        return 2
    end

    local coords = GetEntityCoords(ped)
    local found, groundZ = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z + 50.0, false)
    if found and coords.z < groundZ - 8.0 then
        return 1
    end

    if coords.z < 5.0 then
        return 2
    end

    return 4
end

CreateThread(function()
    while true do
        if PhoneOpen then
            local base = getBaseNetworkStrength()
            local jitter = math.random(-1, 1)
            local strength = math.max(0, math.min(4, base + jitter))

            SendNUIMessage({
                action = 'updateNetworkSignal',
                strength = strength,
            })

            Wait(1500 + math.random(0, 3000))
        else
            Wait(750)
        end
    end
end)
