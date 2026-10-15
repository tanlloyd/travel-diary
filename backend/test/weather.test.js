import assert from 'node:assert/strict'
import test from 'node:test'
import { getWeatherForEntry } from '../src/services/weather.js'

function weatherResponse(date, values = {}) {
  return {
    ok: true,
    json: async () => ({
      daily: {
        time: [date],
        weather_code: [values.code ?? 2],
        temperature_2m_max: [values.maximum ?? 24.5],
        temperature_2m_min: [values.minimum ?? 14.2],
        precipitation_sum: [values.precipitation ?? 0.8],
      },
    }),
  }
}

test('retrieves and normalises forecast weather for a mapped diary entry', async () => {
  let requestedUrl
  const weather = await getWeatherForEntry(
    {
      entryDate: '2026-10-10',
      latitude: -33.8688,
      longitude: 151.2093,
    },
    {
      now: new Date('2026-10-04T00:00:00.000Z'),
      fetchImpl: async (url) => {
        requestedUrl = new URL(url)
        return weatherResponse('2026-10-10')
      },
    },
  )

  assert.equal(requestedUrl.origin, 'https://api.open-meteo.com')
  assert.equal(requestedUrl.searchParams.get('start_date'), '2026-10-10')
  assert.equal(requestedUrl.searchParams.get('latitude'), '-33.8688')
  assert.deepEqual(
    {
      code: weather.code,
      condition: weather.condition,
      temperatureMax: weather.temperatureMax,
      temperatureMin: weather.temperatureMin,
      precipitation: weather.precipitation,
      source: weather.source,
    },
    {
      code: 2,
      condition: 'Partly cloudy',
      temperatureMax: 24.5,
      temperatureMin: 14.2,
      precipitation: 0.8,
      source: 'Open-Meteo',
    },
  )
})

test('uses historical weather for past dates and skips dates outside the forecast range', async () => {
  let requestedUrl
  const historical = await getWeatherForEntry(
    { entryDate: '2025-10-04', latitude: 5.4141, longitude: 100.3288 },
    {
      now: new Date('2026-10-04T00:00:00.000Z'),
      fetchImpl: async (url) => {
        requestedUrl = new URL(url)
        return weatherResponse('2025-10-04', { code: 63 })
      },
    },
  )

  assert.equal(requestedUrl.origin, 'https://archive-api.open-meteo.com')
  assert.equal(historical.condition, 'Rain')

  let fetchCalled = false
  const unavailable = await getWeatherForEntry(
    { entryDate: '2026-10-20', latitude: 5.4141, longitude: 100.3288 },
    {
      now: new Date('2026-10-04T00:00:00.000Z'),
      fetchImpl: async () => {
        fetchCalled = true
        return weatherResponse('2026-10-20')
      },
    },
  )

  assert.equal(unavailable, null)
  assert.equal(fetchCalled, false)
})
