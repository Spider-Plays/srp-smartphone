local function formatTimeAgo(createdAt)
    if not createdAt then return 'Recently' end
    local ts = createdAt
    if type(createdAt) == 'string' then
        local y, m, d, h, min, s = createdAt:match('(%d+)-(%d+)-(%d+) (%d+):(%d+):(%d+)')
        if y then
            ts = os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d), hour = tonumber(h), min = tonumber(min), sec = tonumber(s) })
        end
    end
    local diff = os.time() - (tonumber(ts) or os.time())
    if diff < 60 then return 'Just now' end
    if diff < 3600 then return ('%dm ago'):format(math.floor(diff / 60)) end
    if diff < 86400 then return ('%dh ago'):format(math.floor(diff / 3600)) end
    return ('%dd ago'):format(math.floor(diff / 86400))
end

local function notifyPhone(source, title, description, nType)
    TriggerClientEvent('sr-smartphone:client:notify', source, {
        title = title,
        description = description,
        type = nType or 'inform',
    })
end

local function playersOnDutyForJob(jobName)
    local list = {}
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local player = exports.qbx_core:GetPlayer(src)
        if player and player.PlayerData.job.name == jobName and player.PlayerData.job.onduty then
            list[#list + 1] = src
        end
    end
    return list
end

local function insertSystemMessage(senderSource, receiverPhone, body)
    local senderCitizenid = SRBridge.GetCitizenId(senderSource)
    local senderPhone = SRBridge.GetPhoneNumber(senderSource)
    if not senderCitizenid or not senderPhone or not receiverPhone then return false end

    local targetPlayer = SRBridge.GetPlayerByPhone(receiverPhone)
    if not targetPlayer then return false end

    local receiverCitizenid = targetPlayer.PlayerData.citizenid
    local receiverSource = targetPlayer.PlayerData.source

    MySQL.insert.await(
        'INSERT INTO sr_phone_messages (sender_citizenid, receiver_citizenid, sender_phone, receiver_phone, message) VALUES (?, ?, ?, ?, ?)',
        { senderCitizenid, receiverCitizenid, senderPhone, receiverPhone, body:sub(1, Config.Messages.maxLength) }
    )

    TriggerClientEvent('sr-smartphone:client:newMessage', receiverSource, {
        phone = senderPhone,
        name = SRBridge.GetDisplayName(senderSource),
        message = body,
    })
    return true
end

-- ─── Maps ───────────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getMapsData', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { pins = {}, saved = {} } end

    local saved = MySQL.query.await(
        'SELECT id, label, x, y, z, category FROM sr_phone_map_pins WHERE citizenid = ? ORDER BY label ASC',
        { citizenid }
    ) or {}

    return {
        defaultPins = Config.Maps and Config.Maps.defaultPins or {},
        saved = saved,
    }
end)

lib.callback.register('sr-smartphone:server:saveMapPin', function(source, data)
    if not SRCheckRate(source, 'maps', 15) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.label then return { ok = false } end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_map_pins (citizenid, label, x, y, z, category) VALUES (?, ?, ?, ?, ?, ?)',
        {
            citizenid,
            tostring(data.label):sub(1, 64),
            tonumber(data.x) or 0.0,
            tonumber(data.y) or 0.0,
            tonumber(data.z) or 0.0,
            tostring(data.category or 'custom'):sub(1, 32),
        }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteMapPin', function(source, pinId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await('DELETE FROM sr_phone_map_pins WHERE id = ? AND citizenid = ?', { pinId, citizenid })
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:shareMapLocation', function(source, data)
    if not SRCheckRate(source, 'sendMessage', Config.RateLimit.sendMessage) then
        return { ok = false, error = 'rate_limit' }
    end
    if not data or not data.phone or not data.label then return { ok = false } end

    local x, y = tonumber(data.x), tonumber(data.y)
    local body = ('📍 %s\nGPS: %.2f, %.2f'):format(data.label, x or 0, y or 0)
    local ok = insertSystemMessage(source, data.phone, body)
    return { ok = ok }
end)

-- ─── Jobs ───────────────────────────────────────────────────────────────────

local function jobNameInList(jobName, list)
    if not jobName or not list then return false end
    for _, name in ipairs(list) do
        if name == jobName then return true end
    end
    return false
end

lib.callback.register('sr-smartphone:server:getJobsData', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not citizenid or not player then return nil end

    local job = player.PlayerData.job or {}
    local notifications = MySQL.query.await(
        'SELECT id, title, body, created_at, read_flag FROM sr_phone_job_notifications WHERE citizenid = ? ORDER BY created_at DESC LIMIT 25',
        { citizenid }
    ) or {}

    for _, row in ipairs(notifications) do
        row.timeAgo = formatTimeAgo(row.created_at)
    end

    return {
        job = {
            name = job.name or 'unemployed',
            label = job.label or 'Unemployed',
            grade = job.grade and job.grade.name or '',
            gradeLevel = job.grade and job.grade.level or 0,
            onDuty = job.onduty == true,
            payment = job.payment or 0,
        },
        notifications = notifications,
        canToggleDuty = job.name ~= 'unemployed',
        mdtAllowed = jobNameInList(job.name, Config.MDT and Config.MDT.policeJobs or {}),
        emsAllowed = jobNameInList(job.name, Config.MDT and Config.MDT.emsJobs or {}),
    }
end)

lib.callback.register('sr-smartphone:server:toggleJobDuty', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { ok = false } end
    local job = player.PlayerData.job
    if not job or job.name == 'unemployed' then return { ok = false, error = 'no_job' } end

    local newDuty = not job.onduty
    player.Functions.SetJobDuty(newDuty)
    return { ok = true, onDuty = newDuty }
end)

lib.callback.register('sr-smartphone:server:markJobNotificationRead', function(source, notifId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await(
        'UPDATE sr_phone_job_notifications SET read_flag = 1 WHERE id = ? AND citizenid = ?',
        { notifId, citizenid }
    )
    return { ok = true }
end)

-- ─── LifeInvader (Market) ───────────────────────────────────────────────────

local function getJobCenterConfig()
    return Config.Market and Config.Market.jobCenter
end

local function jobCenterJobAllowed(jobId)
    local jc = getJobCenterConfig()
    if not jc or jc.enabled == false or not jobId then return false end
    for _, entry in ipairs(jc.jobs or {}) do
        if entry.id == jobId then return true, entry.label, entry.description end
    end
    return false
end

local function jobCenterReviewDelaySeconds()
    local jc = getJobCenterConfig() or {}
    local bounds = jc.reviewMinutes or { min = 5, max = 10 }
    local minM = math.max(1, math.floor(tonumber(bounds.min) or 5))
    local maxM = math.max(minM, math.floor(tonumber(bounds.max) or 10))
    local minutes = minM + math.random(0, maxM - minM)
    return minutes * 60
end

local function getJobApplicationsForCitizen(citizenid)
    if not citizenid then return {} end
    return MySQL.query.await(
        'SELECT job_id, status, applied_at, review_at, approved_at FROM sr_phone_job_applications WHERE citizenid = ?',
        { citizenid }
    ) or {}
end

local function mergeJobCenterApplications(jobs, applications)
    local byJob = {}
    for _, row in ipairs(applications) do
        byJob[row.job_id] = row
    end
    local merged = {}
    for _, job in ipairs(jobs or {}) do
        local copy = {
            id = job.id,
            label = job.label,
            description = job.description,
        }
        local app = byJob[job.id]
        if app then
            copy.applicationStatus = app.status
            copy.appliedAt = app.applied_at
            copy.reviewAt = app.review_at
        else
            copy.applicationStatus = 'none'
        end
        merged[#merged + 1] = copy
    end
    return merged
end

local function approveJobApplication(row)
    if not row or row.status ~= 'pending' then return end

    local ok = exports.qbx_core:SetJob(row.citizenid, row.job_id, 0)
    if not ok then
        lib.print.warn(('[sr-smartphone] job application approve failed | citizenid=%s | job=%s'):format(
            tostring(row.citizenid),
            tostring(row.job_id)
        ))
        return
    end

    MySQL.update.await(
        'UPDATE sr_phone_job_applications SET status = ?, approved_at = NOW() WHERE id = ? AND status = ?',
        { 'approved', row.id, 'pending' }
    )

    local title = 'Job application accepted'
    local body = ('Your application for %s was approved. You can clock in from the Jobs app.'):format(row.job_label or row.job_id)
    exports['sr-smartphone']:SendJobNotification(row.citizenid, title, body)

    local target = exports.qbx_core:GetPlayerByCitizenId(row.citizenid)
    if target then
        TriggerClientEvent('sr-smartphone:client:jobApplicationAccepted', target.PlayerData.source, {
            jobId = row.job_id,
            jobLabel = row.job_label,
            title = title,
            message = body,
        })
    end
end

local function processDueJobApplications()
    local due = MySQL.query.await(
        'SELECT id, citizenid, job_id, job_label, status FROM sr_phone_job_applications WHERE status = ? AND review_at <= NOW() LIMIT 25',
        { 'pending' }
    ) or {}
    for _, row in ipairs(due) do
        approveJobApplication(row)
    end
end

CreateThread(function()
    while not SRPhoneDbReady do
        Wait(500)
    end
    while true do
        processDueJobApplications()
        Wait(30000)
    end
end)

local function playerJobSnapshot(player)
    local job = player.PlayerData.job or {}
    return {
        name = job.name or 'unemployed',
        label = job.label or 'Unemployed',
        grade = job.grade and job.grade.name or '',
        gradeLevel = job.grade and job.grade.level or 0,
        onDuty = job.onduty == true,
        payment = job.payment or 0,
    }
end

lib.callback.register('sr-smartphone:server:getJobCenterData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return nil end
    local citizenid = SRBridge.GetCitizenId(source)
    local jc = getJobCenterConfig()
    if not jc or jc.enabled == false then
        return { enabled = false, jobs = {}, job = playerJobSnapshot(player) }
    end
    local applications = getJobApplicationsForCitizen(citizenid)
    return {
        enabled = true,
        jobs = mergeJobCenterApplications(jc.jobs or {}, applications),
        job = playerJobSnapshot(player),
    }
end)

lib.callback.register('sr-smartphone:server:applyJobCenterJob', function(source, jobId)
    if not SRCheckRate(source, 'jobCenter', 5) then return { ok = false, error = 'rate_limit' } end

    local allowed, jobLabel = jobCenterJobAllowed(jobId)
    if not allowed then return { ok = false, error = 'invalid_job' } end

    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { ok = false } end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local current = player.PlayerData.job
    if current and current.name == jobId then
        return { ok = false, error = 'already_job' }
    end

    local existing = MySQL.single.await(
        'SELECT id, status FROM sr_phone_job_applications WHERE citizenid = ? AND job_id = ? LIMIT 1',
        { citizenid, jobId }
    )
    if existing then
        if existing.status == 'pending' then
            return { ok = false, error = 'already_pending' }
        end
        return { ok = false, error = 'already_applied' }
    end

    -- Resigning is immediate; new roles go through the review queue (one application per job, ever)
    if jobId == 'unemployed' then
        player.Functions.SetJob('unemployed', 0)
        exports.qbx_core:Notify(source, 'You are now unemployed', 'success')
        return { ok = true, status = 'approved', job = playerJobSnapshot(player) }
    end

    local delaySec = jobCenterReviewDelaySeconds()
    MySQL.insert.await(
        'INSERT INTO sr_phone_job_applications (citizenid, job_id, job_label, status, review_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND)',
        { citizenid, jobId, jobLabel or jobId, 'pending', delaySec }
    )

    return {
        ok = true,
        status = 'pending',
        applicationStatus = 'pending',
        job = playerJobSnapshot(player),
    }
end)

local function isValidMarketImageUrl(url)
    if not url or url == '' then return true end
    if type(url) ~= 'string' or #url > 512 then return false end
    if url:sub(1, 11) == 'data:image/' then return false end
    if url:sub(1, 8) ~= 'https://' and url:sub(1, 7) ~= 'http://' then return false end
    if url:find('discordapp%.com', 1, true) or url:find('discord%.net', 1, true) then return true end
    if url:match('%.png') or url:match('%.jpe?g') or url:match('%.gif') or url:match('%.webp') then return true end
    return false
end

local function sanitizeMarketImageUrl(url)
    if not url or url == '' then return '' end
    url = tostring(url):sub(1, 512)
    return isValidMarketImageUrl(url) and url or ''
end

lib.callback.register('sr-smartphone:server:getMarketListings', function(source, data)
    local category = data and data.category or 'all'
    local citizenid = SRBridge.GetCitizenId(source)
    local query = [[
        SELECT l.id, l.citizenid, l.title, l.description, l.price, l.category, l.image_url, l.created_at,
               p.charinfo
        FROM sr_phone_market_listings l
        LEFT JOIN players p ON ]] .. SRPhoneJoinCitizenId('p.citizenid', 'l.citizenid') .. [[
        WHERE l.sold = 0
    ]]
    local params = {}
    if category ~= 'all' then
        query = query .. ' AND l.category = ?'
        params[#params + 1] = category
    end
    query = query .. ' ORDER BY l.created_at DESC LIMIT 40'

    local rows = MySQL.query.await(query, params) or {}
    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.created_at)
        row.imageUrl = row.image_url or ''
        row.isMine = citizenid and row.citizenid == citizenid
        row.sellerName = 'Seller'
        if row.charinfo then
            local ok, info = pcall(json.decode, row.charinfo)
            if ok and info then
                row.sellerName = ('%s %s'):format(info.firstname or '', info.lastname or '')
                row.sellerPhone = info.phone
            end
        end
    end
    return rows
end)

lib.callback.register('sr-smartphone:server:createMarketListing', function(source, data)
    if not SRCheckRate(source, 'market', 10) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return { ok = false } end

    local price = tonumber(data.price)
    if not price or price < 1 then return { ok = false, error = 'invalid_price' } end

    local imageUrl = sanitizeMarketImageUrl(data.imageUrl or data.image_url)

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_market_listings (citizenid, title, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        {
            citizenid,
            tostring(data.title or 'Listing'):sub(1, 64),
            tostring(data.description or ''):sub(1, 500),
            math.floor(price),
            tostring(data.category or 'misc'):sub(1, 32),
            imageUrl,
        }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteMarketListing', function(source, listingId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await(
        'DELETE FROM sr_phone_market_listings WHERE id = ? AND citizenid = ?',
        { listingId, citizenid }
    )
    return { ok = true }
end)

-- ─── Services ───────────────────────────────────────────────────────────────

local function getCitizenDisplayName(citizenid)
    if not citizenid then return 'Citizen' end
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local player = exports.qbx_core:GetPlayer(src)
        if player and player.PlayerData.citizenid == citizenid then
            return SRBridge.GetDisplayName(src)
        end
    end
    local row = MySQL.single.await('SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1', { citizenid })
    if row and row.charinfo then
        local ok, info = pcall(json.decode, row.charinfo)
        if ok and type(info) == 'table' then
            local name = ('%s %s'):format(info.firstname or '', info.lastname or ''):gsub('^%s+', ''):gsub('%s+$', '')
            if name ~= '' then return name end
        end
    end
    return 'Citizen'
end

local function getPlayerWorkerServiceTypes(source)
    if SRServiceNpc_GetWorkerServiceTypes then
        return SRServiceNpc_GetWorkerServiceTypes(source)
    end
    local player = exports.qbx_core:GetPlayer(source)
    if not player or not player.PlayerData.job.onduty then return {} end
    local jobName = player.PlayerData.job.name
    local types = {}
    for _, t in ipairs(Config.Services and Config.Services.types or {}) do
        if t.job == jobName then
            types[#types + 1] = t.id
        end
    end
    return types
end

local function enrichServiceRows(rows)
    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.created_at)
        row.requester_name = getCitizenDisplayName(row.requester_citizenid)
    end
    return rows
end

lib.callback.register('sr-smartphone:server:getServicesData', function(source)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then
        return { types = {}, myRequests = {}, isWorker = false, workerJobs = {} }
    end

    local workerTypeIds = getPlayerWorkerServiceTypes(source)
    local isWorker = #workerTypeIds > 0

    local myRequests = MySQL.query.await(
        'SELECT id, service_type, message, status, worker_citizenid, created_at FROM sr_phone_service_requests WHERE requester_citizenid = ? ORDER BY created_at DESC LIMIT 15',
        { citizenid }
    ) or {}
    for _, row in ipairs(myRequests) do
        row.timeAgo = formatTimeAgo(row.created_at)
    end

    local workerJobs = {}
    if isWorker then
        local placeholders = {}
        local params = { 'open' }
        for _, typeId in ipairs(workerTypeIds) do
            placeholders[#placeholders + 1] = '?'
            params[#params + 1] = typeId
        end
        params[#params + 1] = 'accepted'
        params[#params + 1] = citizenid
        params[#params + 1] = 'accepted'
        params[#params + 1] = 'open'
        workerJobs = MySQL.query.await(
            ('SELECT id, service_type, message, status, x, y, z, requester_citizenid, worker_citizenid, created_at FROM sr_phone_service_requests WHERE ((status = ? AND service_type IN (%s)) OR (status = ? AND worker_citizenid = ?)) ORDER BY CASE status WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END, created_at DESC LIMIT 20'):format(table.concat(placeholders, ',')),
            params
        ) or {}
        enrichServiceRows(workerJobs)
    end

    local workerProfile = nil
    local npcJobs = {}
    local isServiceWorker = false
    local workerServiceType = nil

    if SRServiceNpc_GetWorkerProfileOffDuty then
        workerProfile = SRServiceNpc_GetWorkerProfileOffDuty(source)
        if workerProfile then
            isServiceWorker = true
            workerServiceType = workerProfile.serviceType
            npcJobs = SRServiceNpc_GetNpcJobsForWorker(citizenid, workerServiceType)
        end
    end

    return {
        types = Config.Services and Config.Services.types or {},
        myRequests = myRequests,
        isWorker = isWorker,
        isServiceWorker = isServiceWorker,
        workerServiceType = workerServiceType,
        workerProfile = workerProfile,
        workerJobs = workerJobs,
        npcJobs = npcJobs,
        npcJobsEnabled = Config.Services and Config.Services.npcJobs and Config.Services.npcJobs.enabled ~= false,
    }
end)

lib.callback.register('sr-smartphone:server:requestService', function(source, data)
    if not SRCheckRate(source, 'services', 5) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.serviceType then return { ok = false } end

    local serviceCfg
    for _, t in ipairs(Config.Services.types or {}) do
        if t.id == data.serviceType then
            serviceCfg = t
            break
        end
    end
    if not serviceCfg then return { ok = false, error = 'invalid_service' } end

    local coords = data.coords or {}
    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_service_requests (requester_citizenid, service_type, message, status, x, y, z) VALUES (?, ?, ?, ?, ?, ?, ?)',
        {
            citizenid,
            serviceCfg.id,
            tostring(data.message or ''):sub(1, 255),
            'open',
            tonumber(coords.x) or 0.0,
            tonumber(coords.y) or 0.0,
            tonumber(coords.z) or 0.0,
        }
    )

    local requesterName = SRBridge.GetDisplayName(source)
    for _, target in ipairs(playersOnDutyForJob(serviceCfg.job)) do
        notifyPhone(target, serviceCfg.label .. ' Request', requesterName .. ' needs assistance', 'inform')
        TriggerClientEvent('sr-smartphone:client:serviceRequest', target, {
            id = id,
            serviceType = serviceCfg.id,
            label = serviceCfg.label,
            message = data.message,
            requester = requesterName,
            coords = coords,
        })
    end

    return { ok = true, id = id }
end)

local function getSourceByCitizenId(citizenid)
    if not citizenid then return nil end
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local player = exports.qbx_core:GetPlayer(src)
        if player and player.PlayerData.citizenid == citizenid then
            return src
        end
    end
    return nil
end

local function workerCanHandleRequest(source, request)
    local workerTypes = getPlayerWorkerServiceTypes(source)
    if #workerTypes == 0 then return false end
    for _, typeId in ipairs(workerTypes) do
        if typeId == request.service_type then return true end
    end
    return false
end

lib.callback.register('sr-smartphone:server:acceptServiceRequest', function(source, requestId)
    if not SRCheckRate(source, 'services', Config.RateLimit.services or 5) then return { ok = false, error = 'rate_limit' } end
    SRPhoneAwaitDb()

    local citizenid = SRBridge.GetCitizenId(source)
    requestId = tonumber(requestId)
    if not citizenid or not requestId then return { ok = false, error = 'invalid' } end

    local request = MySQL.single.await(
        'SELECT id, service_type, message, status, x, y, z, requester_citizenid FROM sr_phone_service_requests WHERE id = ? LIMIT 1',
        { requestId }
    )
    if not request or request.status ~= 'open' then
        return { ok = false, error = 'not_available' }
    end
    if not workerCanHandleRequest(source, request) then
        return { ok = false, error = 'not_worker' }
    end

    local updated = MySQL.update.await(
        'UPDATE sr_phone_service_requests SET status = ?, worker_citizenid = ? WHERE id = ? AND status = ?',
        { 'accepted', citizenid, requestId, 'open' }
    )
    if not updated or updated < 1 then
        return { ok = false, error = 'not_available' }
    end

    local workerName = SRBridge.GetDisplayName(source)
    local requesterSource = getSourceByCitizenId(request.requester_citizenid)
    if requesterSource then
        notifyPhone(requesterSource, 'Service Update', workerName .. ' is on the way', 'success')
    end

    return {
        ok = true,
        coords = {
            x = tonumber(request.x) or 0.0,
            y = tonumber(request.y) or 0.0,
            z = tonumber(request.z) or 0.0,
        },
    }
end)

lib.callback.register('sr-smartphone:server:completeServiceRequest', function(source, requestId)
    if not SRCheckRate(source, 'services', Config.RateLimit.services or 5) then return { ok = false, error = 'rate_limit' } end
    SRPhoneAwaitDb()

    local citizenid = SRBridge.GetCitizenId(source)
    requestId = tonumber(requestId)
    if not citizenid or not requestId then return { ok = false, error = 'invalid' } end

    local request = MySQL.single.await(
        'SELECT id, requester_citizenid, service_type, status, worker_citizenid FROM sr_phone_service_requests WHERE id = ? LIMIT 1',
        { requestId }
    )
    if not request or request.status ~= 'accepted' or request.worker_citizenid ~= citizenid then
        return { ok = false, error = 'not_assigned' }
    end

    MySQL.update.await(
        'UPDATE sr_phone_service_requests SET status = ? WHERE id = ? AND worker_citizenid = ?',
        { 'completed', requestId, citizenid }
    )

    local requesterSource = getSourceByCitizenId(request.requester_citizenid)
    if requesterSource then
        notifyPhone(requesterSource, 'Service Complete', 'Your service request has been marked complete', 'success')
    end

    return { ok = true }
end)

-- ─── Notes ──────────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getNotes', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end
    local rows = MySQL.query.await(
        'SELECT id, title, content, color, updated_at FROM sr_phone_notes WHERE citizenid = ? ORDER BY updated_at DESC',
        { citizenid }
    ) or {}
    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.updated_at)
    end
    return rows
end)

lib.callback.register('sr-smartphone:server:saveNote', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return { ok = false } end

    local title = tostring(data.title or 'Note'):sub(1, 64)
    local content = tostring(data.content or ''):sub(1, 2000)
    local color = tostring(data.color or '#FFD60A'):sub(1, 16)

    if data.id then
        MySQL.update.await(
            'UPDATE sr_phone_notes SET title = ?, content = ?, color = ? WHERE id = ? AND citizenid = ?',
            { title, content, color, data.id, citizenid }
        )
        return { ok = true, id = data.id }
    end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_notes (citizenid, title, content, color) VALUES (?, ?, ?, ?)',
        { citizenid, title, content, color }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteNote', function(source, noteId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await('DELETE FROM sr_phone_notes WHERE id = ? AND citizenid = ?', { noteId, citizenid })
    return { ok = true }
end)

-- ─── Invoices ───────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getInvoices', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { received = {}, sent = {} } end

    local received = MySQL.query.await([[
        SELECT i.id, i.amount, i.note, i.status, i.created_at, i.sender_citizenid, p.charinfo
        FROM sr_phone_invoices i
        LEFT JOIN players p ON ]] .. SRPhoneJoinCitizenId('p.citizenid', 'i.sender_citizenid') .. [[
        WHERE i.receiver_citizenid = ?
        ORDER BY i.created_at DESC LIMIT 30
    ]], { citizenid }) or {}

    local sent = MySQL.query.await([[
        SELECT i.id, i.amount, i.note, i.status, i.created_at, i.receiver_citizenid, p.charinfo
        FROM sr_phone_invoices i
        LEFT JOIN players p ON ]] .. SRPhoneJoinCitizenId('p.citizenid', 'i.receiver_citizenid') .. [[
        WHERE i.sender_citizenid = ?
        ORDER BY i.created_at DESC LIMIT 30
    ]], { citizenid }) or {}

    local function enrich(rows, nameField)
        for _, row in ipairs(rows) do
            row.timeAgo = formatTimeAgo(row.created_at)
            row.partyName = 'Unknown'
            if row.charinfo then
                local ok, info = pcall(json.decode, row.charinfo)
                if ok and info then
                    row.partyName = ('%s %s'):format(info.firstname or '', info.lastname or '')
                    if nameField then row[nameField] = info.phone end
                end
            end
        end
    end

    enrich(received, 'senderPhone')
    enrich(sent, 'receiverPhone')
    return { received = received, sent = sent }
end)

lib.callback.register('sr-smartphone:server:sendInvoice', function(source, data)
    if not SRCheckRate(source, 'invoices', 8) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return { ok = false } end

    local amount = tonumber(data.amount)
    local targetId = tonumber(data.targetId)
    if not amount or amount < 1 or not targetId then return { ok = false, error = 'invalid' } end

    local targetPlayer = exports.qbx_core:GetPlayer(targetId)
    if not targetPlayer then return { ok = false, error = 'offline' } end
    if targetId == source then return { ok = false, error = 'self' } end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_invoices (sender_citizenid, receiver_citizenid, amount, note, status) VALUES (?, ?, ?, ?, ?)',
        { citizenid, targetPlayer.PlayerData.citizenid, math.floor(amount), tostring(data.note or ''):sub(1, 128), 'pending' }
    )

    notifyPhone(targetId, 'New Invoice', ('$%s from %s'):format(amount, SRBridge.GetDisplayName(source)), 'inform')
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:payInvoice', function(source, invoiceId)
    if not Config.Bank.enabled then return { ok = false, error = 'disabled' } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local invoice = MySQL.single.await(
        'SELECT * FROM sr_phone_invoices WHERE id = ? AND receiver_citizenid = ? AND status = ?',
        { invoiceId, citizenid, 'pending' }
    )
    if not invoice then return { ok = false, error = 'not_found' } end

    local senderPlayer = exports.qbx_core:GetPlayerByCitizenId(invoice.sender_citizenid)
    if not senderPlayer then return { ok = false, error = 'sender_offline' } end

    local senderSource = senderPlayer.PlayerData.source
    local result = SRBanking.Transfer(source, senderSource, invoice.amount, 'Invoice #' .. invoiceId)
    if not result.ok then return result end

    MySQL.update.await('UPDATE sr_phone_invoices SET status = ? WHERE id = ?', { 'paid', invoiceId })
    notifyPhone(senderSource, 'Invoice Paid', ('$%s received'):format(invoice.amount), 'success')
    return { ok = true, bank = result.bank, cash = result.cash }
end)

lib.callback.register('sr-smartphone:server:declineInvoice', function(source, invoiceId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await(
        'UPDATE sr_phone_invoices SET status = ? WHERE id = ? AND receiver_citizenid = ? AND status = ?',
        { 'declined', invoiceId, citizenid, 'pending' }
    )
    return { ok = true }
end)

-- ─── Exports (admin / other resources) ──────────────────────────────────────

exports('SendJobNotification', function(citizenid, title, body)
    if not citizenid then return false end
    MySQL.insert.await(
        'INSERT INTO sr_phone_job_notifications (citizenid, title, body) VALUES (?, ?, ?)',
        { citizenid, title or 'Job Update', body or '' }
    )
    local target = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    if target then
        notifyPhone(target.PlayerData.source, title or 'Job', body or '', 'inform')
    end
    return true
end)
