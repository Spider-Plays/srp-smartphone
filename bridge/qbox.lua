---@class SRBridge
SRBridge = {}

local isServer = IsDuplicityVersion()

function SRBridge.GetPlayer(source)
    if isServer then
        return exports.qbx_core:GetPlayer(source)
    end
    return exports.qbx_core:GetPlayerData()
end

function SRBridge.GetCitizenId(source)
    local player = SRBridge.GetPlayer(source)
    if not player then return nil end
    if isServer then
        return player.PlayerData.citizenid
    end
    return player.citizenid
end

function SRBridge.GetCharInfo(source)
    local player = SRBridge.GetPlayer(source)
    if not player then return nil end
    if isServer then
        return player.PlayerData.charinfo
    end
    return player.charinfo
end

function SRBridge.GetPhoneNumber(source)
    local charinfo = SRBridge.GetCharInfo(source)
    return charinfo and charinfo.phone or nil
end

function SRBridge.GetDisplayName(source)
    local charinfo = SRBridge.GetCharInfo(source)
    if not charinfo then return 'Unknown' end
    return ('%s %s'):format(charinfo.firstname or '', charinfo.lastname or '')
end

function SRBridge.GetMoney(source, moneyType)
    if isServer then
        return exports.qbx_core:GetMoney(source, moneyType) or 0
    end
    local player = SRBridge.GetPlayer(source)
    return player and player.money and player.money[moneyType] or 0
end

if isServer then
    function SRBridge.AddMoney(source, moneyType, amount, reason)
        return exports.qbx_core:AddMoney(source, moneyType, amount, reason or 'sr-smartphone')
    end

    function SRBridge.RemoveMoney(source, moneyType, amount, reason)
        return exports.qbx_core:RemoveMoney(source, moneyType, amount, reason or 'sr-smartphone')
    end

    function SRBridge.GetPlayerByPhone(phone)
        if not phone or phone == '' then return nil end
        local players = exports.qbx_core:GetPlayersData()
        for _, data in pairs(players) do
            if data.charinfo and data.charinfo.phone == phone then
                return exports.qbx_core:GetPlayer(data.source)
            end
        end
        return nil
    end

    function SRBridge.GetSourceByPhone(phone)
        local player = SRBridge.GetPlayerByPhone(phone)
        return player and player.PlayerData.source or nil
    end

    function SRBridge.Notify(source, data)
        TriggerClientEvent('ox_lib:notify', source, data)
    end

    function SRBridge.GetStateId(source)
        local player = SRBridge.GetPlayer(source)
        if not player or not player.PlayerData then return tostring(source) end
        local pd = player.PlayerData
        if pd.cid then return tostring(pd.cid) end
        if pd.charinfo and pd.charinfo.id then return tostring(pd.charinfo.id) end
        return tostring(source)
    end

    function SRBridge.GetApartmentLabel(source)
        if GetResourceState('srp-apartment'):find('start') then
            local ok, label = pcall(function()
                return exports['srp-apartment']:GetPlayerApartmentLabel(source)
            end)
            if ok and label and label ~= '' then
                return tostring(label)
            end
        end

        local list = Config.Profile and Config.Profile.HousingExports
        if not list then return nil end

        for _, entry in ipairs(list) do
            local resource = entry.resource
            local exportName = entry.export
            if resource ~= 'srp-apartment' and resource ~= 'nolag_properties' and resource and exportName and GetResourceState(resource):find('start') then
                local ok, label = pcall(function()
                    return exports[resource][exportName](source)
                end)
                if ok and label and label ~= '' then
                    return tostring(label)
                end
            end
        end

        return nil
    end
else
    function SRBridge.Notify(data)
        lib.notify(data)
    end

    function SRBridge.IsLoggedIn()
        return SRBridge.GetCitizenId() ~= nil
    end
end
