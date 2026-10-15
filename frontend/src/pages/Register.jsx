import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'
import PageLayout from '../components/PageLayout.jsx'

function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/trips" replace />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/trips', { replace: true })
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <section className="auth-panel" aria-labelledby="register-heading">
        <h1 id="register-heading">Create an account</h1>
        <p>Your trips and diary entries will only be available to your account.</p>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting}>
            <label htmlFor="register-name">Name</label>
            <input id="register-name" name="name" autoComplete="name" maxLength={80} value={form.name} onChange={handleChange} required />

            <label htmlFor="register-email">Email</label>
            <input id="register-email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={handleChange} required />

            <label htmlFor="register-password">Password</label>
            <input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={handleChange} required />
            <p className="field-help">Use between 8 and 72 characters.</p>

            <label htmlFor="register-confirm-password">Confirm password</label>
            <input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} required />

            <button type="submit">{isSubmitting ? 'Creating account…' : 'Create account'}</button>
          </fieldset>
          {error && <p className="error-message" role="alert">{error}</p>}
        </form>
        <p>Already registered? <Link to="/login">Sign in</Link>.</p>
      </section>
    </PageLayout>
  )
}

export default Register
