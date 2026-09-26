--- qb-garages integration for phone garage app
SRGarage = {}

local trackingActive = false

local function garagePrefix()
    return Config.Garage.eventPrefix or 'qb-garages'
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

local function getQBCore()
    if GetResourceState('qb-core') ~= 'started' then return nil end
    return exports['qb-core']:GetCoreObject()
end

local function normalizePlate(plate)
    return (plate or ''):gsub('%s+', ''):upper()
end

local function findVehicleByPlate(plate)
    local target = normalizePlate(plate)
    if target == '' then return nil end

    local vehicles = GetGamePool('CVehicle')
    for i = 1, #vehicles do
        local veh = vehicles[i]
        if DoesEntityExist(veh) then
            local vehPlate = normalizePlate(GetVehicleNumberPlateText(veh))
            if vehPlate == target then
                return veh
            end
        end
    end

    return nil
end

local function mapState(state)
    if type(state) == 'number' then return state end
    local s = tostring(state or ''):lower()
    if s:find('impound') then return 2 end
    if s:find('garage') or s:find('parked') or s:find('stored') then return 1 end
    return 0
end

local function formatVehicles(list)
    if not list then return {} end
    local out = {}
    for i, v in ipairs(list) do
        out[#out + 1] = {
            id = i,
            vehicle = v.vehicle or v.model or 'vehicle',
            label = v.fullname or v.label or v.vehicle or 'Vehicle',
            plate = v.plate,
            garage = v.garage or '',
            state = mapState(v.state),
            fuel = v.fuel,
            engine = v.engine,
            body = v.body,
        }
    end
    return out
end

function SRGarage.IsEnabled()
    return Config.Garage.provider == 'qb-garages'
end

function SRGarage.FetchVehicles()
    local ok, vehicles = pcall(function()
        return lib.callback.await('sr-smartphone:server:getVehicles', false)
    end)
    if ok and vehicles then
        return vehicles
    end
    return {}
end

function SRGarage.TrackVehicle(plate)
    if not plate or plate == '' then
        return { success = false, error = 'invalid_plate' }
    end

    TriggerServerEvent(('%s:server:trackVehicle'):format(garagePrefix()), plate)

    CreateThread(function()
        Wait(400)
        local veh = findVehicleByPlate(plate)
        if veh then
            local coords = GetEntityCoords(veh)
            SetNewWaypoint(coords.x, coords.y)
            trackingActive = true
            SRBridge.Notify({
                title = 'Garage',
                description = 'Vehicle located on GPS',
                type = 'success',
            })
        end
    end)

    trackingActive = true
    return { success = true }
end

function SRGarage.StopTracking()
    SetWaypointOff()
    trackingActive = false
    return { success = true }
end

function SRGarage.IsTracking()
    return trackingActive
end

RegisterNetEvent('qb-garages:client:trackVehicle', function(coords)
    if coords then
        SetNewWaypoint(coords.x, coords.y)
        trackingActive = true
    end
end)

RegisterNetEvent('qb-garage:client:trackVehicle', function(coords)
    if coords then
        SetNewWaypoint(coords.x, coords.y)
        trackingActive = true
    end
end)

RegisterNetEvent(('%s:client:trackVehicle'):format(garagePrefix()), function(coords)
    if coords then
        SetNewWaypoint(coords.x, coords.y)
        trackingActive = true
    end
end)
