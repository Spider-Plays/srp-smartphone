--- Webhook URL resolution (shared). HTTP uploads live in server/camera_discord.lua
--- because PerformHttpRequest is server-only in FiveM.

SRCameraDiscord = SRCameraDiscord or {}

function SRCameraDiscord.webhookUrl()
    local convar = GetConvar('sr_phone_camera_webhook', '')
    if convar and convar ~= '' then return convar end
    local cfg = (Config.Camera and Config.Camera.discordWebhook) or ''
    if cfg ~= '' then return cfg end
    return nil
end
