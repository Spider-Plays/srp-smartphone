-- NPC service contracts for taxi / mechanic / tow (Services app)

local function npcCfg()
    return Config.Services and Config.Services.npcJobs or {}
end

local function npcEnabled()
    local cfg = npcCfg()
    return cfg.enabled ~= false
end

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

local function getServiceTypeForJob(jobName)
    for _, t in ipairs(Config.Services and Config.Services.types or {}) do
        if t.job == jobName then return t.id, t.label end
    end
    return nil, nil
end

function SRServiceNpc_GetWorkerJobName(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return nil end
    local jobName = player.PlayerData.job.name
    local serviceType = getServiceTypeForJob(jobName)
    if serviceType then return jobName, serviceType end
    return nil, nil
end

function SRServiceNpc_GetWorkerServiceTypes(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player or not player.PlayerData.job.onduty then return {} end
    local jobName = player.PlayerData.job.name
    local serviceType = getServiceTypeForJob(jobName)
    if serviceType then return { serviceType } end
    return {}
end

local function rankForXp(xp)
    local cfg = npcCfg()
    local ranks = cfg.ranks or { { minXp = 0, label = 'Rookie' } }
    local label = ranks[1].label
    for _, r in ipairs(ranks) do
        if xp >= (r.minXp or 0) then label = r.label end
    end
    local perLevel = cfg.xpPerLevel or 100
    local level = math.floor((xp or 0) / perLevel) + 1
    return label, level
end

local function buildProfile(row, serviceType)
    local cfg = npcCfg()
    local xp = tonumber(row and row.xp) or 0
    local reputation = tonumber(row and row.reputation) or 0
    local rankLabel, level = rankForXp(xp)
    local perLevel = cfg.xpPerLevel or 100
    local xpIntoLevel = xp % perLevel
    local serviceLabel
    for _, t in ipairs(Config.Services and Config.Services.types or {}) do
        if t.id == serviceType then serviceLabel = t.label break end
    end
    return {
        serviceType = serviceType,
        serviceLabel = serviceLabel or serviceType,
        xp = xp,
        reputation = reputation,
        maxReputation = cfg.maxReputation or 100,
        level = level,
        rankLabel = rankLabel,
        xpIntoLevel = xpIntoLevel,
        xpPerLevel = perLevel,
        npcJobsEnabled = (row and tonumber(row.npc_jobs_enabled) or 0) == 1,
        totalNpcJobs = tonumber(row and row.total_npc_jobs) or 0,
        onDuty = true,
    }
end

local function ensureWorkerStats(citizenid, serviceType)
    local row = MySQL.single.await(
        'SELECT xp, reputation, npc_jobs_enabled, total_npc_jobs FROM sr_phone_service_worker_stats WHERE citizenid = ? AND service_type = ? LIMIT 1',
        { citizenid, serviceType }
    )
    if row then return row end
    MySQL.insert.await(
        'INSERT INTO sr_phone_service_worker_stats (citizenid, service_type, xp, reputation, npc_jobs_enabled, total_npc_jobs) VALUES (?, ?, 0, 0, 0, 0)',
        { citizenid, serviceType }
    )
    return { xp = 0, reputation = 0, npc_jobs_enabled = 0, total_npc_jobs = 0 }
end

function SRServiceNpc_GetWorkerProfile(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end
    local _, serviceType = SRServiceNpc_GetWorkerJobName(source)
    if not serviceType then return nil end
    local player = exports.qbx_core:GetPlayer(source)
    local row = ensureWorkerStats(citizenid, serviceType)
    local profile = buildProfile(row, serviceType)
    profile.onDuty = player and player.PlayerData.job.onduty or false
    return profile
end

function SRServiceNpc_GetWorkerProfileOffDuty(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return nil end
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return nil end
    local serviceType = getServiceTypeForJob(player.PlayerData.job.name)
    if not serviceType then return nil end
    local row = ensureWorkerStats(citizenid, serviceType)
    local profile = buildProfile(row, serviceType)
    profile.onDuty = player.PlayerData.job.onduty
    return profile
end

local function enrichNpcRows(rows)
    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.created_at)
        row.hasDropoff = row.dest_x ~= nil and tonumber(row.dest_x) ~= nil
    end
    return rows
end

function SRServiceNpc_GetNpcJobsForWorker(citizenid, serviceType)
    if not citizenid or not serviceType then return {} end
    MySQL.update.await(
        "UPDATE sr_phone_npc_service_jobs SET status = 'expired' WHERE worker_citizenid = ? AND service_type = ? AND status = 'open' AND expires_at < NOW()",
        { citizenid, serviceType }
    )
    local rows = MySQL.query.await(
        [[SELECT id, service_type, status, title, description, customer_name, payout,
                 x, y, z, dest_x, dest_y, dest_z, dest_label, created_at, expires_at
          FROM sr_phone_npc_service_jobs
          WHERE worker_citizenid = ? AND service_type = ?
            AND status IN ('open', 'accepted')
          ORDER BY CASE status WHEN 'accepted' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, created_at DESC
          LIMIT 20]],
        { citizenid, serviceType }
    ) or {}
    return enrichNpcRows(rows)
end

local function randomFrom(list)
    if not list or #list == 0 then return nil end
    return list[math.random(1, #list)]
end

local function randomPayout(range)
    local lo = tonumber(range and range.min) or 50
    local hi = tonumber(range and range.max) or lo
    if hi < lo then hi = lo end
    return math.random(lo, hi)
end

local function countOpenNpcJobs(citizenid, serviceType)
    return tonumber(MySQL.scalar.await(
        "SELECT COUNT(*) FROM sr_phone_npc_service_jobs WHERE worker_citizenid = ? AND service_type = ? AND status IN ('open', 'accepted')",
        { citizenid, serviceType }
    )) or 0
end

local function hasActiveAccepted(citizenid, serviceType)
    return (tonumber(MySQL.scalar.await(
        "SELECT COUNT(*) FROM sr_phone_npc_service_jobs WHERE worker_citizenid = ? AND service_type = ? AND status = 'accepted' LIMIT 1",
        { citizenid, serviceType }
    )) or 0) > 0
end

function SRServiceNpc_TrySpawnJob(source)
    if not npcEnabled() then return end
    local cfg = npcCfg()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return end

    local player = exports.qbx_core:GetPlayer(source)
    if not player or not player.PlayerData.job.onduty then return end

    local _, serviceType = SRServiceNpc_GetWorkerJobName(source)
    if not serviceType then return end

    local stats = ensureWorkerStats(citizenid, serviceType)
    if tonumber(stats.npc_jobs_enabled) ~= 1 then return end
    if hasActiveAccepted(citizenid, serviceType) then return end

    local maxOffered = cfg.maxOffered or 4
    if countOpenNpcJobs(citizenid, serviceType) >= maxOffered then return end

    local templates = cfg.templates and cfg.templates[serviceType]
    if not templates or #templates == 0 then return end

    local tpl = randomFrom(templates)
    if not tpl then return end

    local names = cfg.customerNames or { 'Citizen' }
    local customer = randomFrom(names) or 'Citizen'
    local payout = randomPayout(tpl.payout)
    local expireMin = cfg.jobExpireMinutes or 12

    local x, y, z = 0.0, 0.0, 0.0
    local destX, destY, destZ, destLabel

    if serviceType == 'taxi' and tpl.pickup and tpl.dropoff then
        x, y, z = tpl.pickup.x, tpl.pickup.y, tpl.pickup.z
        destX, destY, destZ = tpl.dropoff.x, tpl.dropoff.y, tpl.dropoff.z
        destLabel = 'Drop-off'
    elseif tpl.location then
        x, y, z = tpl.location.x, tpl.location.y, tpl.location.z
    end

    local id = MySQL.insert.await(
        [[INSERT INTO sr_phone_npc_service_jobs
          (worker_citizenid, service_type, status, title, description, customer_name, payout,
           x, y, z, dest_x, dest_y, dest_z, dest_label, expires_at)
          VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))]],
        {
            citizenid,
            serviceType,
            tostring(tpl.title or 'Contract'):sub(1, 64),
            tostring(tpl.description or ''):sub(1, 255),
            tostring(customer):sub(1, 64),
            payout,
            x, y, z,
            destX, destY, destZ,
            destLabel,
            expireMin,
        }
    )

    if id then
        local label
        for _, t in ipairs(Config.Services.types or {}) do
            if t.id == serviceType then label = t.label break end
        end
        notifyPhone(source, (label or 'Services') .. ' Contract', tpl.title .. ' — $' .. payout, 'inform')
        TriggerClientEvent('sr-smartphone:client:npcServiceJob', source, { action = 'new', id = id })
    end
end

lib.callback.register('sr-smartphone:server:toggleNpcServiceJobs', function(source, enabled)
    if not npcEnabled() then return { ok = false, error = 'disabled' } end
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local _, serviceType = SRServiceNpc_GetWorkerJobName(source)
    if not serviceType then
        local player = exports.qbx_core:GetPlayer(source)
        if player then serviceType = getServiceTypeForJob(player.PlayerData.job.name) end
    end
    if not serviceType then return { ok = false, error = 'not_worker' } end

    ensureWorkerStats(citizenid, serviceType)
    local flag = enabled and 1 or 0
    MySQL.update.await(
        'UPDATE sr_phone_service_worker_stats SET npc_jobs_enabled = ? WHERE citizenid = ? AND service_type = ?',
        { flag, citizenid, serviceType }
    )

    if enabled then
        CreateThread(function()
            Wait(2000)
            SRServiceNpc_TrySpawnJob(source)
        end)
    end

    return { ok = true, npcJobsEnabled = enabled == true }
end)

lib.callback.register('sr-smartphone:server:acceptNpcServiceJob', function(source, jobId)
    if not SRCheckRate(source, 'services', Config.RateLimit.services or 5) then return { ok = false, error = 'rate_limit' } end
    if not npcEnabled() then return { ok = false, error = 'disabled' } end
    SRPhoneAwaitDb()

    local citizenid = SRBridge.GetCitizenId(source)
    jobId = tonumber(jobId)
    if not citizenid or not jobId then return { ok = false, error = 'invalid' } end

    local workerTypes = SRServiceNpc_GetWorkerServiceTypes(source)
    if #workerTypes == 0 then return { ok = false, error = 'not_on_duty' } end

    if hasActiveAccepted(citizenid, workerTypes[1]) then
        local existing = MySQL.single.await(
            "SELECT id FROM sr_phone_npc_service_jobs WHERE worker_citizenid = ? AND service_type = ? AND status = 'accepted' LIMIT 1",
            { citizenid, workerTypes[1] }
        )
        if existing and existing.id ~= jobId then
            return { ok = false, error = 'already_active' }
        end
    end

    local job = MySQL.single.await(
        [[SELECT id, service_type, status, x, y, z, dest_x, dest_y, dest_z
          FROM sr_phone_npc_service_jobs WHERE id = ? AND worker_citizenid = ? LIMIT 1]],
        { jobId, citizenid }
    )
    if not job or job.status ~= 'open' then return { ok = false, error = 'not_available' } end

    local canType = false
    for _, t in ipairs(workerTypes) do
        if t == job.service_type then canType = true break end
    end
    if not canType then return { ok = false, error = 'not_worker' } end

    local updated = MySQL.update.await(
        "UPDATE sr_phone_npc_service_jobs SET status = 'accepted' WHERE id = ? AND worker_citizenid = ? AND status = 'open'",
        { jobId, citizenid }
    )
    if not updated or updated < 1 then return { ok = false, error = 'not_available' } end

    return {
        ok = true,
        coords = { x = tonumber(job.x) or 0.0, y = tonumber(job.y) or 0.0, z = tonumber(job.z) or 0.0 },
        destCoords = job.dest_x and {
            x = tonumber(job.dest_x) or 0.0,
            y = tonumber(job.dest_y) or 0.0,
            z = tonumber(job.dest_z) or 0.0,
        } or nil,
    }
end)

lib.callback.register('sr-smartphone:server:completeNpcServiceJob', function(source, data)
    if not SRCheckRate(source, 'services', Config.RateLimit.services or 5) then return { ok = false, error = 'rate_limit' } end
    if not npcEnabled() then return { ok = false, error = 'disabled' } end
    SRPhoneAwaitDb()

    local citizenid = SRBridge.GetCitizenId(source)
    local jobId = type(data) == 'table' and tonumber(data.id) or tonumber(data)
    local clientCoords = type(data) == 'table' and data.coords or nil
    if not citizenid or not jobId then return { ok = false, error = 'invalid' } end

    local job = MySQL.single.await(
        [[SELECT id, service_type, status, payout, x, y, z, dest_x, dest_y, dest_z
          FROM sr_phone_npc_service_jobs WHERE id = ? AND worker_citizenid = ? LIMIT 1]],
        { jobId, citizenid }
    )
    if not job or job.status ~= 'accepted' then return { ok = false, error = 'not_assigned' } end

    local cfg = npcCfg()
    local radius = cfg.completeRadius or 40.0
    local ped = GetPlayerPed(source)
    local px, py, pz = table.unpack(GetEntityCoords(ped))
    if clientCoords and clientCoords.x then
        px = tonumber(clientCoords.x) or px
        py = tonumber(clientCoords.y) or py
        pz = tonumber(clientCoords.z) or pz
    end

    local tx, ty, tz
    if job.dest_x ~= nil and tonumber(job.dest_x) then
        tx, ty, tz = tonumber(job.dest_x), tonumber(job.dest_y), tonumber(job.dest_z)
    else
        tx, ty, tz = tonumber(job.x), tonumber(job.y), tonumber(job.z)
    end

    local dist = #(vector3(px, py, pz) - vector3(tx or 0, ty or 0, tz or 0))
    if dist > radius then
        return { ok = false, error = 'too_far', distance = math.floor(dist) }
    end

    MySQL.update.await(
        "UPDATE sr_phone_npc_service_jobs SET status = 'completed' WHERE id = ? AND worker_citizenid = ?",
        { jobId, citizenid }
    )

    local payout = tonumber(job.payout) or 0
    if payout > 0 then
        SRBridge.AddMoney(source, cfg.moneyType or 'bank', payout, 'npc-service-contract')
    end

    local xpGain = cfg.xpPerJob or 15
    local repGain = cfg.reputationPerJob or 2
    local maxRep = cfg.maxReputation or 100
    MySQL.update.await(
        [[UPDATE sr_phone_service_worker_stats
          SET xp = xp + ?, reputation = LEAST(?, reputation + ?), total_npc_jobs = total_npc_jobs + 1
          WHERE citizenid = ? AND service_type = ?]],
        { xpGain, maxRep, repGain, citizenid, job.service_type }
    )

    local stats = ensureWorkerStats(citizenid, job.service_type)
    local profile = buildProfile(stats, job.service_type)

    notifyPhone(source, 'Contract Complete', ('+$%s · +%s XP · Rep %s%%'):format(payout, xpGain, profile.reputation), 'success')

    CreateThread(function()
        Wait(3000)
        SRServiceNpc_TrySpawnJob(source)
    end)

    return { ok = true, payout = payout, profile = profile }
end)

lib.callback.register('sr-smartphone:server:declineNpcServiceJob', function(source, jobId)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    jobId = tonumber(jobId)
    if not citizenid or not jobId then return { ok = false } end

    MySQL.update.await(
        "UPDATE sr_phone_npc_service_jobs SET status = 'declined' WHERE id = ? AND worker_citizenid = ? AND status = 'open'",
        { jobId, citizenid }
    )
    return { ok = true }
end)

-- Periodic contract offers for workers with NPC jobs enabled
CreateThread(function()
    while not SRPhoneDbReady do Wait(200) end
    if not npcEnabled() then return end

    local cfg = npcCfg()
    local lastSpawn = {}

    while true do
        local minWait = (cfg.spawnInterval and cfg.spawnInterval.min or 50) * 1000
        local maxWait = (cfg.spawnInterval and cfg.spawnInterval.max or 95) * 1000
        Wait(math.random(minWait, maxWait))

        for _, playerId in ipairs(GetPlayers()) do
            local src = tonumber(playerId)
            local citizenid = SRBridge.GetCitizenId(src)
            if citizenid then
                local key = citizenid
                local now = GetGameTimer()
                if not lastSpawn[key] or (now - lastSpawn[key]) > minWait then
                    SRServiceNpc_TrySpawnJob(src)
                    lastSpawn[key] = now
                end
            end
        end

        MySQL.update.await("UPDATE sr_phone_npc_service_jobs SET status = 'expired' WHERE status = 'open' AND expires_at < NOW()")
    end
end)
