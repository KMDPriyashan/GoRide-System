import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../core/services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUser(authService.getCurrentUser())
    setIsLoading(false)
  }, [])

  function login(usernameOrEmail, password) {
    const result = authService.login(usernameOrEmail, password)
    if (result.success) setUser(result.user)
    return result
  }

  function logout() {
    const didLogout = authService.logout()
    setUser(null)
    return didLogout
  }

  function signup(details) {
    return authService.signup(details)
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    signup,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.')
  return context
}