SRDispatch = {}

local function psDispatchStarted()
    local cfg = Config.Dispatch or {}
    if cfg.usePsDispatch == false then return false end
    return GetResourceState(cfg.psDispatchResource or 'ps-dispatch') == 'started'
end

local function playerCoords()
    local coords = GetEntityCoords(PlayerPedId())
    return vector3(coords.x, coords.y, coords.z)
end

function SRDispatch.Send(category, message)
    if not psDispatchStarted() then return false end

    local body = tostring(message or ''):sub(1, 500)
    local coords = playerCoords()

    if category == 'police' then
        exports['ps-dispatch']:CustomAlert({
            message = body ~= '' and body or 'Police emergency',
            dispatchCode = '911call',
            code = '911',
            icon = 'fas fa-shield-halved',
            priority = 2,
            coords = coords,
            jobs = { 'leo' },
        })
        return true
    end

    if category == 'medical' then
        if body == '' or body:find('Emergency call', 1, true) then
            exports['ps-dispatch']:InjuriedPerson()
        else
            exports['ps-dispatch']:CustomAlert({
                message = body,
                dispatchCode = 'civdown',
                code = '10-69',
                icon = 'fas fa-heart-pulse',
                priority = 1,
                coords = coords,
                jobs = { 'ems' },
            })
        end
        return true
    end

    if category == 'fire' then
        exports['ps-dispatch']:CustomAlert({
            message = body ~= '' and body or 'Fire emergency',
            dispatchCode = 'explosion',
            code = '10-80',
            icon = 'fas fa-fire',
            priority = 1,
            coords = coords,
            jobs = { 'leo' },
        })
        return true
    end

    -- Non-emergency / other → 311 (police + EMS in ps-dispatch)
    exports['ps-dispatch']:CustomAlert({
        message = body ~= '' and body or 'Non-emergency report',
        dispatchCode = '311call',
        code = '311',
        icon = 'fas fa-phone',
        priority = 2,
        coords = coords,
        jobs = { 'leo', 'ems' },
    })
    return true
end

RegisterNetEvent('sr-smartphone:client:psDispatch', function(category, message)
    SRDispatch.Send(category, message)
end)
