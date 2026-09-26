--- Camera upload method resolution (shared).

SRCameraUpload = SRCameraUpload or {}

--- @param fileType? 'image'|'video'
function SRCameraUpload.fivemanageKey(fileType)
    fileType = fileType == 'video' and 'video' or 'image'
    local fm = Config.Camera and Config.Camera.fivemanage

    if fileType == 'video' then
        local videoConvar = GetConvar('sr_phone_fivemanage_video_key', '')
        if videoConvar ~= '' then return videoConvar end
        if fm and type(fm.videoApiKey) == 'string' and fm.videoApiKey ~= '' then
            return fm.videoApiKey
        end
    else
        local imageConvar = GetConvar('sr_phone_fivemanage_image_key', '')
        if imageConvar ~= '' then return imageConvar end
        if fm and type(fm.imageApiKey) == 'string' and fm.imageApiKey ~= '' then
            return fm.imageApiKey
        end
    end

    local legacy = GetConvar('sr_phone_fivemanage_key', '')
    if legacy ~= '' then return legacy end
    if fm and type(fm.apiKey) == 'string' and fm.apiKey ~= '' then
        return fm.apiKey
    end
    return nil
end

function SRCameraUpload.fivemanageApiVersion()
    local fm = Config.Camera and Config.Camera.fivemanage
    local version = fm and fm.apiVersion
    if version == 'v3' then return 'v3' end
    return 'v2'
end

--- @return 'fivemanage'|'discord'|'local'
function SRCameraUpload.resolveMethod()
    local pref = (Config.Camera and Config.Camera.uploadMethod) or 'auto'

    if pref == 'fivemanage' then
        return 'fivemanage'
    end
    if pref == 'discord' then
        return (SRCameraDiscord and SRCameraDiscord.webhookUrl()) and 'discord' or 'local'
    end
    if pref == 'local' then
        return 'local'
    end

    -- auto: Fivemanage first (lb-phone default), then Discord, then DB data URL
    if SRCameraUpload.fivemanageKey('image') then return 'fivemanage' end
    if SRCameraDiscord and SRCameraDiscord.webhookUrl() then return 'discord' end
    return 'local'
end
