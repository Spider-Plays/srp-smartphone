local function formatVehicleLabel(model)
    if not model or model == '' then return 'Vehicle' end
    return model:sub(1, 1):upper() .. model:sub(2):gsub('_', ' ')
end

local function getVehicleLabel(model)
    if not model or model == '' then return 'Vehicle' end

    local ok, shared = pcall(function()
        return exports.qbx_core:GetVehiclesByName()
    end)

    if ok and shared and shared[model] then
        local info = shared[model]
        if info.brand and info.name then
            return ('%s %s'):format(info.brand, info.name)
        end
        if info.name then
            return info.name
        end
    end

    return formatVehicleLabel(model)
end

local function resolveGarageResource()
    local preferred = Config.Garage.resource
    if preferred and GetResourceState(preferred) == 'started' then
        return preferred
    end

    for _, name in ipairs({ 'qb-garages', 'qb-garage' }) do
        if GetResourceState(name) == 'started' then
            return name
        end
    end

    return preferred or 'qb-garages'
end

local function getGarageLabels()
    local labels = {}
    local resource = resolveGarageResource()

    if GetResourceState(resource) ~= 'started' then
        return labels
    end

    local ok, garages = pcall(function()
        return exports[resource]:getAllGarages()
    end)

    if ok and garages then
        for _, garage in ipairs(garages) do
            if garage.name and garage.label then
                labels[garage.name] = garage.label
            end
        end
    end

    return labels
end

local function getBuiltinVehicles(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local garageLabels = {}
    if Config.Garage.provider == 'qb-garages' then
        garageLabels = getGarageLabels()
    end

    local rows = MySQL.query.await([[
        SELECT vehicle, plate, garage, state, fuel, engine, body
        FROM player_vehicles
        WHERE citizenid = ?
        ORDER BY vehicle ASC
    ]], { citizenid }) or {}

    for _, row in ipairs(rows) do
        row.label = getVehicleLabel(row.vehicle)
        if row.garage and garageLabels[row.garage] then
            row.garage = garageLabels[row.garage]
        end
    end

    return rows
end

lib.callback.register('sr-smartphone:server:getVehicles', function(source)
    return getBuiltinVehicles(source)
end)
