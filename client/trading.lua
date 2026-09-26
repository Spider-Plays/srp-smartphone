--- In-game clock for Trade app (GTA world time)
local function getGameTime()
    return {
        hour = GetClockHours(),
        minute = GetClockMinutes(),
        day = GetClockDayOfMonth(),
        month = GetClockMonth(),
        dayKey = GetClockMonth() * 100 + GetClockDayOfMonth(),
    }
end

function SRTradingGetGameTime()
    return getGameTime()
end

function SRTradingWithGameTime(data)
    data = data or {}
    if type(data) == 'table' then
        data.gameTime = getGameTime()
    end
    return data
end
