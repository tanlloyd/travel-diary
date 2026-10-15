import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'
import PageLayout from '../components/PageLayout.jsx'

const emptyPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' }

function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [form, setForm] = useState(emptyPasswords)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSaving) return

    setError('')
    setSuccess('')

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsSaving(true)

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setForm(emptyPasswords)
      setSuccess('Password changed. Other devices have been signed out.')
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="account-panel" aria-labelledby="change-password-heading">
      <h2 id="change-password-heading">Change password</h2>
      <p>Changing your password signs out every other device using this account.</p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving}>
          <legend className="visually-hidden">Password details</legend>

          <label htmlFor="account-current-password">Current password</label>
          <input id="account-current-password" name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={handleChange} required />

          <label htmlFor="account-new-password">New password</label>
          <input id="account-new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.newPassword} onChange={handleChange} required />
          <p className="field-help">Use between 8 and 72 characters.</p>

          <label htmlFor="account-confirm-password">Confirm new password</label>
          <input id="account-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} required />

          <button type="submit">{isSaving ? 'Saving…' : 'Change password'}</button>
        </fieldset>
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="success-message" role="status">{success}</p>
      </form>
    </section>
  )
}

function DeleteAccountForm() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (
      isDeleting ||
      !window.confirm('Delete your account, every trip, and every diary entry? This cannot be undone.')
    ) return

    setError('')
    setIsDeleting(true)

    try {
      await deleteAccount(password)
      navigate('/', { replace: true })
    } catch (error) {
      setError(error.message)
      setIsDeleting(false)
    }
  }

  return (
    <section className="account-panel account-panel-danger" aria-labelledby="delete-account-heading">
      <h2 id="delete-account-heading">Delete account</h2>
      <p>
        This permanently deletes your account together with all of your trips, diary entries,
        and photos. Shared links to your trips stop working.
      </p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isDeleting}>
          <legend className="visually-hidden">Confirm account deletion</legend>

          <label htmlFor="account-delete-password">Password</label>
          <input
            id="account-delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError('') }}
            required
          />

          <button type="submit" className="danger-button">
            {isDeleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </fieldset>
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>
    </section>
  )
}

function Account() {
  const { user } = useAuth()

  return (
    <PageLayout>
      <header className="page-heading">
        <p className="eyebrow">Your account</p>
        <h1>Account</h1>
      </header>

      <section className="account-panel" aria-labelledby="account-details-heading">
        <h2 id="account-details-heading">Details</h2>
        <dl className="account-details">
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </dl>
      </section>

      <ChangePasswordForm />
      <DeleteAccountForm />
    </PageLayout>
  )
}

export default Account
