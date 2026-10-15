import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthContext from './AuthContext.js'
import {
  changePassword as changePasswordRequest,
  clearStoredToken,
  deleteAccount as deleteAccountRequest,
  getCurrentUser,
  getStoredToken,
  loginUser,
  registerUser,
  storeToken,
} from '../services/api.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(getStoredToken()))

  const logout = useCallback(() => {
    clearStoredToken()
    setUser(null)
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    let isActive = true

    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (isActive) setUser(currentUser)
      })
      .catch(() => {
        if (isActive) logout()
      })
      .finally(() => {
        if (isActive) setIsCheckingSession(false)
      })

    return () => { isActive = false }
  }, [logout])

  useEffect(() => {
    window.addEventListener('travel-diary:unauthorized', logout)
    return () => window.removeEventListener('travel-diary:unauthorized', logout)
  }, [logout])

  async function login(credentials) {
    const result = await loginUser(credentials)
    storeToken(result.token)
    setUser(result.user)
  }

  async function register(details) {
    const result = await registerUser(details)
    storeToken(result.token)
    setUser(result.user)
  }

  // Changing the password invalidates earlier tokens, so keep the new one.
  async function changePassword(passwords) {
    const result = await changePasswordRequest(passwords)
    storeToken(result.token)
    setUser(result.user)
  }

  const deleteAccount = useCallback(async (password) => {
    await deleteAccountRequest(password)
    logout()
  }, [logout])

  const value = useMemo(() => ({
    user,
    isCheckingSession,
    login,
    register,
    logout,
    changePassword,
    deleteAccount,
  }), [user, isCheckingSession, logout, deleteAccount])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
