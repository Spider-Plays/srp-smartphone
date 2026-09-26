--- lb-phone-style camera: CreateMobilePhone + CellCam + CellFrontCamActivate.
--- The photo capture itself happens in NUI by snapshotting the WebGL canvas,
--- so we no longer depend on screenshot-basic for the take-photo path.

SRCamera = {}

local cameraActive = false
local isSelfie = false
local canToggleHud = false
local canToggleRadar = false
local cameraThread = nil
local weaponHiddenForCamera = false
local currentZoom = 'wide'
local lastRearZoom = 'wide'
local zoomLevelsById = {}

--- Native: CellCamSetDistance — lower = zoomed in (tele), higher = wider (ultrawide).
local function cellCamSetDistance(dist)
    Citizen.InvokeNative(0x53F4892D18EC90A4, dist + 0.0)
end

local function rebuildZoomLookup()
    zoomLevelsById = {}
    local levels = (Config.Camera or {}).zoomLevels
    if type(levels) ~= 'table' then return end
    for i = 1, #levels do
        local z = levels[i]
        if type(z) == 'table' and z.id then
            zoomLevelsById[z.id] = z
        end
    end
end

local function defaultZoomId()
    local id = (Config.Camera or {}).defaultZoom
    if type(id) == 'string' and zoomLevelsById[id] then return id end
    if zoomLevelsById.wide then return 'wide' end
    for k in pairs(zoomLevelsById) do return k end
    return 'wide'
end

local function getActiveZoomDistance()
    local z = zoomLevelsById[currentZoom] or zoomLevelsById[defaultZoomId()]
    if not z then return 1.0 end
    if isSelfie and z.selfieDistance ~= nil then
        return z.selfieDistance + 0.0
    end
    return (z.distance or 1.0) + 0.0
end

local function applyCellCamZoom()
    if not cameraActive then return end
    cellCamSetDistance(getActiveZoomDistance())
end

local function serializeZoomLevels()
    local out = {}
    local levels = (Config.Camera or {}).zoomLevels
    if type(levels) ~= 'table' then return out end
    for i = 1, #levels do
        local z = levels[i]
        if type(z) == 'table' and z.id then
            out[#out + 1] = {
                id = z.id,
                label = z.label or z.id,
                scale = tonumber(z.scale) or 1.0,
                rearOnly = z.rearOnly == true,
            }
        end
    end
    return out
end

-- GTA HUD component ids — cell cam still draws weapon reticle / ammo unless hidden per-frame.
local CAMERA_HIDDEN_HUD = {
    2,  -- WEAPON_ICON
    14, -- RETICLE (crosshair)
    19, -- WEAPON_WHEEL
    20, -- WEAPON_WHEEL_STATS
    22, -- HUD_WEAPONS (ammo)
}

--- NPWD: CellFrontCamActivate — native selfie mode toggle.
local function cellFrontCamActivate(activate)
    return Citizen.InvokeNative(0x2491A93618B7D838, activate)
end

local function setPhoneNuiFocusForCamera()
    if not PhoneOpen then return end
    SetNuiFocus(true, false)
    SetNuiFocusKeepInput(true)
end

local function restorePhoneNuiFocus()
    if not PhoneOpen then return end
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(true)
end

local function hideHudIfNeeded()
    if not IsHudHidden() then
        canToggleHud = true
        DisplayHud(false)
    else
        canToggleHud = false
    end

    if not IsRadarHidden() then
        canToggleRadar = true
        DisplayRadar(false)
    else
        canToggleRadar = false
    end
end

local function restoreHudIfNeeded()
    if canToggleHud then
        DisplayHud(true)
        canToggleHud = false
    end
    if canToggleRadar then
        DisplayRadar(true)
        canToggleRadar = false
    end
end

local function hidePedWeaponForCamera()
    local ped = PlayerPedId()
    if ped == 0 then return end
    SetPedCurrentWeaponVisible(ped, false, true, false, false)
    weaponHiddenForCamera = true
end

local function restorePedWeaponForCamera()
    if not weaponHiddenForCamera then return end
    local ped = PlayerPedId()
    if ped ~= 0 then
        SetPedCurrentWeaponVisible(ped, true, false, false, false)
    end
    weaponHiddenForCamera = false
end

local function hideCameraHudThisFrame()
    HideHudAndRadarThisFrame()
    for i = 1, #CAMERA_HIDDEN_HUD do
        HideHudComponentThisFrame(CAMERA_HIDDEN_HUD[i])
    end
    DisplayAmmoThisFrame(false)
    BlockWeaponWheelThisFrame()
    HudWeaponWheelIgnoreSelection()
    DisablePlayerFiring(PlayerId(), true)
end

function SRCamera.HideHudThisFrame()
    if not cameraActive then return end
    hideCameraHudThisFrame()
end

local function stopCellCamera()
    CellCamActivate(false, false)
    DestroyMobilePhone()
end

local function startCellCamera()
    stopCellCamera()
    local phoneType = Config.Camera.phoneType or 1
    CreateMobilePhone(phoneType)
    CellCamActivate(true, true)
    cellFrontCamActivate(isSelfie)
end

local function startCameraLoop()
    if cameraThread then return end

    cameraThread = CreateThread(function()
        while cameraActive do
            Wait(0)
            InvalidateIdleCam()
            InvalidateVehicleIdleCam()
            hideCameraHudThisFrame()
            applyCellCamZoom()
        end
        cameraThread = nil
    end)
end

function SRCamera.IsActive()
    return cameraActive
end

function SRCamera.IsSelfie()
    return isSelfie
end

function SRCamera.Start()
    if cameraActive then return end
    if not Config.Camera.enabled then return end

    rebuildZoomLookup()
    currentZoom = defaultZoomId()
    lastRearZoom = currentZoom

    cameraActive = true
    isSelfie = false

    hideHudIfNeeded()

    -- Drop the emote-menu phone so CreateMobilePhone is the only rig in hand.
    if SRPhoneEmoteReleaseForCamera then
        SRPhoneEmoteReleaseForCamera()
    end

    hidePedWeaponForCamera()
    startCellCamera()
    setPhoneNuiFocusForCamera()
    startCameraLoop()

    TriggerEvent('sr-smartphone:client:cameraStarted')
end

function SRCamera.Stop()
    if not cameraActive then return end

    cameraActive = false
    isSelfie = false
    currentZoom = defaultZoomId()
    lastRearZoom = currentZoom
    PhoneCursorEnabled = false

    stopCellCamera()
    restorePedWeaponForCamera()
    restoreHudIfNeeded()
    restorePhoneNuiFocus()

    TriggerEvent('sr-smartphone:client:cameraStopped')

    -- DestroyMobilePhone can leave a detached prop for a frame or two; sweep
    -- attached phone props, then restore the normal phone emote if UI is open.
    CreateThread(function()
        Wait(0)
        if SRPhoneEmoteCleanupProps then SRPhoneEmoteCleanupProps() end
        Wait(150)
        if SRPhoneEmoteCleanupProps then SRPhoneEmoteCleanupProps() end

        if PhoneOpen and SRPhoneEmoteRefire then
            SRPhoneEmoteRefire()
        end
    end)
end

function SRCamera.Flip()
    if not cameraActive then
        return { ok = false, isSelfie = isSelfie, zoom = currentZoom }
    end

    if isSelfie then
        isSelfie = false
        currentZoom = lastRearZoom
    else
        lastRearZoom = currentZoom
        isSelfie = true
        if currentZoom ~= 'wide' then
            currentZoom = 'wide'
        end
    end

    cellFrontCamActivate(isSelfie)
    applyCellCamZoom()

    return { ok = true, isSelfie = isSelfie, zoom = currentZoom }
end

function SRCamera.GetZoom()
    return currentZoom
end

function SRCamera.SetZoom(zoomId)
    if not cameraActive then
        return { ok = false, zoom = currentZoom }
    end
    if type(zoomId) ~= 'string' or not zoomLevelsById[zoomId] then
        return { ok = false, zoom = currentZoom, error = 'invalid_zoom' }
    end
    if isSelfie and zoomId ~= 'wide' then
        return { ok = false, zoom = currentZoom, error = 'selfie_wide_only' }
    end

    currentZoom = zoomId
    if not isSelfie then
        lastRearZoom = zoomId
    end

    applyCellCamZoom()

    local z = zoomLevelsById[currentZoom]
    return { ok = true, zoom = currentZoom, scale = z and tonumber(z.scale) or 1.0 }
end

local function playShutterSound()
    if Config.Camera.shutterSound == false then return end
    PlaySoundFrontend(-1, 'Camera_Shoot', 'Phone_SoundSet_Default', true)
end

function SRCamera.PlayShutter()
    playShutterSound()
end

RegisterNUICallback('cameraOpen', function(_, cb)
    SRCamera.Start()
    local cam = Config.Camera or {}
    cb({
        ok = true,
        isSelfie = SRCamera.IsSelfie(),
        zoom = SRCamera.GetZoom(),
        zoomLevels = serializeZoomLevels(),
        videoEnabled = cam.videoEnabled ~= false,
        maxVideoDuration = cam.maxVideoDuration or 15,
        maxVideoSizeMb = cam.maxVideoSizeMb or 24,
    })
end)

RegisterNUICallback('cameraClose', function(_, cb)
    SRCamera.Stop()
    cb({ ok = true })
end)

RegisterNUICallback('flipCamera', function(_, cb)
    cb(SRCamera.Flip())
end)

RegisterNUICallback('setCameraZoom', function(data, cb)
    cb(SRCamera.SetZoom(data and data.zoom))
end)

--- NUI plays the shutter sound here, then captures the WebGL canvas itself.
RegisterNUICallback('cameraShutter', function(_, cb)
    SRCamera.PlayShutter()
    cb({ ok = true, isSelfie = isSelfie })
end)

-- In-game test (F8): triggers server HTTP test. Server console uses `srphone:testwebhook`.
RegisterCommand('srphone_testwebhook', function()
    TriggerServerEvent('sr-smartphone:server:requestWebhookTest')
end, false)

RegisterNetEvent('sr-smartphone:client:webhookTestResult', function(ok, reason)
    local msg = ok and 'Discord test sent — check your webhook channel.' or ('Discord test failed: %s'):format(reason or '?')
    if lib and lib.notify then
        lib.notify({ title = 'SR Phone', description = msg, type = ok and 'success' or 'error' })
    else
        print('[sr-smartphone] ' .. msg)
    end
end)

RegisterNUICallback('getCameraUploadMethod', function(_, cb)
    cb({
        method = SRCameraUpload and SRCameraUpload.resolveMethod() or 'local',
        hasFivemanage = SRCameraUpload and SRCameraUpload.fivemanageKey('image') ~= nil,
        hasFivemanageVideo = SRCameraUpload and SRCameraUpload.fivemanageKey('video') ~= nil,
    })
end)

RegisterNUICallback('getPresignedUrl', function(data, cb)
    local result = lib.callback.await('sr-smartphone:server:getPresignedUrl', false, data or {})
    cb(result or { ok = false, error = 'presigned_failed' })
end)

local pendingPhotoSaves = {}
local PHOTO_CHUNK_SIZE = 60000

RegisterNetEvent('sr-smartphone:client:photoSaveResult', function(reqId, result)
    local cb = pendingPhotoSaves[reqId]
    if not cb then return end
    pendingPhotoSaves[reqId] = nil
    cb(result or { ok = false })
end)

RegisterNUICallback('savePhoto', function(data, cb)
    if not data or not data.url or data.url == '' then
        cb({ ok = false, error = 'invalid' })
        return
    end
    if type(data.isSelfie) ~= 'boolean' then data.isSelfie = isSelfie end
    local mediaType = data.mediaType == 'video' and 'video' or 'photo'

    local url = data.url
    local label = type(data.label) == 'string' and data.label or ''

    -- lb-phone: NUI already uploaded to Fivemanage — only a short https URL is sent here.
    -- Discord/local: large data URLs are chunked (callbacks truncate big payloads).
    local method = SRCameraUpload and SRCameraUpload.resolveMethod() or 'local'
    if url:sub(1, 11) == 'data:image/' and method ~= 'fivemanage' and #url > PHOTO_CHUNK_SIZE then
        local reqId = ('%s_%s_%s'):format(GetPlayerServerId(PlayerId()), GetGameTimer(), math.random(1000, 9999))
        pendingPhotoSaves[reqId] = cb
        local total = math.ceil(#url / PHOTO_CHUNK_SIZE)
        for i = 1, total do
            local start = (i - 1) * PHOTO_CHUNK_SIZE + 1
            local chunk = url:sub(start, math.min(start + PHOTO_CHUNK_SIZE - 1, #url))
            TriggerServerEvent('sr-smartphone:server:photoChunk', reqId, i, total, chunk, data.isSelfie, label)
        end
        SetTimeout(45000, function()
            local pending = pendingPhotoSaves[reqId]
            if pending then
                pendingPhotoSaves[reqId] = nil
                pending({ ok = false, error = 'timeout' })
            end
        end)
        return
    end

    local result = lib.callback.await('sr-smartphone:server:savePhoto', false, {
        url = url,
        isSelfie = data.isSelfie,
        label = label,
        mediaType = mediaType,
    })
    cb(result or { ok = false })
end)
