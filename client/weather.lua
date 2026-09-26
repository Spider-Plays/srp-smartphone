local WEATHER_TYPES = {
    'BLIZZARD', 'CLEAR', 'CLEARING', 'CLOUDS', 'EXTRASUNNY', 'FOGGY', 'NEUTRAL',
    'OVERCAST', 'RAIN', 'SMOG', 'SNOW', 'SNOWLIGHT', 'THUNDER', 'XMAS',
}

local WEATHER_HASH = {}
for i = 1, #WEATHER_TYPES do
    WEATHER_HASH[joaat(WEATHER_TYPES[i])] = WEATHER_TYPES[i]
end

local WEATHER_META = {
    BLIZZARD = { label = 'Blizzard', temp = 28, humidity = 72, visibility = 2 },
    CLEAR = { label = 'Clear', temp = 78, humidity = 38, visibility = 10 },
    CLEARING = { label = 'Clearing', temp = 72, humidity = 48, visibility = 8 },
    CLOUDS = { label = 'Cloudy', temp = 70, humidity = 52, visibility = 9 },
    EXTRASUNNY = { label = 'Sunny', temp = 86, humidity = 32, visibility = 10 },
    FOGGY = { label = 'Foggy', temp = 62, humidity = 88, visibility = 3 },
    NEUTRAL = { label = 'Mild', temp = 74, humidity = 45, visibility = 9 },
    OVERCAST = { label = 'Overcast', temp = 66, humidity = 58, visibility = 7 },
    RAIN = { label = 'Rain', temp = 61, humidity = 82, visibility = 5 },
    SMOG = { label = 'Smog', temp = 76, humidity = 44, visibility = 4 },
    SNOW = { label = 'Snow', temp = 34, humidity = 70, visibility = 5 },
    SNOWLIGHT = { label = 'Light Snow', temp = 38, humidity = 68, visibility = 6 },
    THUNDER = { label = 'Thunderstorm', temp = 58, humidity = 90, visibility = 4 },
    XMAS = { label = 'Holiday Snow', temp = 32, humidity = 72, visibility = 6 },
}

local FORECAST_CHAIN = {
    EXTRASUNNY = { 'CLEAR', 'CLOUDS', 'EXTRASUNNY', 'CLEAR' },
    CLEAR = { 'CLEAR', 'CLOUDS', 'CLEAR', 'EXTRASUNNY' },
    CLOUDS = { 'CLOUDS', 'OVERCAST', 'CLOUDS', 'CLEAR' },
    OVERCAST = { 'OVERCAST', 'RAIN', 'CLOUDS', 'OVERCAST' },
    RAIN = { 'RAIN', 'RAIN', 'CLEARING', 'CLOUDS' },
    CLEARING = { 'CLEARING', 'CLEAR', 'EXTRASUNNY', 'CLEAR' },
    THUNDER = { 'THUNDER', 'RAIN', 'CLOUDS', 'OVERCAST' },
    FOGGY = { 'FOGGY', 'CLOUDS', 'CLEAR', 'FOGGY' },
    SMOG = { 'SMOG', 'SMOG', 'CLOUDS', 'CLEAR' },
    SNOW = { 'SNOW', 'SNOWLIGHT', 'OVERCAST', 'SNOW' },
    SNOWLIGHT = { 'SNOWLIGHT', 'CLOUDS', 'CLEAR', 'SNOWLIGHT' },
    BLIZZARD = { 'BLIZZARD', 'SNOW', 'OVERCAST', 'BLIZZARD' },
    XMAS = { 'XMAS', 'SNOWLIGHT', 'CLEAR', 'XMAS' },
    NEUTRAL = { 'NEUTRAL', 'CLOUDS', 'CLEAR', 'NEUTRAL' },
}

local DAY_NAMES = { 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' }

local function normalizeWeatherType(value)
    if type(value) ~= 'string' or value == '' then
        return 'CLEAR'
    end

    return value:upper()
end

local function weatherFromNative()
    local hash = GetPrevWeatherTypeHashName()
    return WEATHER_HASH[hash] or 'CLEAR'
end

local function getSyncedWeather()
    local state = GlobalState.weather
    if type(state) == 'table' and state.weather then
        return normalizeWeatherType(state.weather), state
    end

    return weatherFromNative(), nil
end

local function getSyncedTime()
    local state = GlobalState.currentTime
    if type(state) == 'table' and state.hour then
        return {
            hour = tonumber(state.hour) or 12,
            minute = tonumber(state.minute) or 0,
        }
    end

    return {
        hour = GetClockHours(),
        minute = GetClockMinutes(),
    }
end

local function isNightHour(hour)
    return hour < 6 or hour >= 20
end

local function tempForWeather(weatherType, hour)
    local meta = WEATHER_META[weatherType] or WEATHER_META.CLEAR
    local temp = meta.temp

    if isNightHour(hour) then
        temp = temp - 14
    elseif hour >= 12 and hour <= 16 then
        temp = temp + 4
    end

    return math.floor(temp + 0.5)
end

local function feelsLike(temp, humidity, windMph)
    local heatIndex = temp + (humidity > 55 and (humidity - 55) * 0.08 or 0)
    local windChill = temp - (windMph > 8 and (windMph - 8) * 0.35 or 0)
    return math.floor((heatIndex + windChill) / 2 + 0.5)
end

local function formatHourLabel(hour)
    local h = hour % 24
    if h == 0 then return '12 AM' end
    if h == 12 then return '12 PM' end
    if h < 12 then return ('%d AM'):format(h) end
    return ('%d PM'):format(h - 12)
end

local function getLocation()
    local cfg = Config.Weather or {}
    local city = cfg.cityName or 'Los Santos'
    local county = cfg.countyName or 'San Andreas'

    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local zone = GetNameOfZone(coords.x, coords.y, coords.z)
    local zoneLabel = GetLabelText(zone)

    if not zoneLabel or zoneLabel == '' or zoneLabel == 'NULL' then
        zoneLabel = zone:gsub('_', ' ')
    end

    return {
        city = city,
        county = county,
        zone = zoneLabel,
        display = ('%s, %s'):format(zoneLabel, city),
    }
end

local function nextInChain(chain, index)
    return chain[((index - 1) % #chain) + 1]
end

local function buildHourly(currentType, hour)
    local chain = FORECAST_CHAIN[currentType] or FORECAST_CHAIN.CLEAR
    local hourly = {}

    for i = 0, 7 do
        local slotHour = (hour + i) % 24
        local condition = nextInChain(chain, i + 1)
        local meta = WEATHER_META[condition] or WEATHER_META.CLEAR

        hourly[#hourly + 1] = {
            hour = slotHour,
            label = i == 0 and 'Now' or formatHourLabel(slotHour),
            condition = condition,
            conditionLabel = meta.label,
            temperature = tempForWeather(condition, slotHour),
        }
    end

    return hourly
end

local function buildDaily(currentType, gameTime)
    local chain = FORECAST_CHAIN[currentType] or FORECAST_CHAIN.CLEAR
    local daily = {}
    local dayIndex = (gameTime.month or 0) * 31 + (gameTime.day or 1)

    for i = 0, 4 do
        local condition = nextInChain(chain, i + 2)
        local meta = WEATHER_META[condition] or WEATHER_META.CLEAR
        local high = meta.temp + (i % 2)
        local low = high - (8 + ((dayIndex + i * 3) % 7))

        daily[#daily + 1] = {
            dayOffset = i,
            label = i == 0 and 'Today' or DAY_NAMES[((dayIndex + i) % 7) + 1],
            condition = condition,
            conditionLabel = meta.label,
            high = high,
            low = low,
        }
    end

    return daily
end

local function buildWeatherPayload()
    local weatherType, weatherState = getSyncedWeather()
    local gameTime = getSyncedTime()
    local meta = WEATHER_META[weatherType] or WEATHER_META.CLEAR
    local hour = gameTime.hour

    local windSpeed = 6.0
    local windDirection = 180.0

    if weatherState then
        if weatherState.windSpeed then
            windSpeed = math.floor((tonumber(weatherState.windSpeed) or 0.2) * 14 + 4.5)
        end
        if weatherState.windDirection then
            windDirection = tonumber(weatherState.windDirection) or windDirection
        end
    end

    windSpeed = math.floor(windSpeed + 0.5)
    local temperature = tempForWeather(weatherType, hour)
    local humidity = meta.humidity
    local visibility = meta.visibility

    return {
        condition = weatherType,
        conditionLabel = meta.label,
        temperature = temperature,
        feelsLike = feelsLike(temperature, humidity, windSpeed),
        humidity = humidity,
        windSpeed = windSpeed,
        windDirection = windDirection,
        visibility = visibility,
        isNight = isNightHour(hour),
        hasSnow = weatherState and weatherState.hasSnow or false,
        blackout = GlobalState.blackOut == true,
        location = getLocation(),
        gameTime = {
            hour = hour,
            minute = gameTime.minute,
            day = GetClockDayOfMonth(),
            month = GetClockMonth(),
            label = formatHourLabel(hour),
        },
        hourly = buildHourly(weatherType, hour),
        daily = buildDaily(weatherType, {
            day = GetClockDayOfMonth(),
            month = GetClockMonth(),
        }),
        updatedAt = GetGameTimer(),
    }
end

RegisterNUICallback('getWeatherData', function(_, cb)
    cb(buildWeatherPayload())
end)
