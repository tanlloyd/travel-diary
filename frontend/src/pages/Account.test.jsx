import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Account from './Account.jsx'

const auth = {
  user: { name: 'Aisha Traveller', email: 'aisha@example.com' },
  logout: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}

vi.mock('../auth/useAuth.js', () => ({ default: () => auth }))

function renderAccount() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={<Account />} />
        <Route path="/" element={<h1>Home page</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillPasswords(user, { current, next, confirm }) {
  await user.type(screen.getByLabelText('Current password'), current)
  await user.type(screen.getByLabelText('New password'), next)
  await user.type(screen.getByLabelText('Confirm new password'), confirm)
  await user.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('Account page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('shows who is signed in', () => {
    renderAccount()

    expect(screen.getByText('Aisha Traveller')).toBeInTheDocument()
    expect(screen.getByText('aisha@example.com')).toBeInTheDocument()
  })

  it('stops a mistyped new password before contacting the server', async () => {
    const user = userEvent.setup()
    renderAccount()

    await fillPasswords(user, { current: 'secure-password', next: 'a-better-password', confirm: 'a-bettter-password' })

    expect(screen.getByRole('alert')).toHaveTextContent('New passwords do not match.')
    expect(auth.changePassword).not.toHaveBeenCalled()
  })

  it('changes the password and clears the form', async () => {
    auth.changePassword.mockResolvedValue()
    const user = userEvent.setup()
    renderAccount()

    await fillPasswords(user, { current: 'secure-password', next: 'a-better-password', confirm: 'a-better-password' })

    expect(await screen.findByText(/Password changed/)).toBeInTheDocument()
    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'secure-password',
      newPassword: 'a-better-password',
    })
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('keeps the form filled in when the current password is wrong', async () => {
    auth.changePassword.mockRejectedValue(new Error('Current password is incorrect.'))
    const user = userEvent.setup()
    renderAccount()

    await fillPasswords(user, { current: 'wrong-password', next: 'a-better-password', confirm: 'a-better-password' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect.')
    expect(screen.getByLabelText('New password')).toHaveValue('a-better-password')
  })

  it('does not delete the account unless the warning is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderAccount()

    await user.type(screen.getByLabelText('Password'), 'secure-password')
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(auth.deleteAccount).not.toHaveBeenCalled()
  })

  it('deletes the account after confirmation and returns to the home page', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    auth.deleteAccount.mockResolvedValue()
    const user = userEvent.setup()
    renderAccount()

    await user.type(screen.getByLabelText('Password'), 'secure-password')
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(auth.deleteAccount).toHaveBeenCalledWith('secure-password')
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument()
  })
})
