local phoneFlashlightOn = false

local function setPhoneFlashlight(enabled)
    local nextState = enabled == true
    if nextState == phoneFlashlightOn then return end
    phoneFlashlightOn = nextState
    SetFlashLightKeepOn(PlayerPedId(), phoneFlashlightOn)
    if not phoneFlashlightOn then return end

    CreateThread(function()
        while phoneFlashlightOn do
            local ped = PlayerPedId()
            local coords = GetEntityCoords(ped)
            local forward = GetEntityForwardVector(ped)
            DrawSpotLight(
                coords.x, coords.y, coords.z + 0.55,
                forward.x, forward.y, forward.z,
                255, 255, 230,
                18.0, 8.0, 1.0, 18.0, 1.0
            )
            Wait(0)
        end
    end)
end

RegisterNUICallback('setFlashlight', function(data, cb)
    setPhoneFlashlight(data and data.enabled == true)
    cb({ ok = true, enabled = phoneFlashlightOn })
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    phoneFlashlightOn = false
    SetFlashLightKeepOn(PlayerPedId(), false)
end)

RegisterNUICallback('close', function(_, cb)
    ClosePhone()
    cb('ok')
end)

RegisterNUICallback('setPhoneTyping', function(data, cb)
    local typing = data and data.typing == true
    SetPhoneTyping(typing)
    cb('ok')
end)

RegisterNUICallback('hideFrame', function(_, cb)
    ClosePhone()
    cb('ok')
end)

RegisterNUICallback('getContacts', function(_, cb)
    local contacts = lib.callback.await('sr-smartphone:server:getContacts', false)
    cb(contacts or {})
end)

RegisterNUICallback('addContact', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:addContact', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('updateContact', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:updateContact', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('deleteContact', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:deleteContact', false, data.id)
    cb(result or { ok = false })
end)

RegisterNUICallback('getConversations', function(_, cb)
    local conversations = lib.callback.await('sr-smartphone:server:getConversations', false)
    cb(conversations or {})
end)

RegisterNUICallback('getMessages', function(data, cb)
    local messages = lib.callback.await('sr-smartphone:server:getMessages', false, data.phone)
    cb(messages or {})
end)

RegisterNUICallback('sendMessage', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:sendMessage', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('lookupPhone', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:lookupPhone', false, data.phone)
    cb(result or { online = false })
end)

RegisterNUICallback('saveSettings', function(data, cb)
    local ok = lib.callback.await('sr-smartphone:server:saveSettings', false, data)
    cb({ ok = ok })
end)

RegisterNUICallback('bankTransfer', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:bankTransfer', false, data)
    cb(result or { ok = false })
end)

RegisterNUICallback('startCall', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:startCall', false, data)
    if result and result.ok then
        SetCurrentCallId(result.callId)
    end
    cb(result or { ok = false })
end)

RegisterNUICallback('answerCall', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:answerCall', false, data.callId)
    cb(result or { ok = false })
end)

RegisterNUICallback('declineCall', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:declineCall', false, data.callId)
    if result and result.ok then
        SetCurrentCallId(nil)
    end
    cb(result or { ok = false })
end)

RegisterNUICallback('endCall', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:endCall', false, data.callId)
    if result and result.ok then
        SetCurrentCallId(nil)
    end
    cb(result or { ok = false })
end)

RegisterNUICallback('getCallHistory', function(_, cb)
    local history = lib.callback.await('sr-smartphone:server:getCallHistory', false)
    cb(history or {})
end)
