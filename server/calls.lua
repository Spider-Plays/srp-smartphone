local activeCalls = {}
local activeDispatchCalls = {}

SRPhone = SRPhone or {}

local function pmaVoiceEnabled()
    local mode = Config.Calls and Config.Calls.voice
    if mode == false or mode == nil then return false end
    return GetResourceState('pma-voice') == 'started'
end

local function callVoiceChannel(callerSource, receiverSource)
    local a = math.min(callerSource, receiverSource)
    local b = math.max(callerSource, receiverSource)
    return a * 10000 + b
end

local function joinCallVoice(callerSource, receiverSource)
    if not pmaVoiceEnabled() then return end
    local channel = callVoiceChannel(callerSource, receiverSource)
    exports['pma-voice']:setPlayerCall(callerSource, channel)
    exports['pma-voice']:setPlayerCall(receiverSource, channel)
end

local function leaveCallVoice(source)
    if not pmaVoiceEnabled() then return end
    exports['pma-voice']:setPlayerCall(source, 0)
end

local function leaveCallVoicePair(callerSource, receiverSource)
    leaveCallVoice(callerSource)
    if receiverSource and receiverSource ~= callerSource then
        leaveCallVoice(receiverSource)
    end
end

local function getAnonymousDisplay()
    local cfg = Config.Calls or {}
    return cfg.anonymousName or 'Anonymous', cfg.anonymousNumber or 'Unknown'
end

local function getCallerDisplay(call)
    if call.anonymous then
        return getAnonymousDisplay()
    end
    return SRBridge.GetDisplayName(call.callerSource), call.callerPhone
end

function SRPhone.RingDispatch911(target, payload)
    if not target or not payload or not payload.id then return end

    local callId = ('dispatch_%s_%s'):format(payload.id, target)
    activeDispatchCalls[callId] = {
        callId = callId,
        receiverSource = target,
        callerSource = payload.callerSource,
        callerName = payload.callerName or 'Unknown',
        callerPhone = payload.callerPhone or '911',
        category = payload.category or 'police',
        message = payload.message or '',
        coords = payload.coords or {},
    }

    local cfg = Config.Dispatch or {}
    local policeNum = cfg.policeNumber or '911'

    TriggerClientEvent('sr-smartphone:client:incomingCall', target, {
        callId = callId,
        phone = payload.callerPhone or policeNum,
        name = ('911 — %s'):format(payload.callerName or 'Emergency'),
        dispatch = true,
        category = payload.category,
        message = payload.message,
    })

    SetTimeout((Config.Calls and Config.Calls.ringTimeout or 30) * 1000, function()
        if activeDispatchCalls[callId] and not activeDispatchCalls[callId].answered then
            activeDispatchCalls[callId] = nil
            TriggerClientEvent('sr-smartphone:client:callEnded', target, callId)
        end
    end)
end

local function endDispatchCall(callId, receiverSource)
    activeDispatchCalls[callId] = nil
    if receiverSource then
        TriggerClientEvent('sr-smartphone:client:callEnded', receiverSource, callId)
    end
end

local function sendCallEnded(target, payload)
    TriggerClientEvent('sr-smartphone:client:callEnded', target, payload)
end

local function endCall(callId, status, duration)
    local call = activeCalls[callId]
    if not call then return end

    MySQL.insert.await([[
        INSERT INTO sr_phone_calls
        (caller_citizenid, receiver_citizenid, caller_phone, receiver_phone, duration, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ]], {
        call.callerCitizenid,
        call.receiverCitizenid,
        call.callerPhone,
        call.receiverPhone,
        duration or 0,
        status,
    })

    sendCallEnded(call.callerSource, { callId = callId, status = status })

    local receiverPayload = { callId = callId, status = status }
    if status == 'missed' then
        local callerName, callerPhone = getCallerDisplay(call)
        receiverPayload.name = callerName
        receiverPayload.phone = callerPhone
        receiverPayload.anonymous = call.anonymous
    end
    sendCallEnded(call.receiverSource, receiverPayload)

    activeCalls[callId] = nil
    leaveCallVoicePair(call.callerSource, call.receiverSource)
end

--- Shared outbound call setup.
function SRPhone.StartOutboundCall(source, targetPhone, options)
    options = options or {}
    local anonymous = options.anonymous == true

    local callerCitizenid = options.callerCitizenid or SRBridge.GetCitizenId(source)
    local callerPhone = options.callerPhone or SRBridge.GetPhoneNumber(source)
    if not callerCitizenid or not callerPhone then
        return { ok = false, error = 'invalid' }
    end

    local targetPlayer = SRBridge.GetPlayerByPhone(targetPhone)
    if not targetPlayer then
        return { ok = false, error = 'offline' }
    end

    local receiverSource = targetPlayer.PlayerData.source
    if receiverSource == source then
        return { ok = false, error = 'self' }
    end

    for _, call in pairs(activeCalls) do
        if call.callerSource == source or call.receiverSource == source
            or call.callerSource == receiverSource or call.receiverSource == receiverSource then
            return { ok = false, error = 'busy' }
        end
    end

    local callId = ('%s_%s_%s'):format(source, receiverSource, os.time())
    local receiverCitizenid = targetPlayer.PlayerData.citizenid
    local receiverPhone = targetPhone

    activeCalls[callId] = {
        callId = callId,
        callerSource = source,
        receiverSource = receiverSource,
        callerCitizenid = callerCitizenid,
        receiverCitizenid = receiverCitizenid,
        callerPhone = callerPhone,
        receiverPhone = receiverPhone,
        anonymous = anonymous,
        startedAt = os.time(),
    }

    SetTimeout(Config.Calls.ringTimeout * 1000, function()
        local call = activeCalls[callId]
        if call and not call.answered then
            endCall(callId, 'missed', 0)
        end
    end)

    local displayName, displayPhone = getCallerDisplay(activeCalls[callId])
    TriggerClientEvent('sr-smartphone:client:incomingCall', receiverSource, {
        callId = callId,
        phone = displayPhone,
        name = displayName,
        anonymous = anonymous,
    })

    return {
        ok = true,
        callId = callId,
        name = SRBridge.GetDisplayName(receiverSource),
        phone = receiverPhone,
    }
end

lib.callback.register('sr-smartphone:server:startCall', function(source, data)
    if not SRCheckRate(source, 'startCall', Config.RateLimit.startCall) then
        return { ok = false, error = 'rate_limit' }
    end

    local payload = type(data) == 'table' and data or { phone = data }
    return SRPhone.StartOutboundCall(source, payload.phone, {
        anonymous = payload.anonymous == true,
    })
end)

lib.callback.register('sr-smartphone:server:answerCall', function(source, callId)
    local dispatch = activeDispatchCalls[callId]
    if dispatch then
        if dispatch.receiverSource ~= source then
            return { ok = false }
        end
        dispatch.answered = true
        TriggerClientEvent('sr-smartphone:client:dispatchAlert', source, {
            id = dispatch.callId,
            category = dispatch.category,
            message = dispatch.message,
            caller = dispatch.callerName,
            phone = dispatch.callerPhone,
            coords = dispatch.coords,
            title = '911 — ' .. (dispatch.category or 'emergency'),
            description = dispatch.callerName .. ': ' .. dispatch.message,
        })
        TriggerClientEvent('sr-smartphone:client:callAnswered', source, {
            callId = callId,
            name = dispatch.callerName,
            phone = dispatch.callerPhone,
            dispatch = true,
        })
        activeDispatchCalls[callId] = nil
        return { ok = true, dispatch = true }
    end

    local call = activeCalls[callId]
    if not call or call.receiverSource ~= source then
        return { ok = false }
    end

    call.answered = true
    call.answeredAt = os.time()

    TriggerClientEvent('sr-smartphone:client:callAnswered', call.callerSource, {
        callId = callId,
        name = SRBridge.GetDisplayName(source),
        phone = call.receiverPhone,
    })

    local callerName, callerPhone = getCallerDisplay(call)
    TriggerClientEvent('sr-smartphone:client:callAnswered', call.receiverSource, {
        callId = callId,
        name = callerName,
        phone = callerPhone,
        anonymous = call.anonymous,
    })

    joinCallVoice(call.callerSource, call.receiverSource)

    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:declineCall', function(source, callId)
    local dispatch = activeDispatchCalls[callId]
    if dispatch then
        if dispatch.receiverSource ~= source then
            return { ok = false }
        end
        endDispatchCall(callId, source)
        return { ok = true, dispatch = true }
    end

    local call = activeCalls[callId]
    if not call then return { ok = false } end
    if call.receiverSource ~= source and call.callerSource ~= source then
        return { ok = false }
    end

    local status = call.callerSource == source and 'cancelled' or 'declined'
    endCall(callId, status, 0)
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:endCall', function(source, callId)
    local dispatch = activeDispatchCalls[callId]
    if dispatch then
        if dispatch.receiverSource ~= source then
            return { ok = false }
        end
        endDispatchCall(callId, source)
        return { ok = true, dispatch = true }
    end

    local call = activeCalls[callId]
    if not call then return { ok = false } end
    if call.callerSource ~= source and call.receiverSource ~= source then
        return { ok = false }
    end

    local duration = 0
    if call.answeredAt then
        duration = os.time() - call.answeredAt
    end

    endCall(callId, call.answered and 'answered' or 'cancelled', duration)
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:getCallHistory', function(source)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return {} end

    return MySQL.query.await([[
        SELECT caller_phone, receiver_phone, duration, status, created_at,
               CASE WHEN caller_citizenid = ? THEN 1 ELSE 0 END AS outgoing
        FROM sr_phone_calls
        WHERE caller_citizenid = ? OR receiver_citizenid = ?
        ORDER BY created_at DESC
        LIMIT 50
    ]], { citizenid, citizenid, citizenid }) or {}
end)

AddEventHandler('playerDropped', function()
    local src = source
    leaveCallVoice(src)
    for callId, call in pairs(activeCalls) do
        if call.callerSource == src or call.receiverSource == src then
            endCall(callId, 'cancelled', 0)
        end
    end
    for callId, dispatch in pairs(activeDispatchCalls) do
        if dispatch.receiverSource == src or dispatch.callerSource == src then
            activeDispatchCalls[callId] = nil
        end
    end
end)
