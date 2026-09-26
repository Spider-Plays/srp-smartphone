--- Fivemanage presigned URLs (lb-phone compatible v2 + optional v3).

local function apiVersion()
    return SRCameraUpload.fivemanageApiVersion()
end

local function requestPresignedUrlV2(apiKey, fileType)
    fileType = fileType == 'video' and 'video' or 'image'
    local p = promise.new()
    PerformHttpRequest(
        ('https://fmapi.net/api/v2/presigned-url?fileType=%s'):format(fileType),
        function(status, body)
            p:resolve({ status = status, body = body })
        end,
        'GET',
        '',
        { Authorization = apiKey }
    )
    return Citizen.Await(p)
end

local function requestPresignedUrlV3(apiKey, fileType)
    fileType = fileType == 'video' and 'video' or 'image'
    local p = promise.new()
    local url = fileType == 'video'
        and 'https://api.fivemanage.com/api/v3/file/presigned-url?fileType=video'
        or 'https://api.fivemanage.com/api/v3/file/presigned-url'
    PerformHttpRequest(
        url,
        function(status, body)
            p:resolve({ status = status, body = body })
        end,
        'GET',
        '',
        { Authorization = apiKey }
    )
    return Citizen.Await(p)
end

lib.callback.register('sr-smartphone:server:getPresignedUrl', function(_source, data)
    local fileType = type(data) == 'table' and data.fileType or 'image'
    if fileType ~= 'video' then fileType = 'image' end

    local apiKey = SRCameraUpload.fivemanageKey(fileType)
    if not apiKey then
        return { ok = false, error = 'no_api_key', fileType = fileType }
    end

    local version = apiVersion()
    local result = version == 'v3' and requestPresignedUrlV3(apiKey, fileType) or requestPresignedUrlV2(apiKey, fileType)

    if result.status ~= 200 then
        print(('[sr-smartphone] Fivemanage presigned URL failed (HTTP %s): %s'):format(
            tostring(result.status),
            tostring(result.body):sub(1, 300)
        ))
        return { ok = false, error = 'presigned_failed', status = result.status }
    end

    local ok, decoded = pcall(json.decode, result.body or '')
    if not ok or type(decoded) ~= 'table' then
        return { ok = false, error = 'presigned_decode' }
    end

    local presignedUrl = decoded.data and decoded.data.presignedUrl
    if type(presignedUrl) ~= 'string' or presignedUrl == '' then
        return { ok = false, error = 'no_presigned_url' }
    end

    return {
        ok = true,
        presignedUrl = presignedUrl,
        field = version == 'v3' and 'file' or 'image',
        fileType = fileType,
        apiVersion = version,
    }
end)

CreateThread(function()
    Wait(2500)
    if SRCameraUpload.fivemanageKey('image') then
        print(('[sr-smartphone] Fivemanage upload: image key configured (API %s)'):format(apiVersion()))
    end
    if SRCameraUpload.fivemanageKey('video') then
        print('[sr-smartphone] Fivemanage upload: video key configured')
    end
end)
