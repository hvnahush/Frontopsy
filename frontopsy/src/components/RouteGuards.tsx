import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'

// Both guards render nothing until the initial session lookup finishes, so a
// logged-in user isn't bounced to /login (or vice versa) on page load.

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, sessionChecked } = useAppSelector((state) => state.auth)

  if (!sessionChecked) return null
  // Also covers logging out from a protected page: the visitor lands on the public landing page.
  if (!user) return <Navigate to="/" replace />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, sessionChecked } = useAppSelector((state) => state.auth)

  if (!sessionChecked) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}
