local currentCallId = nil

RegisterNetEvent('sr-smartphone:client:incomingCall', function(data)
    currentCallId = data.callId

    if not PhoneOpen then
        OpenPhone()
        Wait(300)
    end

    SendNUIMessage({ action = 'incomingCall', data = data })
end)

RegisterNetEvent('sr-smartphone:client:callAnswered', function(data)
    currentCallId = data.callId
    SendNUIMessage({ action = 'callAnswered', data = data })
end)

RegisterNetEvent('sr-smartphone:client:callEnded', function(payload)
    local data = type(payload) == 'table' and payload or { callId = payload }
    if currentCallId == data.callId then
        currentCallId = nil
    end
    SendNUIMessage({ action = 'callEnded', data = data })
end)

function GetCurrentCallId()
    return currentCallId
end

function SetCurrentCallId(callId)
    currentCallId = callId
end
