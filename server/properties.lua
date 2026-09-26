SRProperties = SRProperties or {}

local function resourceStarted(name)
    return name and GetResourceState(name):find('start') ~= nil
end

local function getBuildingMeta(buildingId)
    local cfg = Config.Properties and Config.Properties.Buildings
    return cfg and cfg[buildingId] or nil
end

local function formatApartmentLabel(number)
    return ('Apartment %s'):format(number)
end

local MONTHS = {
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
}

local function formatPurchasedAt(value)
    if value == nil or value == '' then return nil end

    if type(value) == 'string' then
        local y, m, d = value:match('^(%d%d%d%d)%-(%d%d)%-(%d%d)')
        if y then
            return ('%s %d, %s'):format(MONTHS[tonumber(m)] or m, tonumber(d), y)
        end
    end

    local num = tonumber(value)
    if not num then return tostring(value) end

    if num > 9999999999 then
        num = math.floor(num / 1000)
    end

    return os.date('%b %d, %Y', math.floor(num))
end

local function coordsToTable(coords)
    if not coords then return nil end

    local x = coords.x or coords[1]
    local y = coords.y or coords[2]
    local z = coords.z or coords[3]

    if not x or not y then return nil end

    return {
        x = tonumber(x) + 0.0,
        y = tonumber(y) + 0.0,
        z = tonumber(z or 0.0) + 0.0,
    }
end

local function sanitizeProperty(property)
    if type(property) ~= 'table' then return nil end

    local id = tonumber(property.id)
    if not id then return nil end

    return {
        id = id,
        type = tostring(property.type or 'property'),
        category = tostring(property.category or 'house'),
        provider = tostring(property.provider or ''),
        label = tostring(property.label or property.address or property.buildingLabel or 'Property'),
        buildingLabel = tostring(property.buildingLabel or property.address or ''),
        buildingId = tostring(property.buildingId or ''),
        unitLabel = tostring(property.unitLabel or ''),
        address = property.address and tostring(property.address) or nil,
        apartmentNumber = tonumber(property.apartmentNumber),
        purchasedAt = formatPurchasedAt(property.purchasedAt),
        ownership = property.ownership and tostring(property.ownership) or 'owned',
        enter = coordsToTable(property.enter),
    }
end

local function collectPropertyList(raw)
    local list = {}

    if type(raw) ~= 'table' then
        return list
    end

    for i = 1, #raw do
        local row = sanitizeProperty(raw[i])
        if row then
            list[#list + 1] = row
        end
    end

    if #list > 0 then
        return list
    end

    for _, value in pairs(raw) do
        local row = sanitizeProperty(value)
        if row then
            list[#list + 1] = row
        end
    end

    return list
end

local function mapNolagProperty(raw, ownership)
    if type(raw) ~= 'table' then return nil end

    return sanitizeProperty({
        id = raw.id,
        type = raw.type or 'property',
        category = 'house',
        provider = 'nolag_properties',
        label = raw.label or raw.address,
        buildingLabel = raw.address or raw.label,
        unitLabel = raw.type,
        address = raw.address,
        enter = raw.coords,
        ownership = ownership or 'owned',
    })
end

local function collectNolagList(raw, ownership)
    local list = {}

    if type(raw) ~= 'table' then
        return list
    end

    for i = 1, #raw do
        local row = mapNolagProperty(raw[i], ownership)
        if row then
            list[#list + 1] = row
        end
    end

    if #list > 0 then
        return list
    end

    for _, value in pairs(raw) do
        local row = mapNolagProperty(value, ownership)
        if row then
            list[#list + 1] = row
        end
    end

    return list
end

local function getPropertiesFromNolag(source)
    if not resourceStarted('nolag_properties') then return nil end

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local cfg = Config.Properties and Config.Properties.houses or {}
    local ownerType = cfg.ownerType or 'user'
    local includeRents = cfg.includeRents ~= false

    local okOwned, ownedRaw = pcall(function()
        return exports['nolag_properties']:GetAllProperties(citizenid, ownerType, false)
    end)

    if not okOwned or type(ownedRaw) ~= 'table' then return nil end

    local ownedList = collectNolagList(ownedRaw, 'owned')
    local ownedIds = {}

    for i = 1, #ownedList do
        ownedIds[ownedList[i].id] = true
    end

    if not includeRents then
        return ownedList
    end

    local okAll, allRaw = pcall(function()
        return exports['nolag_properties']:GetAllProperties(citizenid, ownerType, true)
    end)

    if not okAll or type(allRaw) ~= 'table' then
        return ownedList
    end

    local list = {}
    local seen = {}

    for i = 1, #ownedList do
        list[#list + 1] = ownedList[i]
        seen[ownedList[i].id] = true
    end

    local function addFromRaw(raw)
        if type(raw) ~= 'table' then return end

        for i = 1, #raw do
            local item = raw[i]
            local id = tonumber(item and item.id)
            if id and not seen[id] then
                local row = mapNolagProperty(item, 'rented')
                if row then
                    seen[id] = true
                    list[#list + 1] = row
                end
            end
        end

        for _, item in pairs(raw) do
            local id = tonumber(item and item.id)
            if id and not seen[id] then
                local row = mapNolagProperty(item, 'rented')
                if row then
                    seen[id] = true
                    list[#list + 1] = row
                end
            end
        end
    end

    addFromRaw(allRaw)

    return list
end

local function buildPropertyFromRow(row)
    if not row then return nil end

    local building = getBuildingMeta(row.building_id)
    local enter = building and building.enter

    return sanitizeProperty({
        id = row.id,
        type = 'apartment',
        category = 'apartment',
        provider = 'srp-apartment',
        label = formatApartmentLabel(row.apartment_number),
        buildingLabel = building and building.label or row.building_id,
        buildingId = row.building_id,
        unitLabel = row.unit_type,
        apartmentNumber = row.apartment_number,
        purchasedAt = row.purchased_at,
        enter = enter,
    })
end

local function getPropertiesFromSrpExport(source)
    if not resourceStarted('srp-apartment') then return nil end

    local ok, raw = pcall(function()
        return exports['srp-apartment']:GetPlayerProperties(source)
    end)

    if not ok then return nil end

    local list = collectPropertyList(raw)
    return #list > 0 and list or nil
end

local function getPropertiesFromSrpDb(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    local rows = MySQL.query.await([[
        SELECT id, building_id, unit_type, apartment_number, purchased_at
        FROM srp_apartments
        WHERE citizenid = ?
        ORDER BY apartment_number ASC
    ]], { citizenid }) or {}

    local list = {}

    for i = 1, #rows do
        local row = buildPropertyFromRow(rows[i])
        if row then
            list[#list + 1] = row
        end
    end

    return list
end

local function getPropertiesFromSrpApartmentId(source)
    if not resourceStarted('srp-apartment') then return nil end

    local ok, apartmentId = pcall(function()
        return exports['srp-apartment']:GetPlayerApartmentId(source)
    end)

    if not ok or not apartmentId then return nil end

    local row = MySQL.single.await([[
        SELECT id, building_id, unit_type, apartment_number, purchased_at
        FROM srp_apartments
        WHERE id = ?
    ]], { apartmentId })

    local property = buildPropertyFromRow(row)
    return property and { property } or nil
end

local function getPropertiesFromLabel(source)
    local label = SRBridge.GetApartmentLabel(source)
    if not label or label == '' then return nil end

    local apartmentNumber = tonumber(tostring(label):match('(%d+)%s*$'))
        or tonumber(tostring(label):match('(%d+)'))

    local fromApartmentId = getPropertiesFromSrpApartmentId(source)
    if fromApartmentId and #fromApartmentId > 0 then
        return fromApartmentId
    end

    local citizenid = SRBridge.GetCitizenId(source)
    if citizenid and apartmentNumber then
        local row = MySQL.single.await([[
            SELECT id, building_id, unit_type, apartment_number, purchased_at
            FROM srp_apartments
            WHERE citizenid = ? AND apartment_number = ?
            LIMIT 1
        ]], { citizenid, apartmentNumber })

        local property = buildPropertyFromRow(row)
        if property then
            return { property }
        end
    end

    local building = getBuildingMeta('tinsel_towers')
    local apartmentId

    if resourceStarted('srp-apartment') then
        local ok, id = pcall(function()
            return exports['srp-apartment']:GetPlayerApartmentId(source)
        end)
        if ok and id then apartmentId = id end
    end

    local property = sanitizeProperty({
        id = apartmentId or 1,
        type = 'apartment',
        category = 'apartment',
        provider = 'srp-apartment',
        label = label,
        buildingLabel = building and building.label or label,
        buildingId = building and 'tinsel_towers' or '',
        apartmentNumber = apartmentNumber,
        enter = building and building.enter,
    })

    return property and { property } or nil
end

local function getSrpProperties(source)
    local fromExport = getPropertiesFromSrpExport(source)
    if fromExport and #fromExport > 0 then
        return fromExport
    end

    local fromDb = getPropertiesFromSrpDb(source)
    if #fromDb > 0 then
        return fromDb
    end

    local fromApartmentId = getPropertiesFromSrpApartmentId(source)
    if fromApartmentId and #fromApartmentId > 0 then
        return fromApartmentId
    end

    local fromLabel = getPropertiesFromLabel(source)
    if fromLabel and #fromLabel > 0 then
        return fromLabel
    end

    return nil
end

local function getApartments(source)
    return getSrpProperties(source) or {}
end

local function getHouses(source)
    return getPropertiesFromNolag(source) or {}
end

local function getPropertySections(source)
    return {
        apartments = getApartments(source),
        houses = getHouses(source),
    }
end

local function findProperty(source, propertyId, provider)
    propertyId = tonumber(propertyId)
    if not propertyId then return nil end

    local sections = getPropertySections(source)
    local lists = {}

    if provider == 'srp-apartment' then
        lists[#lists + 1] = sections.apartments
    elseif provider == 'nolag_properties' then
        lists[#lists + 1] = sections.houses
    else
        lists[#lists + 1] = sections.apartments
        lists[#lists + 1] = sections.houses
    end

    for i = 1, #lists do
        local list = lists[i]
        for j = 1, #list do
            if list[j].id == propertyId then
                return list[j]
            end
        end
    end

    return nil
end

local function playerHasProperty(source, propertyId, provider)
    return findProperty(source, propertyId, provider) ~= nil
end

SRProperties.GetSections = getPropertySections
SRProperties.GetOwned = getPropertySections
SRProperties.PlayerHasProperty = playerHasProperty
SRProperties.FindProperty = findProperty

lib.callback.register('sr-smartphone:server:getProperties', function(source)
    return getPropertySections(source)
end)

lib.callback.register('sr-smartphone:server:enterProperty', function(source, data)
    local propertyId = data and (data.id or data.propertyId)
    local provider = data and data.provider
    local ok, err = SRProperties.TryEnter(source, propertyId, provider)
    return { ok = ok, error = ok and nil or err }
end)

lib.callback.register('sr-smartphone:server:manageHouse', function(source, data)
    local propertyId = data and (data.id or data.propertyId)
    local provider = data and data.provider
    local ok, err = SRProperties.TryManage(source, propertyId, provider)
    return { ok = ok, error = ok and nil or err }
end)
