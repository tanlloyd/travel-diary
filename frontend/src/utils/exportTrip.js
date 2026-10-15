function dateOnly(value) {
  return value ? value.slice(0, 10) : null
}

function exportWeather(weather) {
  if (!weather) return null

  return {
    condition: weather.condition,
    temperatureMax: weather.temperatureMax,
    temperatureMin: weather.temperatureMin,
    precipitation: weather.precipitation,
    source: weather.source,
  }
}

// Builds a self-contained copy of a trip. Database IDs, the owner, and the
// sharing token are left out because they mean nothing outside this application.
export function buildTripExport(trip, entries, exportedAt = new Date()) {
  return {
    format: 'travel-diary-trip',
    version: 1,
    exportedAt: exportedAt.toISOString(),
    trip: {
      name: trip.name,
      destination: trip.destination,
      startDate: dateOnly(trip.startDate),
      endDate: dateOnly(trip.endDate),
      description: trip.description || '',
    },
    entries: entries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      entryDate: dateOnly(entry.entryDate),
      locationName: entry.locationName || '',
      latitude: entry.latitude ?? null,
      longitude: entry.longitude ?? null,
      weather: exportWeather(entry.weather),
      photos: (entry.photos || []).map((photo) => ({
        description: photo.alt || '',
        dataUrl: photo.dataUrl,
      })),
    })),
  }
}

export function exportFileName(trip) {
  const slug = trip.name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .slice(0, 60)

  return `${slug || 'trip'}-travel-diary.json`
}

export function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
