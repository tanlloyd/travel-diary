import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider.jsx'

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }
}

describe('authentication flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('explains the product and gives a first-time visitor a clear action', () => {
    renderApp('/')

    expect(screen.getByRole('heading', {
      name: 'Journeys end. Memories stay.',
    })).toBeInTheDocument()
    expect(screen.queryByText(/Keep the places, photos and little moments you’ll want to return to\./i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start somewhere' })).toHaveAttribute('href', '/register')
  })

  it('lets visitors browse the four landing features and disables controls at the ends', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const track = screen.getByRole('region', { name: 'Travel Diary features' })
    for (const name of ['Add a memory', 'Map your journey', 'Remember the day', 'Replay & share']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    Object.defineProperties(track, {
      clientWidth: { value: 300, configurable: true },
      scrollWidth: { value: 1200, configurable: true },
    })
    Array.from(track.children).forEach((card, index) => {
      Object.defineProperty(card, 'offsetLeft', { value: index * 300, configurable: true })
    })
    track.scrollTo = vi.fn(({ left }) => {
      track.scrollLeft = Math.max(0, Math.min(left, 900))
      fireEvent.scroll(track)
    })
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    fireEvent.scroll(track)
    const previous = screen.getByRole('button', { name: 'Previous feature' })
    const next = screen.getByRole('button', { name: 'Next feature' })
    expect(previous).toBeDisabled()
    await user.click(next)
    expect(track.scrollLeft).toBe(300)
    expect(previous).toBeEnabled()
    track.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(track.scrollLeft).toBe(900)
    expect(next).toBeDisabled()
    await user.click(previous)
    expect(track.scrollLeft).toBe(600)
    expect(next).toBeEnabled()
    track.scrollLeft = 0
    fireEvent.scroll(track)
    expect(previous).toBeDisabled()
  })

  it('redirects a signed-out visitor from trips to sign in', async () => {
    renderApp('/trips')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to view your trips and diary entries.')).toBeInTheDocument()
  })

  it('registers an account, stores its token, and opens the private trips page', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (url) => {
      if (url.toString().endsWith('/auth/register')) {
        return jsonResponse({
          user: { id: 'user-1', name: 'Aisha Traveller', email: 'aisha@example.com' },
          token: 'signed-token',
        }, 201)
      }

      if (url.toString().endsWith('/trips')) return jsonResponse([])
      throw new Error(`Unexpected request: ${url}`)
    })

    const user = userEvent.setup()
    renderApp('/register')

    await user.type(screen.getByLabelText('Name'), 'Aisha Traveller')
    await user.type(screen.getByLabelText('Email'), 'aisha@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secure-password')
    await user.type(screen.getByLabelText('Confirm password'), 'secure-password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'My trips' })).toBeInTheDocument()
    expect(localStorage.getItem('travel-diary-token')).toBe('signed-token')

    const registrationRequest = fetchMock.mock.calls.find(([url]) => (
      url.toString().endsWith('/auth/register')
    ))
    expect(JSON.parse(registrationRequest[1].body)).toEqual({
      name: 'Aisha Traveller',
      email: 'aisha@example.com',
      password: 'secure-password',
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('restores a saved session before displaying private trips', async () => {
    localStorage.setItem('travel-diary-token', 'saved-token')
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (url) => {
      if (url.toString().endsWith('/auth/me')) {
        return jsonResponse({ user: { id: 'user-1', name: 'Aisha Traveller', email: 'aisha@example.com' } })
      }
      if (url.toString().endsWith('/trips')) return jsonResponse([])
      throw new Error(`Unexpected request: ${url}`)
    })

    renderApp('/trips')

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…')
    expect(await screen.findByRole('heading', { name: 'My trips' })).toBeInTheDocument()
    expect(screen.getByText('Signed in as Aisha Traveller')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('shows a public trip without requiring an account', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse({
      trip: {
        _id: 'trip-1',
        name: 'Tasmania road trip',
        destination: 'Hobart',
        startDate: '2026-11-02T00:00:00.000Z',
        endDate: '2026-11-05T00:00:00.000Z',
        description: 'A shared autumn journey.',
        isPublic: true,
      },
      entries: [{
        _id: 'entry-1',
        title: 'Waterfront walk',
        content: 'Visited the harbour after breakfast.',
        entryDate: '2026-11-03T00:00:00.000Z',
        createdAt: '2026-11-03T09:00:00.000Z',
        photos: [],
      }],
    }))

    renderApp('/shared/trips/trip-1')

    expect(await screen.findByRole('heading', { name: 'Tasmania road trip' })).toBeInTheDocument()
    expect(screen.getByText('Public trip')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Waterfront walk' })).toHaveLength(2)
    expect(screen.getByText('This is a read-only travel diary shared by its owner.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/public/trips/trip-1', expect.any(Object))
  })
})
