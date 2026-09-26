const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHourLabel(hour) {
  const h = hour % 24
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

/** Dev / browser preview weather payload (no FiveM natives). */
export function buildDevWeatherData() {
  const now = new Date()
  const hour = now.getHours()
  const isNight = hour < 6 || hour >= 20
  const condition = isNight ? 'CLEAR' : 'EXTRASUNNY'
  const conditionLabel = isNight ? 'Clear' : 'Sunny'
  const temperature = isNight ? 68 : 84

  const hourly = Array.from({ length: 8 }, (_, i) => {
    const slotHour = (hour + i) % 24
    const slotNight = slotHour < 6 || slotHour >= 20
    return {
      hour: slotHour,
      label: i === 0 ? 'Now' : formatHourLabel(slotHour),
      condition: slotNight ? 'CLEAR' : i % 3 === 0 ? 'CLOUDS' : 'EXTRASUNNY',
      conditionLabel: slotNight ? 'Clear' : i % 3 === 0 ? 'Cloudy' : 'Sunny',
      temperature: slotNight ? 66 + (i % 3) : 80 + (i % 4),
    }
  })

  const daily = Array.from({ length: 5 }, (_, i) => {
    const dayIndex = (now.getDay() + i) % 7
    return {
      label: i === 0 ? 'Today' : DAY_NAMES[dayIndex],
      condition: ['EXTRASUNNY', 'CLEAR', 'CLOUDS', 'RAIN', 'CLEARING'][i],
      conditionLabel: ['Sunny', 'Clear', 'Cloudy', 'Rain', 'Clearing'][i],
      high: 82 - i * 3,
      low: 64 - i * 2,
    }
  })

  return {
    condition,
    conditionLabel,
    temperature,
    feelsLike: temperature + 2,
    humidity: isNight ? 48 : 34,
    windSpeed: 8,
    windDirection: 225,
    visibility: 10,
    isNight,
    hasSnow: false,
    blackout: false,
    location: {
      city: 'Los Santos',
      county: 'San Andreas',
      zone: 'Vinewood',
      display: 'Vinewood, Los Santos',
    },
    gameTime: {
      hour,
      minute: now.getMinutes(),
      label: formatHourLabel(hour),
    },
    hourly,
    daily,
    updatedAt: now.getTime(),
  }
}
