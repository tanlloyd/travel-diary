import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AuthContext from '../auth/AuthContext.js'
import PageLayout from './PageLayout.jsx'

function renderLayout(path, user = null, logout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ user, logout }}>
        <PageLayout><h1>Page content</h1></PageLayout>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return within(screen.getByRole('navigation', { name: 'Main navigation' }))
}

describe('shared navigation', () => {
  it.each([['/', 'Home'], ['/login', 'Sign in'], ['/register', 'Create account']])(
    'shows guest actions and the current page at %s', (path, label) => {
      const nav = renderLayout(path)
      expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
      expect(nav.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
      expect(nav.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register')
      expect(nav.queryByRole('link', { name: 'My trips' })).not.toBeInTheDocument()
      expect(nav.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    },
  )

  it.each([['/trips', 'My trips'], ['/trips/trip-1', 'My trips'], ['/account', 'Account']])(
    'keeps the correct section active at %s and preserves sign out', async (path, label) => {
      const logout = vi.fn()
      const nav = renderLayout(path, { name: 'Aisha Traveller' }, logout)
      expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
      expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
      expect(nav.getByRole('link', { name: 'My trips' })).toHaveAttribute('href', '/trips')
      expect(nav.getByText('Signed in as Aisha Traveller')).toBeInTheDocument()
      expect(nav.queryByRole('link', { name: 'Create account' })).not.toBeInTheDocument()
      await userEvent.setup().click(nav.getByRole('button', { name: 'Sign out' }))
      expect(logout).toHaveBeenCalledOnce()
    },
  )

  it('offers a keyboard skip link to a focusable main region', async () => {
    renderLayout('/')
    await userEvent.setup().tab()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1')
  })
})
