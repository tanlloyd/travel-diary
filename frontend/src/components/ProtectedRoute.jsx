import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'

function ProtectedRoute({ children }) {
  const { user, isCheckingSession } = useAuth()
  const location = useLocation()

  if (isCheckingSession) return <p role="status">Checking your session…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export default ProtectedRoute
