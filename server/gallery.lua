--- Gallery photos, albums, favorites, and sharing.

print('[sr-smartphone] server/gallery.lua loaded')

local function galleryMaxPhotos()
    return (Config.Camera and Config.Camera.maxPhotos) or 50
end

local function getCitizenGalleryCount(citizenid)
    return MySQL.scalar.await(
        'SELECT COUNT(*) FROM sr_phone_gallery WHERE citizenid = ?',
        { citizenid }
    ) or 0
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

    print(('[sr-smartphone] getGallery full query failed (%s), using legacy columns: %s'):format(
        citizenid,
        tostring(photos)
    ))

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
        print(('[sr-smartphone] getGallery legacy query failed (%s): %s'):format(citizenid, tostring(photos)))
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

-- getGallery is registered in server/camera.lua (loads with savePhoto). Do not duplicate here.

lib.callback.register('sr-smartphone:server:deleteGalleryPhotos', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or type(data) ~= 'table' then return { ok = false } end

    local ids = data.ids
    if type(ids) ~= 'table' or #ids == 0 then return { ok = false } end

    local placeholders = {}
    local params = { citizenid }
    for i = 1, #ids do
        local id = tonumber(ids[i])
        if id then
            placeholders[#placeholders + 1] = '?'
            params[#params + 1] = id
        end
    end
    if #placeholders == 0 then return { ok = false } end

    local affected = MySQL.update.await(
        ('DELETE FROM sr_phone_gallery WHERE citizenid = ? AND id IN (%s)'):format(table.concat(placeholders, ',')),
        params
    )

    return { ok = true, deleted = affected or 0 }
end)

lib.callback.register('sr-smartphone:server:renameGalleryPhoto', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or type(data) ~= 'table' then return { ok = false } end

    local id = tonumber(data.id)
    local label = type(data.label) == 'string' and data.label:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if not id or label == '' then return { ok = false } end
    if #label > 64 then label = label:sub(1, 64) end

    local affected = MySQL.update.await(
        'UPDATE sr_phone_gallery SET label = ? WHERE id = ? AND citizenid = ?',
        { label, id, citizenid }
    )

    if not affected or affected < 1 then return { ok = false } end
    return { ok = true, label = label }
end)

lib.callback.register('sr-smartphone:server:toggleGalleryFavorite', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    local id = tonumber(data and data.id)
    if not citizenid or not id then return { ok = false } end

    local row = MySQL.single.await(
        'SELECT is_favorite FROM sr_phone_gallery WHERE id = ? AND citizenid = ?',
        { id, citizenid }
    )
    if not row then return { ok = false } end

    local nextVal = row.is_favorite == 1 and 0 or 1
    MySQL.update.await(
        'UPDATE sr_phone_gallery SET is_favorite = ? WHERE id = ? AND citizenid = ?',
        { nextVal, id, citizenid }
    )
    return { ok = true, is_favorite = nextVal == 1 }
end)

lib.callback.register('sr-smartphone:server:createGalleryAlbum', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid then return { ok = false } end

    local name = type(data.name) == 'string' and data.name:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if name == '' then return { ok = false, error = 'invalid' } end
    if #name > 48 then name = name:sub(1, 48) end

    local id = MySQL.insert.await(
        'INSERT INTO sr_phone_gallery_albums (citizenid, name) VALUES (?, ?)',
        { citizenid, name }
    )
    if not id then return { ok = false } end
    return { ok = true, id = id, name = name, photo_count = 0 }
end)

lib.callback.register('sr-smartphone:server:renameGalleryAlbum', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    local id = tonumber(data and data.id)
    local name = type(data and data.name) == 'string' and data.name:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if not citizenid or not id or name == '' then return { ok = false } end
    if #name > 48 then name = name:sub(1, 48) end

    local affected = MySQL.update.await(
        'UPDATE sr_phone_gallery_albums SET name = ? WHERE id = ? AND citizenid = ?',
        { name, id, citizenid }
    )
    if not affected or affected < 1 then return { ok = false } end
    return { ok = true, name = name }
end)

lib.callback.register('sr-smartphone:server:deleteGalleryAlbum', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    local id = tonumber(data and data.id)
    if not citizenid or not id then return { ok = false } end

    MySQL.update.await(
        'UPDATE sr_phone_gallery SET album_id = NULL WHERE album_id = ? AND citizenid = ?',
        { id, citizenid }
    )
    MySQL.update.await(
        'DELETE FROM sr_phone_gallery_albums WHERE id = ? AND citizenid = ?',
        { id, citizenid }
    )
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:moveGalleryPhotos', function(source, data)
    local citizenid = SRBridge.GetCitizenId(source)
    if not citizenid or type(data) ~= 'table' then return { ok = false } end

    local ids = data.ids
    if type(ids) ~= 'table' or #ids == 0 then return { ok = false } end

    local albumId = data.albumId
    if albumId == 0 or albumId == 'none' or albumId == '' then
        albumId = nil
    else
        albumId = tonumber(albumId)
        if albumId then
            local exists = MySQL.scalar.await(
                'SELECT id FROM sr_phone_gallery_albums WHERE id = ? AND citizenid = ?',
                { albumId, citizenid }
            )
            if not exists then return { ok = false, error = 'album_not_found' } end
        end
    end

    local placeholders = {}
    local params = { albumId, citizenid }
    for i = 1, #ids do
        local id = tonumber(ids[i])
        if id then
            placeholders[#placeholders + 1] = '?'
            params[#params + 1] = id
        end
    end
    if #placeholders == 0 then return { ok = false } end

    MySQL.update.await(
        ('UPDATE sr_phone_gallery SET album_id = ? WHERE citizenid = ? AND id IN (%s)'):format(table.concat(placeholders, ',')),
        params
    )
    return { ok = true }
end)

lib.callback.register('sr-smartphone:server:shareGalleryPhoto', function(source, data)
    if not SRCheckRate(source, 'sendMessage', (Config.RateLimit and Config.RateLimit.sendMessage) or 30) then
        return { ok = false, error = 'rate_limit' }
    end

    local citizenid = SRBridge.GetCitizenId(source)
    local myPhone = SRBridge.GetPhoneNumber(source)
    if not citizenid or not myPhone or type(data) ~= 'table' then
        return { ok = false, error = 'invalid' }
    end

    local photoId = tonumber(data.photoId)
    local targetPhone = type(data.phone) == 'string' and data.phone:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if not photoId or targetPhone == '' then return { ok = false, error = 'invalid' } end

    local photo = MySQL.single.await(
        'SELECT url, label FROM sr_phone_gallery WHERE id = ? AND citizenid = ?',
        { photoId, citizenid }
    )
    if not photo or not photo.url then return { ok = false, error = 'not_found' } end

    local label = photo.label or 'Photo'
    local message = type(data.message) == 'string' and data.message:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if message == '' then
        message = ('Shared a photo: %s'):format(label:sub(1, 40))
    end
    if #message > (Config.Messages and Config.Messages.maxLength or 500) then
        message = message:sub(1, Config.Messages.maxLength or 500)
    end

    return SRSendPhoneMessage(source, {
        phone = targetPhone,
        message = message,
        image = photo.url,
    })
end)

print('[sr-smartphone] Gallery callbacks registered (getGallery, albums, share, …)')
