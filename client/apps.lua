RegisterNUICallback('getVehicles', function(_, cb)
    local ok, vehicles = pcall(function()
        return lib.callback.await('sr-smartphone:server:getVehicles', false)
    end)
    cb(ok and vehicles or {})
end)

local function normalizeClientPropertyList(properties)
    if type(properties) ~= 'table' then return {} end

    if #properties > 0 then
        return properties
    end

    local list = {}
    for _, property in pairs(properties) do
        if type(property) == 'table' then
            list[#list + 1] = property
        end
    end

    return list
end

local function normalizeClientPropertySections(properties)
    if type(properties) ~= 'table' then
        return { apartments = {}, houses = {} }
    end

    if properties.apartments or properties.houses then
        return {
            apartments = normalizeClientPropertyList(properties.apartments),
            houses = normalizeClientPropertyList(properties.houses),
        }
    end

    return {
        apartments = normalizeClientPropertyList(properties),
        houses = {},
    }
end

RegisterNUICallback('getProperties', function(_, cb)
    local ok, properties = pcall(function()
        return lib.callback.await('sr-smartphone:server:getProperties', false)
    end)

    if ok then
        cb(normalizeClientPropertySections(properties))
        return
    end

    if PhoneData and type(PhoneData.properties) == 'table' then
        cb(normalizeClientPropertySections(PhoneData.properties))
        return
    end

    cb({ apartments = {}, houses = {} })
end)

RegisterNUICallback('trackVehicle', function(data, cb)
    if SRGarage.IsEnabled() then
        cb(SRGarage.TrackVehicle(data.plate))
        return
    end

    if Config.Garage.provider == 'builtin' then
        cb({ success = false, error = 'vehicle_out' })
        return
    end

    cb({ success = false, error = 'garage_not_configured' })
end)

RegisterNUICallback('stopTracking', function(_, cb)
    if SRGarage.IsEnabled() then
        cb(SRGarage.StopTracking())
        return
    end
    SetWaypointOff()
    cb({ success = true })
end)

RegisterNUICallback('getGallery', function(_, cb)
    local ok, data = pcall(function()
        return lib.callback.await('sr-smartphone:server:getGallery', false)
    end)
    if not ok or type(data) ~= 'table' then
        if not ok then
            print(('[sr-smartphone] getGallery NUI failed: %s'):format(tostring(data)))
        end
        cb({ photos = {}, albums = {}, unsortedCount = 0 })
        return
    end
    cb(data)
end)

RegisterNUICallback('deleteGalleryPhotos', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:deleteGalleryPhotos', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('renameGalleryPhoto', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:renameGalleryPhoto', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('importGalleryPhoto', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:importGalleryPhoto', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('toggleGalleryFavorite', function(data, cb)
    cb(lib.callback.await('sr-smartphone:server:toggleGalleryFavorite', false, data) or { ok = false })
end)

RegisterNUICallback('createGalleryAlbum', function(data, cb)
    cb(lib.callback.await('sr-smartphone:server:createGalleryAlbum', false, data) or { ok = false })
end)

RegisterNUICallback('renameGalleryAlbum', function(data, cb)
    cb(lib.callback.await('sr-smartphone:server:renameGalleryAlbum', false, data) or { ok = false })
end)

RegisterNUICallback('deleteGalleryAlbum', function(data, cb)
    cb(lib.callback.await('sr-smartphone:server:deleteGalleryAlbum', false, data) or { ok = false })
end)

RegisterNUICallback('moveGalleryPhotos', function(data, cb)
    cb(lib.callback.await('sr-smartphone:server:moveGalleryPhotos', false, data) or { ok = false })
end)

RegisterNUICallback('shareGalleryPhoto', function(data, cb)
    cb(lib.callback.await('sr-smartphone:server:shareGalleryPhoto', false, data) or { ok = false })
end)

RegisterNUICallback('bankTransferById', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:bankTransferById', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('getBankHistory', function(_, cb)
    local history = lib.callback.await('sr-smartphone:server:getBankHistory', false)
    cb(history or {})
end)

RegisterNUICallback('chirpGetAccount', function(_, cb)
    local account = lib.callback.await('sr-smartphone:server:chirpGetAccount', false)
    cb(account)
end)

RegisterNUICallback('chirpLogin', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpLogin', false, data)
    cb(result or { success = false })
end)

RegisterNUICallback('chirpLogout', function(_, cb)
    cb({ ok = true, success = true })
end)

RegisterNUICallback('chirpRegister', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpRegister', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpGetFeed', function(_, cb)
    local feed = lib.callback.await('sr-smartphone:server:chirpGetFeed', false)
    cb(feed or {})
end)

RegisterNUICallback('chirpPost', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpPost', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpLike', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpLike', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpRepost', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpRepost', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpGetComments', function(data, cb)
    local comments = lib.callback.await('sr-smartphone:server:chirpGetComments', false, data.postId)
    cb(comments or {})
end)

RegisterNUICallback('chirpReply', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpReply', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpSearch', function(data, cb)
    local results = lib.callback.await('sr-smartphone:server:chirpSearch', false, data.query)
    cb(results or {})
end)

RegisterNUICallback('chirpUpdateProfile', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpUpdateProfile', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpGetConfig', function(_, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpGetConfig', false)
    cb(result or { verificationPrice = 25000 })
end)

RegisterNUICallback('chirpBuyVerification', function(_, cb)
    local result = lib.callback.await('sr-smartphone:server:chirpBuyVerification', false)
    cb(result or { ok = false })
end)

RegisterNUICallback('chirpFollowUser', function(_, cb)
    cb({ ok = true, success = true })
end)

-- Extended apps
local function appCb(name, ...)
    local ok, result = pcall(lib.callback.await, ('sr-smartphone:server:%s'):format(name), false, ...)
    if not ok then
        print(('[sr-smartphone] server callback failed (%s): %s'):format(name, result))
        return nil
    end
    return result
end

RegisterNUICallback('getMapsData', function(_, cb) cb(appCb('getMapsData') or { defaultPins = {}, saved = {} }) end)
RegisterNUICallback('saveMapPin', function(data, cb) cb(appCb('saveMapPin', data) or { ok = false }) end)
RegisterNUICallback('deleteMapPin', function(data, cb) cb(appCb('deleteMapPin', data.id) or { ok = false }) end)
RegisterNUICallback('shareMapLocation', function(data, cb) cb(appCb('shareMapLocation', data) or { ok = false }) end)

RegisterNUICallback('getJobsData', function(_, cb) cb(appCb('getJobsData') or {}) end)
RegisterNUICallback('toggleJobDuty', function(_, cb) cb(appCb('toggleJobDuty') or { ok = false }) end)
RegisterNUICallback('markJobNotificationRead', function(data, cb) cb(appCb('markJobNotificationRead', data.id) or { ok = false }) end)

RegisterNUICallback('getMailAccount', function(_, cb) cb(appCb('getMailAccount') or {}) end)
RegisterNUICallback('getMail', function(data, cb) cb(appCb('getMail', data) or {}) end)
RegisterNUICallback('readMail', function(data, cb) cb(appCb('readMail', data.id) or { ok = false }) end)
RegisterNUICallback('markMailUnread', function(data, cb) cb(appCb('markMailUnread', data.id) or { ok = false }) end)
RegisterNUICallback('starMail', function(data, cb) cb(appCb('starMail', data) or { ok = false }) end)
RegisterNUICallback('deleteMail', function(data, cb) cb(appCb('deleteMail', data.id) or { ok = false }) end)
RegisterNUICallback('restoreMail', function(data, cb) cb(appCb('restoreMail', data.id) or { ok = false }) end)
RegisterNUICallback('sendMail', function(data, cb) cb(appCb('sendMail', data) or { ok = false }) end)

RegisterNUICallback('getMarketListings', function(data, cb) cb(appCb('getMarketListings', data) or {}) end)
RegisterNUICallback('createMarketListing', function(data, cb) cb(appCb('createMarketListing', data) or { ok = false }) end)
RegisterNUICallback('deleteMarketListing', function(data, cb) cb(appCb('deleteMarketListing', data.id) or { ok = false }) end)
RegisterNUICallback('getJobCenterData', function(_, cb) cb(appCb('getJobCenterData') or { enabled = false, jobs = {} }) end)
RegisterNUICallback('applyJobCenterJob', function(data, cb) cb(appCb('applyJobCenterJob', data and data.jobId) or { ok = false }) end)

RegisterNUICallback('getServicesData', function(_, cb) cb(appCb('getServicesData') or { types = {}, myRequests = {}, isWorker = false, workerJobs = {} }) end)
RegisterNUICallback('requestService', function(data, cb)
    local coords = GetEntityCoords(PlayerPedId())
    data.coords = { x = coords.x, y = coords.y, z = coords.z }
    cb(appCb('requestService', data) or { ok = false })
end)
RegisterNUICallback('acceptServiceRequest', function(data, cb)
    local result = appCb('acceptServiceRequest', data and data.id) or { ok = false }
    if result.ok and result.coords then
        local x, y = tonumber(result.coords.x), tonumber(result.coords.y)
        if x and y and (x ~= 0.0 or y ~= 0.0) then
            SetNewWaypoint(x, y)
        end
    end
    cb(result)
end)
RegisterNUICallback('completeServiceRequest', function(data, cb)
    cb(appCb('completeServiceRequest', data and data.id) or { ok = false })
end)

RegisterNUICallback('toggleNpcServiceJobs', function(data, cb)
    cb(appCb('toggleNpcServiceJobs', data and data.enabled) or { ok = false })
end)
RegisterNUICallback('acceptNpcServiceJob', function(data, cb)
    local result = appCb('acceptNpcServiceJob', data and data.id) or { ok = false }
    if result.ok and result.coords then
        local x, y = tonumber(result.coords.x), tonumber(result.coords.y)
        if x and y and (x ~= 0.0 or y ~= 0.0) then
            SetNewWaypoint(x, y)
        end
    end
    cb(result)
end)
RegisterNUICallback('completeNpcServiceJob', function(data, cb)
    local coords = GetEntityCoords(PlayerPedId())
    cb(appCb('completeNpcServiceJob', {
        id = data and data.id,
        coords = { x = coords.x, y = coords.y, z = coords.z },
    }) or { ok = false })
end)
RegisterNUICallback('declineNpcServiceJob', function(data, cb)
    cb(appCb('declineNpcServiceJob', data and data.id) or { ok = false })
end)

RegisterNUICallback('getDispatchConfig', function(_, cb) cb(appCb('getDispatchConfig') or { categories = {} }) end)
RegisterNUICallback('getEmergencyData', function(_, cb) cb(appCb('getEmergencyData') or { lawyers = {}, judges = {}, proceedings = {}, legislation = {} }) end)
RegisterNUICallback('sendDispatch', function(data, cb)
    data = data or {}
    local coords = GetEntityCoords(PlayerPedId())
    data.coords = { x = coords.x, y = coords.y, z = coords.z }
    local result = appCb('sendDispatch', data)
    if type(result) ~= 'table' then
        result = { ok = false, error = 'callback_failed' }
    end
    cb(result)
end)

RegisterNUICallback('getNotes', function(_, cb) cb(appCb('getNotes') or {}) end)
RegisterNUICallback('saveNote', function(data, cb) cb(appCb('saveNote', data) or { ok = false }) end)
RegisterNUICallback('deleteNote', function(data, cb) cb(appCb('deleteNote', data.id) or { ok = false }) end)

RegisterNUICallback('getInvoices', function(_, cb) cb(appCb('getInvoices') or { received = {}, sent = {} }) end)
RegisterNUICallback('sendInvoice', function(data, cb) cb(appCb('sendInvoice', data) or { ok = false }) end)
RegisterNUICallback('payInvoice', function(data, cb) cb(appCb('payInvoice', data.id) or { ok = false }) end)
RegisterNUICallback('declineInvoice', function(data, cb) cb(appCb('declineInvoice', data.id) or { ok = false }) end)

RegisterNUICallback('getNewsArticles', function(data, cb) cb(appCb('getNewsArticles', data) or {}) end)
RegisterNUICallback('getNewsOutlets', function(data, cb) cb(appCb('getNewsOutlets', data) or {}) end)
RegisterNUICallback('getNewsArticle', function(data, cb) cb(appCb('getNewsArticle', data.id) or { ok = false }) end)
RegisterNUICallback('toggleNewsFollow', function(data, cb) cb(appCb('toggleNewsFollow', data.outletId) or { ok = false }) end)
RegisterNUICallback('publishNewsArticle', function(data, cb) cb(appCb('publishNewsArticle', data) or { ok = false }) end)

RegisterNUICallback('getDocTemplates', function(_, cb) cb(appCb('getDocTemplates') or {}) end)
RegisterNUICallback('saveDocTemplate', function(data, cb) cb(appCb('saveDocTemplate', data) or { ok = false }) end)
RegisterNUICallback('deleteDocTemplate', function(data, cb) cb(appCb('deleteDocTemplate', data.id) or { ok = false }) end)

RegisterNUICallback('getDocuments', function(_, cb) cb(appCb('getDocuments') or {}) end)
RegisterNUICallback('getDocument', function(data, cb) cb(appCb('getDocument', data.id) or { ok = false }) end)
RegisterNUICallback('saveDocument', function(data, cb) cb(appCb('saveDocument', data) or { ok = false }) end)
RegisterNUICallback('deleteDocument', function(data, cb) cb(appCb('deleteDocument', data.id) or { ok = false }) end)
RegisterNUICallback('sendDocument', function(data, cb) cb(appCb('sendDocument', data) or { ok = false }) end)
RegisterNUICallback('signDocument', function(data, cb) cb(appCb('signDocument', data.id) or { ok = false }) end)

RegisterNUICallback('getDocNotifications', function(_, cb) cb(appCb('getDocNotifications') or {}) end)
RegisterNUICallback('markDocNotificationRead', function(data, cb) cb(appCb('markDocNotificationRead', data.id) or { ok = false }) end)
RegisterNUICallback('getDocSendTargets', function(_, cb) cb(appCb('getDocSendTargets') or {}) end)

RegisterNUICallback('getTradingData', function(_, cb)
    cb(appCb('getTradingData', SRTradingWithGameTime({})) or {})
end)
RegisterNUICallback('getTradingAssetDetail', function(data, cb)
    cb(appCb('getTradingAssetDetail', SRTradingWithGameTime(data)) or {})
end)
RegisterNUICallback('toggleTradingWatchlist', function(data, cb)
    cb(appCb('toggleTradingWatchlist', data) or { ok = false })
end)
RegisterNUICallback('createTradingAlert', function(data, cb)
    cb(appCb('createTradingAlert', data) or { ok = false })
end)
RegisterNUICallback('deleteTradingAlert', function(data, cb)
    cb(appCb('deleteTradingAlert', data.id) or { ok = false })
end)
RegisterNUICallback('getCryptoData', function(_, cb)
    cb(appCb('getCryptoData', SRTradingWithGameTime({})) or {})
end)
RegisterNUICallback('cryptoTrade', function(data, cb)
    cb(appCb('cryptoTrade', SRTradingWithGameTime(data)) or { ok = false })
end)
RegisterNUICallback('getStockData', function(_, cb)
    cb(appCb('getStockData', SRTradingWithGameTime({})) or {})
end)
RegisterNUICallback('stockTrade', function(data, cb)
    cb(appCb('stockTrade', SRTradingWithGameTime(data)) or { ok = false })
end)
