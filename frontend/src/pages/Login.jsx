import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'
import PageLayout from '../components/PageLayout.jsx'

function Login() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
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
    setError('')
    setIsSubmitting(true)

    try {
      await login(form)
      const destination = location.state?.from?.pathname || '/trips'
      navigate(destination, { replace: true })
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <section className="auth-panel" aria-labelledby="login-heading">
        <h1 id="login-heading">Sign in</h1>
        <p>Sign in to view your trips and diary entries.</p>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting}>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} required />

            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} required />

            <button type="submit">{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
          </fieldset>
          {error && <p className="error-message" role="alert">{error}</p>}
        </form>
        <p>Need an account? <Link to="/register">Create one</Link>.</p>
      </section>
    </PageLayout>
  )
}

export default Login
