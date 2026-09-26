--- Emergency dispatch — find on-duty units and alert them (911-style incoming call).

SRPhone = SRPhone or {}

local function dispatchCfg()
    return Config.Dispatch or {}
end

local function isPlayerOnDuty(job)
    local cfg = dispatchCfg()
    if cfg.requireOnDuty == false then return true end
    if not job then return false end

    local onduty = job.onduty
    if onduty == nil then onduty = job.onDuty end
    return onduty == true or onduty == 1
end

local function normalizeType(jobType)
    return (jobType or ''):lower()
end

local function jobMatchesDispatch(job, jobNames, category)
    if not job then return false end

    for _, jn in ipairs(jobNames) do
        if job.name == jn then return true end
    end

    if dispatchCfg().matchJobTypes == false then return false end

    local jtype = normalizeType(job.type)
    if category == 'medical' then
        return jtype == 'ems' or jtype == 'ambulance' or jtype == 'medical'
    end
    return jtype == 'leo' or jtype == 'police'
end

local function dispatchJobsForCategory(category)
    local cfg = dispatchCfg()
    local all = cfg.jobs or { 'police', 'ambulance' }
    if category == 'medical' then
        return cfg.medicalJobs or { 'ambulance' }
    end
    if category == 'police' or category == 'fire' then
        return cfg.policeJobs or { 'police', 'bcso', 'sasp' }
    end
    return all
end

function SRPhone.GetDispatchTargets(category, excludeSource)
    local jobNames = dispatchJobsForCategory(category)
    local seen = {}
    local list = {}

    local function tryAdd(src, job)
        if not src or src == excludeSource or seen[src] then return end
        if not jobMatchesDispatch(job, jobNames, category) then return end
        if not isPlayerOnDuty(job) then return end
        seen[src] = true
        list[#list + 1] = src
    end

    local ok, playersData = pcall(function()
        return exports.qbx_core:GetPlayersData()
    end)
    if ok and playersData then
        for _, data in pairs(playersData) do
            tryAdd(tonumber(data.source), data.job)
        end
    end

    if #list == 0 then
        for _, playerId in ipairs(GetPlayers()) do
            local src = tonumber(playerId)
            local player = exports.qbx_core:GetPlayer(src)
            if player then
                tryAdd(src, player.PlayerData.job)
            end
        end
    end

    return list, jobNames
end

function SRPhone.NotifyDispatchTargets(source, category, message, callerName, callerPhone, coords, callId)
    local targets, jobNames = SRPhone.GetDispatchTargets(category, source)
    local title = '911 — ' .. category
    local description = callerName .. ': ' .. message
    local cfg = dispatchCfg()

    for _, target in ipairs(targets) do
        TriggerClientEvent('sr-smartphone:client:notify', target, {
            title = title,
            description = description,
            type = 'error',
        })

        TriggerClientEvent('sr-smartphone:client:dispatchAlert', target, {
            id = callId,
            category = category,
            message = message,
            caller = callerName,
            phone = callerPhone,
            coords = coords,
            title = title,
            description = description,
        })

        if cfg.ring911Call ~= false and SRPhone.RingDispatch911 then
            SRPhone.RingDispatch911(target, {
                id = callId,
                callerSource = source,
                callerName = callerName,
                callerPhone = callerPhone,
                category = category,
                message = message,
                coords = coords,
            })
        end
    end

    if cfg.debugDispatch and #targets == 0 then
        print(('[sr-smartphone] dispatch: no targets (category=%s, jobs=%s)'):format(
            category,
            table.concat(jobNames, ', ')
        ))
    end

    return #targets
end

local function psDispatchRunning()
    local cfg = dispatchCfg()
    if cfg.usePsDispatch == false then return false end
    return GetResourceState(cfg.psDispatchResource or 'ps-dispatch') == 'started'
end

lib.callback.register('sr-smartphone:server:sendDispatch', function(source, data)
    if type(data) ~= 'table' or not data.category or data.category == '' then
        return { ok = false, error = 'invalid' }
    end

    if not SRCheckRate(source, 'dispatch', 10) then
        return { ok = false, error = 'rate_limit' }
    end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then
        return { ok = false, error = 'not_loaded' }
    end

    local category = tostring(data.category):sub(1, 32)
    local message = tostring(data.message or ''):sub(1, 500)
    local callerName = SRBridge.GetDisplayName(source)
    local callerPhone = SRBridge.GetPhoneNumber(source)
    local coords = data.coords or {}

    local okInsert, id = pcall(function()
        return MySQL.insert.await(
            'INSERT INTO sr_phone_dispatch_calls (caller_citizenid, caller_phone, caller_name, category, message, status, x, y, z) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            {
                citizenid,
                callerPhone or '',
                callerName,
                category,
                message,
                'open',
                tonumber(coords.x) or 0.0,
                tonumber(coords.y) or 0.0,
                tonumber(coords.z) or 0.0,
            }
        )
    end)

    if not okInsert or not id then
        print(('[sr-smartphone] sendDispatch insert failed (src=%s): %s'):format(source, tostring(id)))
        return { ok = false, error = 'database' }
    end

    if psDispatchRunning() then
        TriggerClientEvent('sr-smartphone:client:psDispatch', source, category, message)
    end

    local notified = 0
    if SRPhone.NotifyDispatchTargets then
        notified = SRPhone.NotifyDispatchTargets(source, category, message, callerName, callerPhone, coords, id)
    else
        print('[sr-smartphone] sendDispatch: SRPhone.NotifyDispatchTargets missing — check server/dispatch.lua loaded')
    end

    return {
        ok = true,
        id = id,
        notified = notified,
        via = psDispatchRunning() and 'ps-dispatch+phone' or 'phone',
    }
end)
