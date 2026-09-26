--- Camera save pipeline (lb-phone style).
---
--- fivemanage: NUI uploads via presigned URL → server stores https CDN link only
--- discord:    chunked data URL → server PerformHttpRequest → Discord CDN
--- local:      data URL stored in DB (fallback)

local MAX_PAYLOAD_BYTES = 6 * 1024 * 1024
local CHUNK_SIZE = 60000

local pendingChunks = {}

local function insertGalleryRow(citizenid, url, label, isSelfie, mediaType)
    local selfieVal = isSelfie and 1 or 0
    local labelVal = label:sub(1, 64)

    local ok, id = pcall(function()
        return MySQL.insert.await(
            'INSERT INTO sr_phone_gallery (citizenid, url, label, is_selfie, media_type) VALUES (?, ?, ?, ?, ?)',
            { citizenid, url, labelVal, selfieVal, mediaType }
        )
    end)
    if ok and id then return id end

    local errFull = (not ok) and tostring(id) or 'insert_returned_nil'
    ok, id = pcall(function()
        return MySQL.insert.await(
            'INSERT INTO sr_phone_gallery (citizenid, url, label, is_selfie) VALUES (?, ?, ?, ?)',
            { citizenid, url, labelVal, selfieVal }
        )
    end)
    if ok and id then return id end

    local errLegacy = (not ok) and tostring(id) or 'insert_returned_nil'
    ok, id = pcall(function()
        return MySQL.insert.await(
            'INSERT INTO sr_phone_gallery (citizenid, url, label) VALUES (?, ?, ?)',
            { citizenid, url, labelVal }
        )
    end)
    if ok and id then return id end

    print(('[sr-smartphone] Gallery INSERT failed (%s): full=%s legacy=%s minimal=%s'):format(
        citizenid,
        errFull,
        errLegacy,
        (not ok) and tostring(id) or 'insert_returned_nil'
    ))
    return nil
end

local function resolveMediaType(data)
    if data and data.mediaType == 'video' then return 'video' end
    return 'photo'
end

local function buildLabel(data)
    local label = data.label
    if type(label) == 'string' and label ~= '' then return label end
    local isVideo = resolveMediaType(data) == 'video'
    local prefix
    if isVideo then
        prefix = data.isSelfie and 'Selfie video' or 'Video'
    else
        prefix = data.isSelfie and 'Selfie' or 'Photo'
    end
    return ('%s · %s'):format(prefix, os.date('%b %d, %Y %H:%M'))
end

--- Core save: optional Discord upload, then DB insert.
function SRProcessSavePhoto(source, data)
    if not Config.Camera.enabled then return { ok = false, error = 'disabled' } end
    SRPhoneAwaitDb()

    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_player' } end
    if type(data) ~= 'table' or type(data.url) ~= 'string' or data.url == '' then
        return { ok = false, error = 'invalid' }
    end

    local payload = data.url
    if #payload > MAX_PAYLOAD_BYTES then
        return { ok = false, error = 'too_large' }
    end

    local mediaType = resolveMediaType(data)
    local isVideo = mediaType == 'video'

    local isDataURL = payload:sub(1, 11) == 'data:image/' or payload:sub(1, 11) == 'data:video/'
    local isHttpURL = payload:sub(1, 5) == 'https' or payload:sub(1, 4) == 'http'
    if not (isDataURL or isHttpURL) then
        return { ok = false, error = 'invalid_url' }
    end

    if isVideo and isDataURL and SRCameraUpload.resolveMethod() == 'local' then
        return { ok = false, error = 'video_requires_host' }
    end

    local count = MySQL.scalar.await(
        'SELECT COUNT(*) FROM sr_phone_gallery WHERE citizenid = ?',
        { citizenid }
    ) or 0
    if count >= (Config.Camera.maxPhotos or 50) then
        return { ok = false, error = 'gallery_full' }
    end

    local label = buildLabel(data)
    local finalUrl = payload
    local method = SRCameraUpload.resolveMethod()

    if isDataURL and method == 'discord' and SRCameraDiscord.webhookUrl() then
        local cdnUrl, err = SRCameraDiscord.uploadDataURL(payload, label, ('photo_%s'):format(citizenid))
        if cdnUrl then
            finalUrl = cdnUrl
            if Config.Debug then
                print(('[sr-smartphone] Photo uploaded to Discord: %s'):format(cdnUrl))
            end
        else
            print(('[sr-smartphone] Discord upload failed (%s); saving data URL fallback'):format(err or '?'))
        end
    elseif isHttpURL and method == 'fivemanage' and Config.Camera.discordMirror and SRCameraDiscord.webhookUrl() then
        local name = GetPlayerName(source)
        SRCameraDiscord.mirrorPhotoLink(label, payload, name)
    end

    local id = insertGalleryRow(citizenid, finalUrl, label, data.isSelfie == true, mediaType)
    if not id then
        return { ok = false, error = 'insert_failed' }
    end

    if Config.Debug then
        print(('[sr-smartphone] Gallery saved id=%s citizenid=%s url=%s'):format(
            tostring(id),
            citizenid,
            finalUrl:sub(1, 80)
        ))
    end

    return { ok = true, id = id, url = finalUrl, mediaType = mediaType }
end

--- Import an image from an HTTP(S) link into the gallery (works even if camera app is disabled).
function SRImportGalleryPhoto(source, data)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false, error = 'no_player' } end
    if type(data) ~= 'table' or type(data.url) ~= 'string' then
        return { ok = false, error = 'invalid' }
    end

    local url = data.url:match('^%s*(.-)%s*$') or ''
    if url == '' or #url > 2048 then
        return { ok = false, error = 'invalid' }
    end

    local isHttpURL = url:sub(1, 5) == 'https' or url:sub(1, 4) == 'http'
    if not isHttpURL then
        return { ok = false, error = 'invalid_url' }
    end

    local count = MySQL.scalar.await(
        'SELECT COUNT(*) FROM sr_phone_gallery WHERE citizenid = ?',
        { citizenid }
    ) or 0
    if count >= (Config.Camera.maxPhotos or 50) then
        return { ok = false, error = 'gallery_full' }
    end

    local label = type(data.label) == 'string' and data.label:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if label == '' then
        label = ('Imported · %s'):format(os.date('%b %d, %Y %H:%M'))
    end
    if #label > 64 then label = label:sub(1, 64) end

    if Config.Camera.discordMirror and SRCameraDiscord.webhookUrl() then
        local name = GetPlayerName(source)
        SRCameraDiscord.mirrorPhotoLink(label, url, name)
    end

    local id = insertGalleryRow(citizenid, url, label, false, 'photo')
    if not id then
        return { ok = false, error = 'insert_failed' }
    end

    return { ok = true, id = id, url = url, label = label }
end

--- Gallery list (registered here so getGallery exists even if gallery.lua fails to load on the server).
local function galleryMaxPhotos()
    return (Config.Camera and Config.Camera.maxPhotos) or 50
end

local function fetchGalleryPhotos(citizenid, limit)
    local ok, photos = pcall(function()
        return MySQL.query.await([[
            SELECT id, url, label, created_at,
                   COALESCE(is_favorite, 0) AS is_favorite,
                   COALESCE(is_selfie, 0) AS is_selfie,
                   COALESCE(media_type, 'photo') AS media_type,
                   album_id
            FROM sr_phone_gallery
            WHERE citizenid = ?
            ORDER BY id DESC
            LIMIT ?
        ]], { citizenid, limit })
    end)

    if ok and type(photos) == 'table' then
        return photos
    end

    ok, photos = pcall(function()
        return MySQL.query.await([[
            SELECT id, url, label, created_at
            FROM sr_phone_gallery
            WHERE citizenid = ?
            ORDER BY id DESC
            LIMIT ?
        ]], { citizenid, limit })
    end)

    if not ok or type(photos) ~= 'table' then
        print(('[sr-smartphone] fetchGalleryPhotos failed (%s): %s'):format(citizenid, tostring(photos)))
        return {}
    end

    for i = 1, #photos do
        photos[i].is_favorite = 0
        photos[i].is_selfie = 0
        photos[i].media_type = 'photo'
        photos[i].album_id = nil
    end

    return photos
end

lib.callback.register('sr-smartphone:server:getGallery', function(source)
    SRPhoneAwaitDb()
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then
        return { photos = {}, albums = {}, unsortedCount = 0, maxPhotos = galleryMaxPhotos() }
    end

    local photos = fetchGalleryPhotos(citizenid, galleryMaxPhotos())

    local albums = {}
    local okAlbums, albumRows = pcall(function()
        return MySQL.query.await([[
            SELECT a.id, a.name, a.created_at,
                   (SELECT COUNT(*) FROM sr_phone_gallery g WHERE g.album_id = a.id AND g.citizenid = a.citizenid) AS photo_count
            FROM sr_phone_gallery_albums a
            WHERE a.citizenid = ?
            ORDER BY a.name ASC
        ]], { citizenid })
    end)
    if okAlbums and type(albumRows) == 'table' then
        albums = albumRows
    end

    local unsorted = 0
    local okCount, countVal = pcall(function()
        return MySQL.scalar.await(
            'SELECT COUNT(*) FROM sr_phone_gallery WHERE citizenid = ? AND (album_id IS NULL OR album_id = 0)',
            { citizenid }
        )
    end)
    if okCount then
        unsorted = countVal or 0
    end

    return {
        photos = photos,
        albums = albums,
        unsortedCount = unsorted,
        maxPhotos = galleryMaxPhotos(),
    }
end)

lib.callback.register('sr-smartphone:server:savePhoto', function(source, data)
    return SRProcessSavePhoto(source, data)
end)

lib.callback.register('sr-smartphone:server:importGalleryPhoto', function(source, data)
    return SRImportGalleryPhoto(source, data)
end)

--- Chunked transfer for large data URLs (ox_lib callback size limit).
RegisterNetEvent('sr-smartphone:server:photoChunk', function(reqId, index, total, chunk, isSelfie, label)
    local src = source
    if type(reqId) ~= 'string' or type(chunk) ~= 'string' or type(index) ~= 'number' or type(total) ~= 'number' then
        return
    end
    if total < 1 or total > 200 or index < 1 or index > total or #chunk > CHUNK_SIZE + 1000 then
        return
    end

    local session = pendingChunks[reqId]
    if not session then
        session = {
            src = src,
            total = total,
            parts = {},
            isSelfie = isSelfie == true,
            label = type(label) == 'string' and label or '',
        }
        pendingChunks[reqId] = session
    elseif session.src ~= src or session.total ~= total then
        return
    end

    session.parts[index] = chunk

    local received = 0
    for i = 1, total do
        if session.parts[i] then received = received + 1 end
    end
    if received < total then return end

    pendingChunks[reqId] = nil

    local buf = {}
    for i = 1, total do
        buf[i] = session.parts[i]
    end
    local dataUrl = table.concat(buf)
    local saveData = {
        url = dataUrl,
        isSelfie = session.isSelfie,
        label = session.label,
    }

    CreateThread(function()
        local result = SRProcessSavePhoto(src, saveData)
        TriggerClientEvent('sr-smartphone:client:photoSaveResult', src, reqId, result)
    end)
end)

local function logWebhookResult(context, status, body)
    local code = tonumber(status) or 0
    if code == 204 or code == 200 then
        print(('[sr-smartphone] %s OK — check your Discord webhook channel.'):format(context))
        return true
    end
    if code == 0 then
        print(('[sr-smartphone] %s FAILED: no HTTP response (status=0). Check server outbound HTTPS.'):format(context))
    else
        print(('[sr-smartphone] %s FAILED: HTTP %s — %s'):format(context, code, tostring(body):sub(1, 300)))
    end
    return false
end

local function runWebhookTest(requester)
    if not SRCameraDiscord.webhookUrl() then
        print('[sr-smartphone] No Discord webhook configured.')
        if requester and requester ~= 0 then
            TriggerClientEvent('sr-smartphone:client:webhookTestResult', requester, false, 'no_webhook')
        end
        return
    end

    SRCameraDiscord.sendTestMessage(function(status, body)
        local ok = logWebhookResult('Webhook test', status, body)
        if requester and requester ~= 0 then
            TriggerClientEvent('sr-smartphone:client:webhookTestResult', requester, ok, ok and 'ok' or ('http_%s'):format(status or 0))
        end
    end)
end

RegisterCommand('srphone:testwebhook', function(src)
    if src ~= 0 then
        print('[sr-smartphone] Run in SERVER console (txAdmin), or use /srphone_testwebhook in-game.')
        return
    end
    runWebhookTest(0)
end, true)

RegisterNetEvent('sr-smartphone:server:requestWebhookTest', function()
    local src = source
    if src == 0 then return end
    if not IsPlayerAceAllowed(src, 'command.srphone:testwebhook') and not IsPlayerAceAllowed(src, 'group.admin') then
        TriggerClientEvent('sr-smartphone:client:webhookTestResult', src, false, 'no_permission')
        return
    end
    runWebhookTest(src)
end)

CreateThread(function()
    Wait(2000)
    local method = SRCameraUpload.resolveMethod()
    print(('[sr-smartphone] Camera upload method: %s'):format(method))
    if method == 'fivemanage' then
        print('[sr-smartphone]   Fivemanage key loaded (setr sr_phone_fivemanage_key)')
    elseif method == 'discord' then
        print('[sr-smartphone]   Discord webhook loaded (setr sr_phone_camera_webhook)')
    else
        print('[sr-smartphone]   No host configured — photos save as data URLs in DB')
    end
end)
