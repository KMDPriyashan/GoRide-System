import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'

/** Guard nested routes or children by authentication and optional account roles. */
export default function ProtectedRoute({
  allowedRoles,
  children,
  unauthorizedTo = '/unauthorized',
}) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const roles = allowedRoles
    ? Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    : null
  if (roles && !roles.includes(user.userType)) {
    return <Navigate to={unauthorizedTo} replace />
  }

  return children ?? <Outlet />
}