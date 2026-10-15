const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'travel-diary-token'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function apiUrl(path = '') {
  return `${API_BASE_URL}${path}`
}

async function request(path, options = {}) {
  let response

  const headers = new Headers(options.headers)
  const token = getStoredToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  try {
    response = await fetch(apiUrl(path), { ...options, headers })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to reach the server. Please try again.')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearStoredToken()
      window.dispatchEvent(new Event('travel-diary:unauthorized'))
    }
    throw new Error(data?.error || 'The request failed. Please try again.')
  }

  if (data === null) {
    throw new Error('The server returned an unexpected response. Please try again.')
  }

  return data
}

export function registerUser(details) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
}

export function loginUser(credentials) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}

export function changePassword(passwords) {
  return request('/auth/account/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(passwords),
  })
}

export function deleteAccount(password) {
  return request('/auth/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

export function getCurrentUser() {
  return request('/auth/me')
}

export function getTrips(signal) {
  return request('/trips', { signal })
}

export function createTrip(trip) {
  return request('/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trip),
  })
}

export function getTrip(tripId, signal) {
  return request(`/trips/${encodeURIComponent(tripId)}`, { signal })
}

export function getPublicTrip(tripId, signal) {
  return request(`/public/trips/${encodeURIComponent(tripId)}`, { signal })
}

export function updateTrip(tripId, trip) {
  return request(`/trips/${encodeURIComponent(tripId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trip),
  })
}

export function regenerateShareLink(tripId) {
  return request(`/trips/${encodeURIComponent(tripId)}/share-link`, {
    method: 'POST',
  })
}

export function deleteTrip(tripId) {
  return request(`/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
  })
}

export function getEntries(tripId, signal) {
  return request(`/trips/${encodeURIComponent(tripId)}/entries`, { signal })
}

export function createEntry(tripId, entry) {
  return request(`/trips/${encodeURIComponent(tripId)}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
}

export function updateEntry(tripId, entryId, entry) {
  return request(`/trips/${encodeURIComponent(tripId)}/entries/${encodeURIComponent(entryId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
}

export function deleteEntry(tripId, entryId) {
  return request(`/trips/${encodeURIComponent(tripId)}/entries/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  })
}

export function refreshEntryWeather(tripId, entryId) {
  return request(`/trips/${encodeURIComponent(tripId)}/entries/${encodeURIComponent(entryId)}/weather`, {
    method: 'POST',
  })
}
