local rateBuckets = {}

SRPhone = SRPhone or {}

function SRCheckRate(source, action, limit)
    local now = os.time()
    rateBuckets[source] = rateBuckets[source] or {}
    local bucket = rateBuckets[source][action] or { count = 0, reset = now + 60 }

    if now >= bucket.reset then
        bucket.count = 0
        bucket.reset = now + 60
    end

    if bucket.count >= limit then
        return false
    end

    bucket.count = bucket.count + 1
    rateBuckets[source][action] = bucket
    return true
end

AddEventHandler('playerDropped', function()
    rateBuckets[source] = nil
end)

function SRHasPhoneItem(source)
    if not Config.RequireItem then return true end
    local count = exports.ox_inventory:Search(source, 'count', Config.PhoneItem)
    return (count or 0) > 0
end

function SRNewsCanPublish(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return false end

    local jobs = Config.News and Config.News.publisherJobs or {}
    if #jobs == 0 then return false end

    local jobName = player.PlayerData.job and player.PlayerData.job.name or ''
    for _, j in ipairs(jobs) do
        if j == jobName then return true end
    end
    return false
end

function SRPhoneParseInstalledFlag(value)
    if value == true then return true end
    if value == false then return false end
    return tonumber(value) == 1
end

local function catalogInstalledState(item, overrides)
    if overrides[item.id] ~= nil then
        return overrides[item.id]
    end
    return item.defaultInstalled == true
end

--- Resolved home-screen app flags (Config.Apps + App Store installs). Used by bootstrap and App Store.
function SRPhoneResolveApps(citizenid)
    local apps = {}
    local essentialSet = {}
    for _, id in ipairs((Config.AppStore and Config.AppStore.essentialApps) or {}) do
        essentialSet[id] = true
    end

    local overrides = {}
    if citizenid then
        local rows = MySQL.query.await(
            'SELECT app_id, installed FROM sr_phone_installed_apps WHERE citizenid = ?',
            { citizenid }
        ) or {}
        for _, row in ipairs(rows) do
            overrides[row.app_id] = SRPhoneParseInstalledFlag(row.installed)
        end
    end

    for id in pairs(essentialSet) do
        apps[id] = Config.Apps[id] ~= false
    end

    for _, item in ipairs((Config.AppStore and Config.AppStore.catalog) or {}) do
        if essentialSet[item.id] then goto continue end
        local installed = catalogInstalledState(item, overrides)
        apps[item.id] = installed and (Config.Apps[item.id] ~= false)
        ::continue::
    end

    for id, enabled in pairs(Config.Apps or {}) do
        if apps[id] == nil then
            apps[id] = enabled ~= false
        end
    end

    for id, enabled in pairs(Config.Apps or {}) do
        if enabled == false then
            apps[id] = false
        end
    end

    return apps
end
