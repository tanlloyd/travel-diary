const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchPlaces(query, signal) {
  const parameters = new URLSearchParams({
    name: query.trim(),
    count: '5',
    language: 'en',
    format: 'json',
  })

  let response
  try {
    response = await fetch(`${GEOCODING_URL}?${parameters}`, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Place search is unavailable. You can still enter coordinates manually.')
  }

  if (!response.ok) {
    throw new Error('Place search is unavailable. You can still enter coordinates manually.')
  }

  const data = await response.json().catch(() => null)
  if (!data || !Array.isArray(data.results ?? [])) {
    throw new Error('Place search returned an unexpected response. Please try again.')
  }

  return (data.results ?? []).filter((place) => (
    typeof place.name === 'string' &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  ))
}
