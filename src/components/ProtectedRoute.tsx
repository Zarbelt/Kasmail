// src/components/ProtectedRoute.tsx
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'

export default function ProtectedRoute() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const addr = await getCurrentKaswareAddress()
      if (!addr) {
        setIsAuthorized(false)
        return
      }

      const hasMin = await hasMinimumKAS()
      setIsAuthorized(hasMin)
    }

    checkAuth()
  }, [])

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Verifying wallet...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}