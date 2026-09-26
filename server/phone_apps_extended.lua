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

local function jobInList(jobName, list)
    if not jobName or not list then return false end
    for _, name in ipairs(list) do
        if name == jobName then return true end
    end
    return false
end

local function catalogById(appId)
    local catalog = Config.AppStore and Config.AppStore.catalog or {}
    for _, item in ipairs(catalog) do
        if item.id == appId then return item end
    end
    return nil
end

local function isEssentialApp(appId)
    for _, id in ipairs((Config.AppStore and Config.AppStore.essentialApps) or {}) do
        if id == appId then return true end
    end
    return false
end

local function catalogInstalledState(item, overrides)
    if overrides[item.id] ~= nil then
        return overrides[item.id]
    end
    return item.defaultInstalled == true
end

-- ─── Wallet / ID (Documents) ────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getWalletCards', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { cards = {} } end

    local pd = player.PlayerData
    local charinfo = pd.charinfo or {}
    local metadata = pd.metadata or {}
    local licences = metadata.licences or {}
    local name = SRBridge.GetDisplayName(source)
    local cards = {}

    for _, spec in ipairs(Config.Wallet and Config.Wallet.cards or {}) do
        local valid = true
        if spec.licenceKey then
            valid = licences[spec.licenceKey] == true
        end

        cards[#cards + 1] = {
            id = spec.id,
            label = spec.label,
            icon = spec.icon,
            valid = valid,
            holderName = name,
            stateId = SRBridge.GetStateId(source),
            citizenid = pd.citizenid,
            dob = charinfo.birthdate or '—',
            gender = charinfo.gender == 1 and 'Female' or 'Male',
            phone = charinfo.phone or '—',
            nationality = charinfo.nationality or 'USA',
            issued = 'Los Santos',
        }
    end

    return { cards = cards }
end)

-- ─── Boss / Company ─────────────────────────────────────────────────────────

local function getSocietyBalance(jobName)
    if not jobName or jobName == 'unemployed' then return 0 end
    if SRBanking.UseRenewed() then
        local ok, balance = pcall(function()
            return exports[Config.Bank.resource]:getAccountMoney(jobName)
        end)
        if ok and type(balance) == 'number' then return balance end
    end
    return 0
end

local function isBoss(player)
    local job = player.PlayerData.job
    if not job or job.name == 'unemployed' then return false end
    local minGrade = (Config.Boss and Config.Boss.minBossGrade) or 3
    return (job.grade and job.grade.level or 0) >= minGrade
end

lib.callback.register('sr-smartphone:server:getBossData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { isBoss = false } end

    local job = player.PlayerData.job or {}
    local boss = isBoss(player)
    local employees = {}

    if boss then
        for _, playerId in ipairs(GetPlayers()) do
            local src = tonumber(playerId)
            local other = exports.qbx_core:GetPlayer(src)
            if other and other.PlayerData.job.name == job.name then
                employees[#employees + 1] = {
                    source = src,
                    name = SRBridge.GetDisplayName(src),
                    grade = other.PlayerData.job.grade and other.PlayerData.job.grade.name or '',
                    gradeLevel = other.PlayerData.job.grade and other.PlayerData.job.grade.level or 0,
                    onDuty = other.PlayerData.job.onduty == true,
                    isSelf = src == source,
                }
            end
        end
        table.sort(employees, function(a, b)
            return (a.gradeLevel or 0) > (b.gradeLevel or 0)
        end)
    end

    return {
        isBoss = boss,
        job = {
            name = job.name or 'unemployed',
            label = job.label or 'Unemployed',
            grade = job.grade and job.grade.name or '',
            gradeLevel = job.grade and job.grade.level or 0,
        },
        societyBalance = boss and getSocietyBalance(job.name) or 0,
        employees = employees,
    }
end)

lib.callback.register('sr-smartphone:server:bossSetDuty', function(source, data)
    if not SRCheckRate(source, 'boss', 10) then return { ok = false, error = 'rate_limit' } end
    local player = exports.qbx_core:GetPlayer(source)
    if not player or not isBoss(player) then return { ok = false, error = 'not_boss' } end

    local targetSrc = tonumber(data and data.targetSource)
    local onDuty = data and data.onDuty == true
    if not targetSrc then return { ok = false, error = 'invalid' } end

    local target = exports.qbx_core:GetPlayer(targetSrc)
    if not target or target.PlayerData.job.name ~= player.PlayerData.job.name then
        return { ok = false, error = 'invalid_employee' }
    end

    target.Functions.SetJobDuty(onDuty)
    return { ok = true, onDuty = onDuty }
end)

-- ─── MDT / EMS (Jobs) ───────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getMdtData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { allowed = false } end
    local jobName = player.PlayerData.job and player.PlayerData.job.name
    local allowed = jobInList(jobName, Config.MDT and Config.MDT.policeJobs or {})
    if not allowed then return { allowed = false } end

    return {
        allowed = true,
        officer = SRBridge.GetDisplayName(source),
        badge = SRBridge.GetStateId(source),
        bolos = Config.MDT and Config.MDT.bolos or {},
        warrants = Config.MDT and Config.MDT.warrants or {},
    }
end)

lib.callback.register('sr-smartphone:server:mdtPlateLookup', function(source, plate)
    if not SRCheckRate(source, 'boss', 20) then return { ok = false } end
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { ok = false } end
    local jobName = player.PlayerData.job and player.PlayerData.job.name
    if not jobInList(jobName, Config.MDT and Config.MDT.policeJobs or {}) then
        return { ok = false, error = 'denied' }
    end

    plate = (plate or ''):upper():gsub('%s+', '')
    if plate == '' then return { ok = false, error = 'empty' } end

    local row = MySQL.single.await(
        'SELECT citizenid, vehicle, plate FROM player_vehicles WHERE REPLACE(UPPER(plate), " ", "") = ? LIMIT 1',
        { plate }
    )

    if not row then
        return { ok = true, found = false, plate = plate }
    end

    local ownerName = 'Unknown'
    local ownerPlayer = exports.qbx_core:GetPlayerByCitizenId(row.citizenid)
    if ownerPlayer then
        ownerName = SRBridge.GetDisplayName(ownerPlayer.PlayerData.source)
    else
        local offline = MySQL.single.await(
            'SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1',
            { row.citizenid }
        )
        if offline and offline.charinfo then
            local info = type(offline.charinfo) == 'string' and json.decode(offline.charinfo) or offline.charinfo
            if info then
                ownerName = ('%s %s'):format(info.firstname or '', info.lastname or '')
            end
        end
    end

    return {
        ok = true,
        found = true,
        plate = row.plate,
        vehicle = row.vehicle,
        owner = ownerName,
        citizenid = row.citizenid,
    }
end)

lib.callback.register('sr-smartphone:server:getEmsData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { allowed = false } end
    local jobName = player.PlayerData.job and player.PlayerData.job.name
    local allowed = jobInList(jobName, Config.MDT and Config.MDT.emsJobs or {})
    if not allowed then return { allowed = false } end

    return {
        allowed = true,
        medic = SRBridge.GetDisplayName(source),
        facility = 'Pillbox Hill Medical',
    }
end)

lib.callback.register('sr-smartphone:server:emsPatientLookup', function(source, targetSource)
    if not SRCheckRate(source, 'boss', 20) then return { ok = false } end
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return { ok = false } end
    local jobName = player.PlayerData.job and player.PlayerData.job.name
    if not jobInList(jobName, Config.MDT and Config.MDT.emsJobs or {}) then
        return { ok = false, error = 'denied' }
    end

    local targetSrc = tonumber(targetSource)
    local target = targetSrc and exports.qbx_core:GetPlayer(targetSrc)
    if not target then return { ok = false, error = 'not_found' } end

    local meta = target.PlayerData.metadata or {}
    return {
        ok = true,
        name = SRBridge.GetDisplayName(targetSrc),
        citizenid = target.PlayerData.citizenid,
        phone = target.PlayerData.charinfo and target.PlayerData.charinfo.phone or '—',
        bloodType = meta.bloodtype or 'Unknown',
        health = meta.health or 100,
        armor = meta.armor or 0,
        isDead = meta.isdead == true or meta.inlaststand == true,
    }
end)

-- ─── Real Estate Browse ─────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getRealEstateListings', function(source)
    local listings = {}
    for _, entry in ipairs(Config.RealEstate and Config.RealEstate.listings or {}) do
        listings[#listings + 1] = {
            id = entry.id,
            label = entry.label,
            address = entry.address,
            category = entry.category,
            listingType = entry.listingType or 'buy',
            price = entry.price,
            beds = entry.beds,
            baths = entry.baths,
            image = entry.image or '',
            coords = entry.coords,
        }
    end
    return {
        listings = listings,
        agentPhone = Config.RealEstate and Config.RealEstate.agentPhone or '555-REAL',
    }
end)

lib.callback.register('sr-smartphone:server:getRealEstateAgents', function(source)
    local agents = {}
    for _, entry in ipairs(Config.RealEstate and Config.RealEstate.agents or {}) do
        agents[#agents + 1] = {
            id = entry.id,
            name = entry.name,
            role = entry.role or 'Agent',
            company = entry.company or '',
            phone = entry.phone or '',
            isBroker = entry.isBroker == true,
            activeListings = entry.activeListings or 0,
            sales = entry.sales or 0,
            available = entry.available == true,
            specialty = entry.specialty or '',
            avatar = entry.avatar or '',
        }
    end
    return { agents = agents }
end)

lib.callback.register('sr-smartphone:server:contactRealEstateAgent', function(source, data)
    if not SRCheckRate(source, 'realEstate', 5) then return { ok = false } end
    local listingId = data and data.listingId
    local listing
    for _, entry in ipairs(Config.RealEstate and Config.RealEstate.listings or {}) do
        if entry.id == listingId then listing = entry break end
    end
    if not listing then return { ok = false, error = 'not_found' } end

    local agentPhone = Config.RealEstate and Config.RealEstate.agentPhone
    if agentPhone then
        local body = ('Interested in %s (%s) — $%s'):format(listing.label, listing.address, listing.price)
        insertSystemMessageForPhone(source, agentPhone, body)
    end

    return { ok = true, coords = listing.coords }
end)

function insertSystemMessageForPhone(senderSource, receiverPhone, body)
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

-- ─── Dark Web ───────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getDarkWebListings', function(source, data)
    local category = data and data.category or 'all'
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local rows
    if category == 'all' then
        rows = MySQL.query.await(
            'SELECT id, title, description, price, category, seller_alias, created_at FROM sr_phone_darkweb_listings WHERE active = 1 ORDER BY created_at DESC LIMIT 50',
            {}
        ) or {}
    else
        rows = MySQL.query.await(
            'SELECT id, title, description, price, category, seller_alias, created_at FROM sr_phone_darkweb_listings WHERE active = 1 AND category = ? ORDER BY created_at DESC LIMIT 50',
            { category }
        ) or {}
    end

    for _, row in ipairs(rows) do
        row.timeAgo = formatTimeAgo(row.created_at)
        row.isMine = false
    end

    local mine = MySQL.query.await(
        'SELECT id, title, description, price, category, seller_alias, created_at, active FROM sr_phone_darkweb_listings WHERE citizenid = ? ORDER BY created_at DESC LIMIT 10',
        { citizenid }
    ) or {}
    for _, row in ipairs(mine) do
        row.timeAgo = formatTimeAgo(row.created_at)
        row.isMine = true
    end

    return { listings = rows, mine = mine, categories = Config.DarkWeb and Config.DarkWeb.categories or {} }
end)

lib.callback.register('sr-smartphone:server:createDarkWebListing', function(source, data)
    if not SRCheckRate(source, 'darkweb', 10) then return { ok = false, error = 'rate_limit' } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data then return { ok = false } end

    local count = MySQL.scalar.await(
        'SELECT COUNT(*) FROM sr_phone_darkweb_listings WHERE citizenid = ? AND active = 1',
        { citizenid }
    ) or 0
    local maxListings = (Config.DarkWeb and Config.DarkWeb.maxListings) or 5
    if count >= maxListings then return { ok = false, error = 'max_listings' } end

    local fee = (Config.DarkWeb and Config.DarkWeb.listingFee) or 100
    if SRBridge.GetMoney(source, 'cash') < fee then
        return { ok = false, error = 'insufficient' }
    end
    SRBridge.RemoveMoney(source, 'cash', fee, 'darkweb-listing')

    local alias = ('Ghost_%s'):format(math.random(1000, 9999))
    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_darkweb_listings (citizenid, title, description, price, category, seller_alias, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        {
            citizenid,
            (data.title or 'Listing'):sub(1, 64),
            (data.description or ''):sub(1, 256),
            tonumber(data.price) or 0,
            data.category or 'contraband',
            alias,
        }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteDarkWebListing', function(source, listingId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await(
        'UPDATE sr_phone_darkweb_listings SET active = 0 WHERE id = ? AND citizenid = ?',
        { listingId, citizenid }
    )
    return { ok = true }
end)

-- ─── Calendar ───────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getCalendarEvents', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { events = {} } end

    local personal = MySQL.query.await(
        'SELECT id, title, description, location, starts_at, created_at FROM sr_phone_calendar_events WHERE citizenid = ? ORDER BY starts_at ASC LIMIT 50',
        { citizenid }
    ) or {}

    for _, row in ipairs(personal) do
        row.isPersonal = true
        row.timeAgo = formatTimeAgo(row.created_at)
    end

    local serverEvents = {}
    for _, ev in ipairs(Config.Calendar and Config.Calendar.serverEvents or {}) do
        serverEvents[#serverEvents + 1] = {
            id = ev.id,
            title = ev.title,
            description = ev.description,
            location = ev.location,
            starts_at = ev.startsAt,
            isPersonal = false,
            isServer = true,
        }
    end

    return { events = personal, serverEvents = serverEvents }
end)

lib.callback.register('sr-smartphone:server:saveCalendarEvent', function(source, data)
    if not SRCheckRate(source, 'calendar', 15) then return { ok = false } end
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or not data or not data.title then return { ok = false } end

    if data.id then
        MySQL.update.await(
            'UPDATE sr_phone_calendar_events SET title = ?, description = ?, location = ?, starts_at = ? WHERE id = ? AND citizenid = ?',
            {
                data.title:sub(1, 96),
                (data.description or ''):sub(1, 256),
                (data.location or ''):sub(1, 96),
                data.starts_at or os.date('%Y-%m-%d %H:%M:%S'),
                data.id,
                citizenid,
            }
        )
        return { ok = true, id = data.id }
    end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_calendar_events (citizenid, title, description, location, starts_at) VALUES (?, ?, ?, ?, ?)',
        {
            citizenid,
            data.title:sub(1, 96),
            (data.description or ''):sub(1, 256),
            (data.location or ''):sub(1, 96),
            data.starts_at or os.date('%Y-%m-%d %H:%M:%S'),
        }
    )
    return { ok = true, id = id }
end)

lib.callback.register('sr-smartphone:server:deleteCalendarEvent', function(source, eventId)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end
    MySQL.update.await(
        'DELETE FROM sr_phone_calendar_events WHERE id = ? AND citizenid = ?',
        { eventId, citizenid }
    )
    return { ok = true }
end)

-- ─── Radio / Music ──────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getRadioStations', function(_)
    return {
        stations = Config.Radio and Config.Radio.stations or {},
    }
end)

-- ─── App Store ──────────────────────────────────────────────────────────────

lib.callback.register('sr-smartphone:server:getAppStoreCatalog', function(source)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    local installed = {}
    if citizenid then
        local rows = MySQL.query.await(
            'SELECT app_id, installed FROM sr_phone_installed_apps WHERE citizenid = ?',
            { citizenid }
        ) or {}
        for _, row in ipairs(rows) do
            installed[row.app_id] = SRPhoneParseInstalledFlag(row.installed)
        end
    end

    local catalog = {}
    for _, item in ipairs(Config.AppStore and Config.AppStore.catalog or {}) do
        if isEssentialApp(item.id) then goto continue end
        catalog[#catalog + 1] = {
            id = item.id,
            label = item.label,
            description = item.description,
            price = item.price or 0,
            installed = catalogInstalledState(item, installed),
            canUninstall = true,
        }
        ::continue::
    end

    table.sort(catalog, function(a, b)
        return (a.label or a.id) < (b.label or b.id)
    end)

    return { catalog = catalog }
end)

lib.callback.register('sr-smartphone:server:installApp', function(source, appId)
    SRPhoneAwaitDb()
    if not SRCheckRate(source, 'appstore', 10) then return { ok = false, error = 'rate_limit' } end
    appId = type(appId) == 'string' and appId or (type(appId) == 'table' and appId.appId) or nil
    if not appId or appId == '' then return { ok = false, error = 'invalid_app' } end
    if isEssentialApp(appId) then return { ok = false, error = 'essential' } end
    local item = catalogById(appId)
    if not item then return { ok = false, error = 'unknown' } end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_character' } end

    local price = item.price or 0
    if price > 0 and SRBridge.GetMoney(source, 'bank') < price then
        return { ok = false, error = 'insufficient' }
    end
    if price > 0 then
        SRBridge.RemoveMoney(source, 'bank', price, 'app-store')
    end

    local ok, err = pcall(MySQL.insert.await,
        'INSERT INTO sr_phone_installed_apps (citizenid, app_id, installed) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE installed = 1',
        { citizenid, appId }
    )
    if not ok then
        print(('[sr-smartphone] installApp DB error (%s): %s'):format(tostring(appId), tostring(err)))
        return { ok = false, error = 'database' }
    end

    return { ok = true, apps = SRPhoneResolveApps(citizenid), appId = appId, installed = true }
end)

lib.callback.register('sr-smartphone:server:uninstallApp', function(source, appId)
    SRPhoneAwaitDb()
    if not SRCheckRate(source, 'appstore', 10) then return { ok = false, error = 'rate_limit' } end
    appId = type(appId) == 'string' and appId or (type(appId) == 'table' and appId.appId) or nil
    if not appId or appId == '' then return { ok = false, error = 'invalid_app' } end
    if isEssentialApp(appId) then return { ok = false, error = 'essential' } end
    local item = catalogById(appId)
    if not item then return { ok = false, error = 'unknown' } end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_character' } end

    local ok, err = pcall(MySQL.insert.await,
        'INSERT INTO sr_phone_installed_apps (citizenid, app_id, installed) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE installed = 0',
        { citizenid, appId }
    )
    if not ok then
        print(('[sr-smartphone] uninstallApp DB error (%s): %s'):format(tostring(appId), tostring(err)))
        return { ok = false, error = 'database' }
    end

    return { ok = true, apps = SRPhoneResolveApps(citizenid), appId = appId, installed = false }
end)
