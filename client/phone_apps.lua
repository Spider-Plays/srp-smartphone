local RADIO_STATION_INDEX = {
    los_santos_rock = 'RADIO_01_CLASS_ROCK',
    non_stop_pop = 'RADIO_02_POP',
    west_coast_talk = 'RADIO_03_HIPHOP_NEW',
    rebel_radio = 'RADIO_06_COUNTRY',
    blaine_county = 'RADIO_11_TALK_01',
    flylo_fm = 'RADIO_15_MOTOWN',
}

local function appCb(name, ...)
    local ok, result = pcall(lib.callback.await, ('sr-smartphone:server:%s'):format(name), false, ...)
    if not ok then
        print(('[sr-smartphone] server callback failed (%s): %s'):format(name, result))
        return nil
    end
    return result
end

RegisterNUICallback('getWalletCards', function(_, cb)
    cb(appCb('getWalletCards') or { cards = {} })
end)

RegisterNUICallback('getBossData', function(_, cb)
    cb(appCb('getBossData') or { isBoss = false })
end)

RegisterNUICallback('bossSetDuty', function(data, cb)
    cb(appCb('bossSetDuty', data) or { ok = false })
end)

RegisterNUICallback('getMdtData', function(_, cb)
    cb(appCb('getMdtData') or { allowed = false })
end)

RegisterNUICallback('mdtPlateLookup', function(data, cb)
    cb(appCb('mdtPlateLookup', data and data.plate) or { ok = false })
end)

RegisterNUICallback('getEmsData', function(_, cb)
    cb(appCb('getEmsData') or { allowed = false })
end)

RegisterNUICallback('emsPatientLookup', function(data, cb)
    cb(appCb('emsPatientLookup', data and data.targetSource) or { ok = false })
end)

RegisterNUICallback('getRealEstateListings', function(_, cb)
    cb(appCb('getRealEstateListings') or { listings = {} })
end)

RegisterNUICallback('getRealEstateAgents', function(_, cb)
    cb(appCb('getRealEstateAgents') or { agents = {} })
end)

RegisterNUICallback('contactRealEstateAgent', function(data, cb)
    local result = appCb('contactRealEstateAgent', data) or { ok = false }
    if result.ok and result.coords then
        local x, y = tonumber(result.coords.x), tonumber(result.coords.y)
        if x and y then SetNewWaypoint(x, y) end
    end
    cb(result)
end)

RegisterNUICallback('getDarkWebListings', function(data, cb)
    cb(appCb('getDarkWebListings', data) or { listings = {}, mine = {} })
end)

RegisterNUICallback('createDarkWebListing', function(data, cb)
    cb(appCb('createDarkWebListing', data) or { ok = false })
end)

RegisterNUICallback('deleteDarkWebListing', function(data, cb)
    cb(appCb('deleteDarkWebListing', data and data.id) or { ok = false })
end)

RegisterNUICallback('getCalendarEvents', function(_, cb)
    cb(appCb('getCalendarEvents') or { events = {}, serverEvents = {} })
end)

RegisterNUICallback('saveCalendarEvent', function(data, cb)
    cb(appCb('saveCalendarEvent', data) or { ok = false })
end)

RegisterNUICallback('deleteCalendarEvent', function(data, cb)
    cb(appCb('deleteCalendarEvent', data and data.id) or { ok = false })
end)

RegisterNUICallback('getRadioStations', function(_, cb)
    cb(appCb('getRadioStations') or { stations = {} })
end)

RegisterNUICallback('playRadioStation', function(data, cb)
    local stationId = data and data.stationId
    local gtaStation = stationId and RADIO_STATION_INDEX[stationId]
    if gtaStation then
        SetMobileRadioEnabledDuringGameplay(true)
        SetRadioToStationName(gtaStation)
        if IsPedInAnyVehicle(PlayerPedId(), false) then
            SetUserRadioControlEnabled(true)
        end
    end
    cb({ ok = gtaStation ~= nil, stationId = stationId })
end)

RegisterNUICallback('stopRadio', function(_, cb)
    SetMobileRadioEnabledDuringGameplay(false)
    cb({ ok = true })
end)

RegisterNUICallback('getAppStoreCatalog', function(_, cb)
    cb(appCb('getAppStoreCatalog') or { catalog = {} })
end)

RegisterNUICallback('installApp', function(data, cb)
    local result = appCb('installApp', data and data.appId) or { ok = false }
    if result.ok and result.apps then
        SendNUIMessage({ action = 'bootstrap', data = { apps = result.apps } })
    end
    cb(result)
end)

RegisterNUICallback('uninstallApp', function(data, cb)
    local result = appCb('uninstallApp', data and data.appId) or { ok = false }
    if result.ok and result.apps then
        SendNUIMessage({ action = 'bootstrap', data = { apps = result.apps } })
    end
    cb(result)
end)
