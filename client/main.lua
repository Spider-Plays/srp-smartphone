PhoneOpen = false
PhoneData = nil
PlayerLoaded = false

local function syncPlayerLoaded()
    PlayerLoaded = SRBridge.IsLoggedIn()
end

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    PlayerLoaded = true
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    PlayerLoaded = false
    if PhoneOpen then
        ClosePhone()
    end
end)

RegisterNetEvent('qbx_core:client:playerLoggedOut', function()
    PlayerLoaded = false
    if PhoneOpen then
        ClosePhone()
    end
end)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    CreateThread(function()
        Wait(500)
        syncPlayerLoaded()
    end)
end)

CreateThread(function()
    Wait(1000)
    syncPlayerLoaded()
end)

RegisterNetEvent('QBCore:Client:OnMoneyChange', function(moneyType, amount, operation)
    if not PhoneOpen or not PhoneData then return end
    PhoneData.money[moneyType] = SRBridge.GetMoney(nil, moneyType)
    SendNUIMessage({
        action = 'updateMoney',
        money = PhoneData.money,
    })
end)

RegisterNetEvent('sr-smartphone:client:notify', function(data)
    if not data then return end
    SRBridge.Notify({
        title = data.title or 'Phone',
        description = data.description or data.body or '',
        type = data.type or 'inform',
    })
end)

RegisterNetEvent('sr-smartphone:client:newMessage', function(data)
    if PhoneOpen then
        SendNUIMessage({
            action = 'newMessage',
            data = data,
        })
    else
        SRBridge.Notify({
            title = data.name or 'New Message',
            description = data.message or (data.image and 'Photo' or ''),
            type = 'inform',
        })
    end
end)

RegisterNetEvent('sr-smartphone:client:mailUpdated', function()
    SendNUIMessage({ action = 'mailUpdated' })
end)

RegisterNetEvent('sr-smartphone:client:jobApplicationAccepted', function(data)
    if not data then return end
    SendNUIMessage({ action = 'jobApplicationAccepted', data = data })
    SendNUIMessage({ action = 'jobCenterRefresh' })
    if not PhoneOpen then
        SRBridge.Notify({
            title = data.title or 'LifeInvader',
            description = data.message or data.body or 'Your job application was accepted.',
            type = 'success',
        })
    end
end)

RegisterNetEvent('sr-smartphone:client:npcServiceJob', function(data)
    SendNUIMessage({ action = 'npcServiceJob', data = data or {} })
end)

RegisterNetEvent('sr-smartphone:client:chirpNotify', function(data)
    if not data then return end
    SendNUIMessage({
        action = 'chirpNotify',
        data = data,
    })
    if not PhoneOpen then
        SRBridge.Notify({
            title = data.title or 'Twitter',
            description = data.message or data.body or '',
            type = 'inform',
        })
    end
end)

RegisterCommand(Config.OpenCommand, function()
    TogglePhone()
end, false)

RegisterKeyMapping(Config.OpenCommand, 'Open smartphone', 'keyboard', Config.OpenKey)

exports('OpenPhone', function()
    OpenPhone()
end)

exports('ClosePhone', function()
    ClosePhone()
end)

exports('IsPhoneOpen', function()
    return PhoneOpen
end)
