--- Discord webhook uploads (server only — PerformHttpRequest does not exist on client).

local DISCORD_MAX_BYTES = 8 * 1024 * 1024 - 1024
local HTTP_TIMEOUT_MS = 15000

local BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local b64idx = {}
for i = 1, #BASE64_ALPHABET do
    b64idx[BASE64_ALPHABET:byte(i)] = i - 1
end

local function base64Decode(data)
    data = data:gsub('[^' .. BASE64_ALPHABET .. '=]', '')
    local out, oi = {}, 0
    local len = #data

    for i = 1, len, 4 do
        local a = b64idx[data:byte(i)]     or 0
        local b = b64idx[data:byte(i + 1)] or 0
        local c = b64idx[data:byte(i + 2)] or 0
        local d = b64idx[data:byte(i + 3)] or 0
        local n = (a << 18) | (b << 12) | (c << 6) | d

        oi = oi + 1; out[oi] = string.char((n >> 16) & 0xFF)
        if data:sub(i + 2, i + 2) ~= '=' then
            oi = oi + 1; out[oi] = string.char((n >> 8) & 0xFF)
        end
        if data:sub(i + 3, i + 3) ~= '=' then
            oi = oi + 1; out[oi] = string.char(n & 0xFF)
        end
    end

    return table.concat(out)
end

local function parseDataURL(dataURL)
    if type(dataURL) ~= 'string' then return nil end
    local mime, b64 = dataURL:match('^data:([%w%+%-%./]+);base64,(.+)$')
    if not mime or not b64 then return nil end
    return mime, base64Decode(b64)
end

local function mimeToExt(mime)
    if mime:find('webp', 1, true) then return 'webp' end
    if mime:find('png',  1, true) then return 'png'  end
    if mime:find('jpeg', 1, true) then return 'jpg'  end
    if mime:find('jpg',  1, true) then return 'jpg'  end
    return 'jpg'
end

local function buildPayloadJson(label, filename)
    local payload = {
        username = (Config.Camera and Config.Camera.discordUsername) or 'SR Phone',
        content  = label or '',
        attachments = { { id = 0, filename = filename, description = label or 'Phone photo' } },
    }
    local avatar = Config.Camera and Config.Camera.discordAvatar
    if type(avatar) == 'string' and avatar ~= '' then
        payload.avatar_url = avatar
    end
    return json.encode(payload)
end

local function buildMultipartBody(boundary, payloadJson, binary, filename, mime)
    local CRLF = '\r\n'
    return table.concat({
        '--' .. boundary,
        'Content-Disposition: form-data; name="payload_json"',
        'Content-Type: application/json',
        '',
        payloadJson,
        '--' .. boundary,
        ('Content-Disposition: form-data; name="files[0]"; filename="%s"'):format(filename),
        'Content-Type: ' .. mime,
        '',
        binary,
        '--' .. boundary .. '--',
        '',
    }, CRLF)
end

local function extractCdnUrl(response)
    local ok, decoded = pcall(json.decode, response or '')
    if not ok or type(decoded) ~= 'table' then return nil end

    local attachments = decoded.attachments
    if type(attachments) ~= 'table' or #attachments == 0 then return nil end

    local cdnUrl = attachments[1].url or attachments[1].proxy_url
    if type(cdnUrl) ~= 'string' or cdnUrl == '' then return nil end
    return cdnUrl
end

--- Post a gallery link to Discord (mirror when using Fivemanage storage).
function SRCameraDiscord.mirrorPhotoLink(label, imageUrl, playerName)
    local hook = SRCameraDiscord.webhookUrl()
    if not hook or type(imageUrl) ~= 'string' or imageUrl == '' then return end

    local payload = json.encode({
        username = (Config.Camera and Config.Camera.discordUsername) or 'SR Phone',
        embeds = { {
            title = label or 'Phone photo',
            description = playerName and ('Uploaded by **%s**'):format(playerName) or nil,
            image = { url = imageUrl },
            color = 5763719,
        } },
    })

    PerformHttpRequest(hook, function() end, 'POST', payload, { ['Content-Type'] = 'application/json' })
end

function SRCameraDiscord.sendTestMessage(callback)
    local hook = SRCameraDiscord.webhookUrl()
    if not hook then
        if callback then callback(0, 'no_webhook') end
        return false
    end

    local payload = json.encode({
        username = (Config.Camera and Config.Camera.discordUsername) or 'SR Phone',
        embeds = { {
            title = 'SR Phone — webhook test',
            description = ('Test from **sr-smartphone** @ %s'):format(os.date('%Y-%m-%d %H:%M:%S')),
            color = 5763719,
        } },
    })

    PerformHttpRequest(hook, function(status, response)
        if callback then callback(status, response) end
    end, 'POST', payload, { ['Content-Type'] = 'application/json' })

    return true
end

function SRCameraDiscord.upload(binary, mime, filename, label)
    local hook = SRCameraDiscord.webhookUrl()
    if not hook then return nil, 'no_webhook' end
    if type(binary) ~= 'string' or #binary == 0 then return nil, 'empty' end
    if #binary > DISCORD_MAX_BYTES then return nil, 'too_large' end

    local boundary = ('----srphone%d%d'):format(math.random(100000, 999999), os.time())
    local payloadJson = buildPayloadJson(label, filename)
    local body = buildMultipartBody(boundary, payloadJson, binary, filename, mime)

    local p = promise.new()
    local resolved = false
    local function finish(value)
        if resolved then return end
        resolved = true
        p:resolve(value)
    end

    SetTimeout(HTTP_TIMEOUT_MS, function()
        finish({ status = 0, response = nil })
    end)

    PerformHttpRequest(hook .. '?wait=true', function(status, response)
        finish({ status = status, response = response })
    end, 'POST', body, {
        ['Content-Type'] = 'multipart/form-data; boundary=' .. boundary,
        ['User-Agent']   = 'sr-smartphone (FiveM)',
    })

    local result = Citizen.Await(p)
    if result.status ~= 200 then
        print(('[sr-smartphone] Discord upload HTTP %s: %s'):format(
            tostring(result.status),
            tostring(result.response):sub(1, 300)
        ))
        return nil, ('http_%s'):format(result.status or 'err')
    end

    local cdnUrl = extractCdnUrl(result.response)
    if not cdnUrl then return nil, 'no_attachment' end
    return cdnUrl
end

function SRCameraDiscord.uploadDataURL(dataURL, label, filenamePrefix)
    local mime, binary = parseDataURL(dataURL)
    if not mime or not binary or #binary == 0 then
        return nil, 'decode_failed'
    end
    local ext = mimeToExt(mime)
    local filename = ('%s_%d.%s'):format(filenamePrefix or 'photo', os.time(), ext)
    return SRCameraDiscord.upload(binary, mime, filename, label)
end
