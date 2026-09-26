import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Eye,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react'
import AppScreen from '../../components/AppScreen'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import { buildDevWeatherData } from '../../dev/devWeather'

const isBrowserDev = typeof window !== 'undefined' && typeof window.invokeNative !== 'function'

const CONDITION_META = {
  EXTRASUNNY: { label: 'Sunny', theme: 'sunny', Icon: Sun },
  CLEAR: { label: 'Clear', theme: 'clear', Icon: Sun },
  CLOUDS: { label: 'Cloudy', theme: 'cloudy', Icon: Cloud },
  OVERCAST: { label: 'Overcast', theme: 'overcast', Icon: Cloud },
  RAIN: { label: 'Rain', theme: 'rain', Icon: CloudRain },
  CLEARING: { label: 'Clearing', theme: 'clearing', Icon: CloudSun },
  THUNDER: { label: 'Storm', theme: 'storm', Icon: CloudLightning },
  FOGGY: { label: 'Foggy', theme: 'fog', Icon: CloudFog },
  SMOG: { label: 'Smog', theme: 'smog', Icon: CloudFog },
  SNOW: { label: 'Snow', theme: 'snow', Icon: CloudSnow },
  SNOWLIGHT: { label: 'Light Snow', theme: 'snow', Icon: CloudSnow },
  BLIZZARD: { label: 'Blizzard', theme: 'blizzard', Icon: CloudSnow },
  XMAS: { label: 'Snow', theme: 'snow', Icon: CloudSnow },
  NEUTRAL: { label: 'Mild', theme: 'clear', Icon: CloudSun },
}

function getConditionMeta(condition) {
  return CONDITION_META[condition] || CONDITION_META.CLEAR
}

function WeatherIcon({ condition, size = 72, className = '' }) {
  const { Icon } = getConditionMeta(condition)
  return (
    <motion.div
      className={`weather-hero-icon ${className}`.trim()}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Icon size={size} strokeWidth={1.5} />
    </motion.div>
  )
}

function WindCompass({ direction = 0, speed = 0 }) {
  return (
    <div className="weather-compass" aria-hidden>
      <div className="weather-compass-ring">
        <span className="weather-compass-n">N</span>
        <div className="weather-compass-arrow" style={{ transform: `rotate(${direction}deg)` }} />
      </div>
      <span className="weather-compass-speed">{speed} mph</span>
    </div>
  )
}

function WeatherHero({ data }) {
  const meta = getConditionMeta(data.condition)
  const theme = data.isNight && meta.theme === 'sunny' ? 'night' : meta.theme

  return (
    <div className={`weather-hero weather-hero--${theme}`}>
      <div className="weather-hero-sky" />
      <div className="weather-hero-glow" />
      {(theme === 'rain' || theme === 'storm') && <div className="weather-rain-layer" aria-hidden />}
      {(theme === 'snow' || theme === 'blizzard') && <div className="weather-snow-layer" aria-hidden />}
      {theme === 'storm' && <div className="weather-lightning-flash" aria-hidden />}
      <div className="weather-hero-clouds" aria-hidden>
        <span className="weather-cloud weather-cloud--a" />
        <span className="weather-cloud weather-cloud--b" />
        <span className="weather-cloud weather-cloud--c" />
      </div>

      <div className="weather-hero-content">
        <p className="weather-location">{data.location?.display || 'Los Santos'}</p>
        <div className="weather-hero-main">
          <WeatherIcon condition={data.condition} />
          <div className="weather-hero-temp-wrap">
            <span className="weather-hero-temp">{data.temperature ?? '--'}°</span>
            <span className="weather-hero-condition">{data.conditionLabel || meta.label}</span>
            <span className="weather-hero-feels">
              Feels like {data.feelsLike ?? data.temperature ?? '--'}°
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WeatherScreen() {
  const { goBack } = usePhone()
  const [data, setData] = useState(() => (isBrowserDev ? buildDevWeatherData() : null))
  const [loading, setLoading] = useState(!isBrowserDev)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    const result = await fetchNui('getWeatherData')
    setData(result || (isBrowserDev ? buildDevWeatherData() : null))
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => load(true), 30000)
    return () => clearInterval(timer)
  }, [load])

  const themeClass = useMemo(() => {
    if (!data) return 'clear'
    const meta = getConditionMeta(data.condition)
    if (data.isNight && meta.theme === 'sunny') return 'night'
    return meta.theme
  }, [data])

  const headerRight = (
    <button
      type="button"
      className={`weather-refresh${refreshing ? ' weather-refresh--spin' : ''}`}
      onClick={() => load(true)}
      aria-label="Refresh weather"
      disabled={refreshing}
    >
      <RefreshCw size={20} />
    </button>
  )

  return (
    <AppScreen
      title="Weather"
      subtitle={data?.location?.display || 'Los Santos'}
      onBack={goBack}
      headerRight={headerRight}
      className={`weather-app weather-app--${themeClass}`}
    >
      <div className="weather-scroll">
        {loading && !data ? (
          <div className="weather-loading">
            <div className="weather-loading-pulse" />
            <p>Scanning the skies…</p>
          </div>
        ) : data ? (
          <>
            <WeatherHero data={data} />

            {data.blackout ? (
              <div className="weather-alert weather-alert--blackout">
                <CloudLightning size={18} />
                <span>Citywide power outage — street lighting may be affected.</span>
              </div>
            ) : null}

            <section className="weather-stats">
              <div className="weather-stat-card">
                <Wind size={18} />
                <span className="weather-stat-label">Wind</span>
                <span className="weather-stat-value">{data.windSpeed ?? 0} mph</span>
              </div>
              <div className="weather-stat-card">
                <Droplets size={18} />
                <span className="weather-stat-label">Humidity</span>
                <span className="weather-stat-value">{data.humidity ?? 0}%</span>
              </div>
              <div className="weather-stat-card">
                <Eye size={18} />
                <span className="weather-stat-label">Visibility</span>
                <span className="weather-stat-value">{data.visibility ?? 10} mi</span>
              </div>
            </section>

            <section className="weather-panel">
              <div className="weather-panel-head">
                <h2>Wind</h2>
              </div>
              <WindCompass direction={data.windDirection ?? 0} speed={data.windSpeed ?? 0} />
            </section>

            <section className="weather-panel">
              <div className="weather-panel-head">
                <h2>Hourly</h2>
                <span>{data.gameTime?.label}</span>
              </div>
              <div className="weather-hourly">
                {(data.hourly || []).map((slot) => {
                  const meta = getConditionMeta(slot.condition)
                  const SlotIcon = meta.Icon
                  return (
                    <div key={`${slot.hour}-${slot.label}`} className="weather-hourly-slot">
                      <span className="weather-hourly-time">{slot.label}</span>
                      <SlotIcon size={22} strokeWidth={1.75} />
                      <span className="weather-hourly-temp">{slot.temperature}°</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="weather-panel weather-panel--daily">
              <div className="weather-panel-head">
                <h2>5-Day Forecast</h2>
                <span>{data.location?.county || 'San Andreas'}</span>
              </div>
              <div className="weather-daily">
                {(data.daily || []).map((day) => {
                  const meta = getConditionMeta(day.condition)
                  const DayIcon = meta.Icon
                  return (
                    <div key={day.label} className="weather-daily-row">
                      <span className="weather-daily-day">{day.label}</span>
                      <div className="weather-daily-mid">
                        <DayIcon size={20} strokeWidth={1.75} />
                        <span>{day.conditionLabel}</span>
                      </div>
                      <div className="weather-daily-temps">
                        <span className="weather-daily-high">{day.high}°</span>
                        <span className="weather-daily-low">{day.low}°</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        ) : (
          <div className="weather-loading">
            <p>Weather data unavailable.</p>
          </div>
        )}
      </div>
    </AppScreen>
  )
}
