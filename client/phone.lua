PhoneCursorEnabled = false
PhoneTyping = false
PhoneInventoryLocked = false

--- Busy flags so ox_inventory / emotes / other scripts skip keybinds while the phone is open.
local function setPhoneInputLock(locked)
    LocalPlayer.state:set('phoneOpen', locked, true)
    LocalPlayer.state:set('invBusy', locked, true)
    LocalPlayer.state:set('inv_busy', locked, true)
    LocalPlayer.state:set('disableEmotes', locked, true)
end

local function setPhoneOpenOnly(locked)
    LocalPlayer.state:set('phoneOpen', locked, true)
    LocalPlayer.state:set('disableEmotes', locked, true)
end

function TogglePhoneCursor()
    if not PhoneOpen then return end
    if not (SRCamera and SRCamera.IsActive()) then return end

    PhoneCursorEnabled = not PhoneCursorEnabled

    if PhoneCursorEnabled then
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(true)
        SetCursorLocation(0.88, 0.88)
    else
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(true)
    end
end

function TogglePhone()
    if PhoneOpen then
        ClosePhone()
    else
        OpenPhone()
    end
end

function OpenPhone(options)
    if PhoneOpen then return end

    options = type(options) == 'table' and options or {}
    local lockInventory = options.lockInventory ~= false

    local phoneControls = Config.PhoneControls or {}
    if phoneControls.allowPhoneInVehicle == false and IsPedInAnyVehicle(PlayerPedId(), false) then
        SRBridge.Notify({ title = 'Phone', description = 'You cannot use your phone while in a vehicle.', type = 'error' })
        return
    end

    if not SRBridge.IsLoggedIn() then
        SRBridge.Notify({ title = 'Phone', description = 'Character not loaded yet.', type = 'error' })
        return
    end

    PlayerLoaded = true

    local canOpen = lib.callback.await('sr-smartphone:server:canOpen', false)
    if not canOpen then
        SRBridge.Notify({ title = 'Phone', description = 'You need a phone.', type = 'error' })
        return
    end

    PhoneData = lib.callback.await('sr-smartphone:server:getBootstrap', false)
    if not PhoneData then
        SRBridge.Notify({ title = 'Phone', description = 'Could not load phone data.', type = 'error' })
        return
    end

    PhoneOpen = true
    PhoneInventoryLocked = lockInventory
    if lockInventory then
        setPhoneInputLock(true)
    else
        setPhoneOpenOnly(true)
    end

    if SRPhoneEmoteStart then SRPhoneEmoteStart() end

    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(true)

    SendNUIMessage({
        action = 'open',
        data = PhoneData,
    })

    TriggerEvent('sr-smartphone:client:phoneOpened')
end

function ClosePhone()
    if not PhoneOpen then return end

    if SRCamera and SRCamera.IsActive() then
        SRCamera.Stop()
    end

    PhoneOpen = false
    PhoneTyping = false
    LocalPlayer.state:set('phoneTyping', false, true)
    if PhoneInventoryLocked then
        setPhoneInputLock(false)
    else
        setPhoneOpenOnly(false)
    end
    PhoneInventoryLocked = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)

    if SRPhoneEmoteStop then SRPhoneEmoteStop() end
    if SRPhoneEmoteCleanupProps then SRPhoneEmoteCleanupProps() end

    suppressPauseMenu(600)

    SendNUIMessage({ action = 'close' })
    TriggerEvent('sr-smartphone:client:phoneClosed')
end

local PHONE_MOVEMENT_CONTROLS = {
    30, 31, -- move axis
    32, 33, 34, 35, -- W A S D
    21, -- sprint (optional)
    22, -- jump (optional)
}

local PHONE_CAMERA_LOOK_CONTROLS = { 1, 2 }

--- Steering, throttle, brake, handbrake (driver / front seat).
local PHONE_VEHICLE_CONTROLS = {
    59, 60, 61, 62, 63, 64,
    71, 72, 76,
}

local PHONE_EXTRA_BLOCKED_CONTROLS = {
    23, 75, 76, 85, 86, 99, 106, -- vehicle / radio / vehicle mouse
    177, 178, 179, 180, 181, 182, 183, -- frontend nav (other menus)
    199, 200, 322, -- pause / ESC (still detected via IsDisabledControlJustReleased)
}

local PAUSE_MENU_CONTROLS = {
    199, -- pause alternate (P)
    200, -- pause / frontend
    322, -- ESC
}

local pauseSuppressUntil = 0

function suppressPauseMenu(durationMs)
    pauseSuppressUntil = GetGameTimer() + (durationMs or 600)
    SetPauseMenuActive(false)
end

local function blockPauseControls()
    for i = 1, #PAUSE_MENU_CONTROLS do
        local control = PAUSE_MENU_CONTROLS[i]
        DisableControlAction(0, control, true)
        DisableControlAction(1, control, true)
        DisableControlAction(2, control, true)
    end
end

local function phoneControlSettings()
    return Config.PhoneControls or {}
end

local function enableControl(control)
    EnableControlAction(0, control, true)
    EnableControlAction(1, control, true)
    EnableControlAction(2, control, true)
end

function RestorePhoneNuiFocus()
    if not PhoneOpen then return end

    local cameraActive = SRCamera and SRCamera.IsActive()
    if PhoneCursorEnabled then
        SetNuiFocus(true, true)
    elseif cameraActive then
        SetNuiFocus(true, false)
    else
        SetNuiFocus(true, true)
    end
    SetNuiFocusKeepInput(true)
end

function SetPhoneTyping(typing)
    PhoneTyping = typing == true
    LocalPlayer.state:set('phoneTyping', PhoneTyping, true)

    if not PhoneOpen then return end

    if PhoneTyping then
        SetNuiFocusKeepInput(false)
    else
        RestorePhoneNuiFocus()
    end
end

local function blockPhoneGameControls(cameraActive)
    local cfg = phoneControlSettings()
    local ped = PlayerPedId()
    local inVehicle = IsPedInAnyVehicle(ped, false)
    local drivingWithPhone = inVehicle and cfg.allowVehicleControls ~= false

    if cfg.blockGameControls == false then
        for i = 1, #PHONE_EXTRA_BLOCKED_CONTROLS do
            local control = PHONE_EXTRA_BLOCKED_CONTROLS[i]
            DisableControlAction(0, control, true)
            DisableControlAction(1, control, true)
            DisableControlAction(2, control, true)
        end
        return
    end

    DisableAllControlActions(0)
    DisableAllControlActions(1)
    DisableAllControlActions(2)

    if PhoneTyping then
        DisablePlayerFiring(PlayerId(), true)
        HudWeaponWheelIgnoreSelection()
        BlockWeaponWheelThisFrame()
        SetPlayerCanDoDriveBy(PlayerId(), false)
        return
    end

    if drivingWithPhone then
        for i = 1, #PHONE_VEHICLE_CONTROLS do
            enableControl(PHONE_VEHICLE_CONTROLS[i])
        end
    elseif cfg.allowMovement ~= false then
        for i = 1, #PHONE_MOVEMENT_CONTROLS do
            local control = PHONE_MOVEMENT_CONTROLS[i]
            if control == 21 and cfg.allowSprint ~= true then goto continue_move end
            if control == 22 and cfg.allowJump ~= true then goto continue_move end
            enableControl(control)
            ::continue_move::
        end
    end

    if cameraActive and not PhoneCursorEnabled and not drivingWithPhone then
        for i = 1, #PHONE_CAMERA_LOOK_CONTROLS do
            enableControl(PHONE_CAMERA_LOOK_CONTROLS[i])
        end
    end

    DisablePlayerFiring(PlayerId(), true)
    HudWeaponWheelIgnoreSelection()
    BlockWeaponWheelThisFrame()
    SetPlayerCanDoDriveBy(PlayerId(), false)
end

CreateThread(function()
    while true do
        local suppressPause = GetGameTimer() < pauseSuppressUntil

        if PhoneOpen or suppressPause then
            Wait(0)
            blockPauseControls()

            if PhoneOpen then
                local cameraActive = SRCamera and SRCamera.IsActive()
                if cameraActive and SRCamera.HideHudThisFrame then
                    SRCamera.HideHudThisFrame()
                end
                blockPhoneGameControls(cameraActive)

                if IsDisabledControlJustReleased(0, 322) then
                    ClosePhone()
                end
            elseif suppressPause then
                SetPauseMenuActive(false)
            end
        else
            Wait(100)
        end
    end
end)

function RefreshPhoneData()
    if not PhoneOpen then return end
    PhoneData = lib.callback.await('sr-smartphone:server:getBootstrap', false)
    if PhoneData then
        SendNUIMessage({ action = 'bootstrap', data = PhoneData })
    end
end

RegisterNetEvent('sr-smartphone:client:refreshBootstrap', function()
    RefreshPhoneData()
end)

RegisterCommand('sr-phone:cursor', function()
    TogglePhoneCursor()
end, false)

RegisterKeyMapping(
    'sr-phone:cursor',
    'Toggle phone cursor (camera)',
    'keyboard',
    (Config.Camera and Config.Camera.cursorKey) or 'LMENU'
)
