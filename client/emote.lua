SRPhoneEmote = {
    active = false,
    prop = nil,
    maintain = nil,
    externalStarted = false,
    usingNative = false,
}

local MAINTAIN_INTERVAL_MS = 1000
local FIRE_GAP_MS = 600
local EMOTE_VERIFY_WAIT_MS = 400

local NATIVE_PHONE_PROP = 413312110 -- CreateMobilePhone default prop

local PHONE_PROP_MODELS = {
    [NATIVE_PHONE_PROP] = true,
    [joaat('prop_npc_phone_02')] = true,
    [joaat('prop_phone_ing')] = true,
    [joaat('prop_amb_phone')] = true,
    [joaat('prop_player_phone_01')] = true,
}

local lastFireAt = 0

local function deletePhonePropEntity(obj)
    if not obj or obj == 0 or not DoesEntityExist(obj) then return end

    if IsEntityAttached(obj) then
        DetachEntity(obj, true, true)
    end

    SetEntityAsMissionEntity(obj, true, true)
    DeleteEntity(obj)
end

--- Remove phone props attached to the local ped (emote menu, native, or cell-cam leftovers).
function SRPhoneEmoteCleanupProps()
    local ped = PlayerPedId()
    local pool = GetGamePool('CObject')

    if SRPhoneEmote.prop then
        local emoteProp = SRPhoneEmote.prop
        if DoesEntityExist(emoteProp) then
            deletePhonePropEntity(emoteProp)
        end
        SRPhoneEmote.prop = nil
    end

    for i = 1, #pool do
        local obj = pool[i]
        if DoesEntityExist(obj) and PHONE_PROP_MODELS[GetEntityModel(obj)] then
            if IsEntityAttachedToEntity(obj, ped) then
                deletePhonePropEntity(obj)
            end
        end
    end
end

local function sweepPhonePropsDelayed()
    CreateThread(function()
        Wait(0)
        SRPhoneEmoteCleanupProps()
        Wait(150)
        SRPhoneEmoteCleanupProps()
    end)
end

local function emoteCfg()
    return Config.PhoneEmote or {}
end

local function cameraIsActive()
    return SRCamera and SRCamera.IsActive and SRCamera.IsActive()
end

local function animDict()
    return emoteCfg().dict or 'cellphone@'
end

local function animName()
    return emoteCfg().anim or 'cellphone_text_read_base'
end

local function loadAnimDict(dict)
    RequestAnimDict(dict)
    local timeout = GetGameTimer() + 5000
    while not HasAnimDictLoaded(dict) do
        if GetGameTimer() > timeout then return false end
        Wait(0)
    end
    return true
end

local function isPhoneAnimPlaying(ped)
    ped = ped or PlayerPedId()
  return IsEntityPlayingAnim(ped, animDict(), animName(), 3)
        or IsEntityPlayingAnim(ped, 'anim@cellphone@in_car@ps', 'cellphone_text_in', 3)
        or IsEntityPlayingAnim(ped, 'cellphone@', 'cellphone_call_listen_base', 3)
end

local function isRpemotesActive()
    if GetResourceState('rpemotes') ~= 'started' then return false end
    local ok, current = pcall(function()
        return exports['rpemotes']:IsPlayerInAnim()
    end)
    return ok and current ~= nil and current ~= false
end

local function tryStartRpemotes(name)
    if GetResourceState('rpemotes') ~= 'started' then return false end
    local ok = pcall(function()
        exports['rpemotes']:EmoteCommandStart(name)
    end)
    return ok
end

local function tryCancelRpemotes()
    if not isRpemotesActive() then return false end
    pcall(function()
        exports['rpemotes']:EmoteCancel()
    end)
    return true
end

local function externalEmoteIsActive()
    return isRpemotesActive() or isPhoneAnimPlaying()
end

local function waitForExternalEmote()
    Wait(EMOTE_VERIFY_WAIT_MS)
    return externalEmoteIsActive()
end

local function tryMenuEmote(name)
    name = name or 'phone'

    if GetResourceState('scully_emotemenu') == 'started' then
        local ok = pcall(function()
            exports.scully_emotemenu:playEmoteByCommand(name)
        end)
        if ok then return true end
    end

    if tryStartRpemotes(name) then
        return true
    end

    if GetResourceState('dp-emotes') == 'started' then
        TriggerEvent('animations:client:EmoteCommandStart', { name })
        return true
    end

    return false
end

local function tryCommandEmote(command)
    if not command or command == '' then return end
    ExecuteCommand(command)
end

--- Cancel menu emotes without `e c` (rpemotes prints "No emote to cancel" for that).
local function cancelExternalEmote(cfg)
    cfg = cfg or emoteCfg()

    if cfg.cancelEvent then
        TriggerEvent(cfg.cancelEvent)
        return
    end

    if GetResourceState('scully_emotemenu') == 'started' then
        pcall(function()
            exports.scully_emotemenu:cancelEmote()
        end)
        return
    end

    if tryCancelRpemotes() then return end

    if GetResourceState('dp-emotes') == 'started' and externalEmoteIsActive() then
        tryCommandEmote(cfg.closeCommand or 'e c')
    end
end

local function resetEmoteState()
    SRPhoneEmote.externalStarted = false
    SRPhoneEmote.usingNative = false
end

local function startCommandEmote(cfg, name)
    resetEmoteState()

    if tryMenuEmote(name) and waitForExternalEmote() then
        SRPhoneEmote.externalStarted = true
        return
    end

    tryCommandEmote(cfg.openCommand or ('e %s'):format(name))
    if waitForExternalEmote() then
        SRPhoneEmote.externalStarted = true
        return
    end

    if SRPhoneEmoteStartNative() then
        SRPhoneEmote.usingNative = true
    end
end

--- Plays the native cellphone anim and (re)spawns the phone prop attached
--- to the right hand. Does NOT start its own maintain loop — that's handled
--- centrally by SRPhoneEmoteStart so we never get two competing loops.
local function nativePhoneAnimForPed(ped, cfg)
    if IsPedInAnyVehicle(ped, false) then
        local veh = GetVehiclePedIsIn(ped, false)
        if veh ~= 0 then
            local seat = GetPedInVehicleSeat(veh, -1)
            if seat == ped or GetPedInVehicleSeat(veh, 0) == ped then
                return 'anim@cellphone@in_car@ps', 'cellphone_text_in'
            end
        end
    end
    return cfg.dict or 'cellphone@', cfg.anim or 'cellphone_text_read_base'
end

function SRPhoneEmoteStartNative()
    local cfg = emoteCfg()
    local ped = PlayerPedId()
    local dict, anim = nativePhoneAnimForPed(ped, cfg)
    local propModel = joaat(cfg.prop or 'prop_npc_phone_02')

    if not loadAnimDict(dict) then return false end

    TaskPlayAnim(ped, dict, anim, 3.0, 3.0, -1, 49, 0, false, false, false)

    if SRPhoneEmote.prop and DoesEntityExist(SRPhoneEmote.prop) then
        return true
    end

    RequestModel(propModel)
    local timeout = GetGameTimer() + 5000
    while not HasModelLoaded(propModel) do
        if GetGameTimer() > timeout then return false end
        Wait(0)
    end

    local coords = GetEntityCoords(ped)
    SRPhoneEmote.prop = CreateObject(propModel, coords.x, coords.y, coords.z, true, true, false)
    AttachEntityToEntity(
        SRPhoneEmote.prop,
        ped,
        GetPedBoneIndex(ped, 28422),
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
        true, true, false, true, 1, true
    )
    SetModelAsNoLongerNeeded(propModel)

    return true
end

function SRPhoneEmoteStopNative()
    local ped = PlayerPedId()
    ClearPedSecondaryTask(ped)
    StopAnimTask(ped, animDict(), animName(), 1.0)
    StopAnimTask(ped, 'anim@cellphone@in_car@ps', 'cellphone_text_in', 1.0)
    StopAnimTask(ped, 'cellphone@', 'cellphone_call_listen_base', 1.0)

    if SRPhoneEmote.prop and DoesEntityExist(SRPhoneEmote.prop) then
        deletePhonePropEntity(SRPhoneEmote.prop)
        SRPhoneEmote.prop = nil
    end
end

--- Fire the configured emote exactly once. Used both for the initial play
--- and from the maintain loop to re-fire after any interruption.
local function fireEmoteOnce(mode, cfg, name)
    local now = GetGameTimer()
    if now - lastFireAt < FIRE_GAP_MS then return end
    lastFireAt = now

    if mode == 'event' and cfg.event then
        resetEmoteState()
        TriggerEvent(cfg.event, name)
        if waitForExternalEmote() then
            SRPhoneEmote.externalStarted = true
        end
    elseif mode == 'native' then
        resetEmoteState()
        if SRPhoneEmoteStartNative() then
            SRPhoneEmote.usingNative = true
        end
    elseif mode == 'command' then
        startCommandEmote(cfg, name)
    else
        -- auto: prefer emote menu/command, fall back to the native anim
        startCommandEmote(cfg, name)
    end
end

local function usesExternalEmote(mode)
    return mode == 'command' or mode == 'event'
end

function SRPhoneEmoteStart()
    local cfg = emoteCfg()
    if not cfg.enabled then return end
    if SRPhoneEmote.active then return end

    SRPhoneEmote.active = true
    resetEmoteState()
    local mode = cfg.mode or 'auto'
    local name = cfg.name or 'phone'

    CreateThread(function()
        SRPhoneEmoteCleanupProps()
        fireEmoteOnce(mode, cfg, name)
    end)

    -- Universal maintain loop: as long as the phone UI is open, keep the
    -- emote up. If the cell-cam takes over (it spawns its own phone prop),
    -- step aside and let it own the rig until the camera closes.
    if SRPhoneEmote.maintain then return end
    SRPhoneEmote.maintain = CreateThread(function()
        while SRPhoneEmote.active do
            Wait(MAINTAIN_INTERVAL_MS)

            if not SRPhoneEmote.active then break end
            if not PhoneOpen then break end
            if cameraIsActive() then
                -- camera owns the phone rig; stand down for now
                goto continue
            end

            -- Command/event emotes own their prop; re-firing stacks duplicates.
            if not usesExternalEmote(mode) and not isPhoneAnimPlaying() then
                fireEmoteOnce(mode, cfg, name)
            end

            ::continue::
        end
        SRPhoneEmote.maintain = nil
    end)
end

--- Drop any visible phone prop/anim while the cell-cam owns the rig.
--- Keeps `SRPhoneEmote.active` true so the maintain loop resumes after camera close.
function SRPhoneEmoteReleaseForCamera()
    if not SRPhoneEmote.active then return end

    local cfg = emoteCfg()

    if SRPhoneEmote.externalStarted and not SRPhoneEmote.usingNative then
        cancelExternalEmote(cfg)
    end

    SRPhoneEmoteStopNative()
end

--- Called by the camera flow when CellCam releases the phone rig so the
--- emote can come straight back without waiting for the next maintain tick.
function SRPhoneEmoteRefire()
    if not SRPhoneEmote.active then return end
    if not PhoneOpen then return end
    if cameraIsActive() then return end
    local cfg = emoteCfg()
    fireEmoteOnce(cfg.mode or 'auto', cfg, cfg.name or 'phone')
end

function SRPhoneEmoteStop()
    local cfg = emoteCfg()
    local wasActive = SRPhoneEmote.active
    SRPhoneEmote.active = false

    if cfg.enabled and wasActive and SRPhoneEmote.externalStarted and not SRPhoneEmote.usingNative then
        cancelExternalEmote(cfg)
    end

    SRPhoneEmoteStopNative()
    SRPhoneEmoteCleanupProps()
    sweepPhonePropsDelayed()
    resetEmoteState()
end

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    SRPhoneEmote.active = false
    SRPhoneEmoteStopNative()
    SRPhoneEmoteCleanupProps()
end)
