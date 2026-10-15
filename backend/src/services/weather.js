const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const MAX_FORECAST_DAYS_AHEAD = 15

const weatherConditions = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Rime fog'],
  [51, 'Light drizzle'],
  [53, 'Drizzle'],
  [55, 'Heavy drizzle'],
  [56, 'Light freezing drizzle'],
  [57, 'Freezing drizzle'],
  [61, 'Light rain'],
  [63, 'Rain'],
  [65, 'Heavy rain'],
  [66, 'Light freezing rain'],
  [67, 'Freezing rain'],
  [71, 'Light snow'],
  [73, 'Snow'],
  [75, 'Heavy snow'],
  [77, 'Snow grains'],
  [80, 'Light rain showers'],
  [81, 'Rain showers'],
  [82, 'Heavy rain showers'],
  [85, 'Light snow showers'],
  [86, 'Heavy snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with light hail'],
  [99, 'Thunderstorm with heavy hail'],
])

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function daysBetween(start, end) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000)
}

export function conditionForWeatherCode(code) {
  return weatherConditions.get(code) || 'Unknown conditions'
}

export async function getWeatherForEntry(
  { entryDate, latitude, longitude },
  { fetchImpl = fetch, now = new Date() } = {},
) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const requestedDate = dateKey(entryDate)
  const today = dateKey(now)
  const daysAhead = daysBetween(today, requestedDate)

  if (daysAhead > MAX_FORECAST_DAYS_AHEAD) return null

  const endpoint = daysAhead >= 0 ? FORECAST_URL : ARCHIVE_URL
  const parameters = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: requestedDate,
    end_date: requestedDate,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetchImpl(`${endpoint}?${parameters}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`Weather service responded with ${response.status}.`)

    const data = await response.json()
    const index = data.daily?.time?.indexOf(requestedDate) ?? -1
    if (index < 0) return null

    const code = data.daily.weather_code?.[index]
    const temperatureMax = data.daily.temperature_2m_max?.[index]
    const temperatureMin = data.daily.temperature_2m_min?.[index]
    const precipitation = data.daily.precipitation_sum?.[index]

    if (![code, temperatureMax, temperatureMin, precipitation].every(Number.isFinite)) {
      return null
    }

    return {
      code,
      condition: conditionForWeatherCode(code),
      temperatureMax,
      temperatureMin,
      precipitation,
      fetchedAt: new Date(),
      source: 'Open-Meteo',
    }
  } finally {
    clearTimeout(timeout)
  }
}
