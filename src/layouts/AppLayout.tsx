// src/layouts/AppLayout.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentKaswareAddress } from '../lib/kaspa'
import Sidebar from '../components/Sidebar'

export default function AppLayout() {
  const walletAddress = getCurrentKaswareAddress()

  if (!walletAddress) {
    return <Navigate to="/" replace />
  }

  const handleLogout = () => {
    localStorage.removeItem('kasmail_wallet')
    window.location.href = '/'
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-gray-950 to-black text-white overflow-hidden">
      <div className="flex-shrink-0 w-64 border-r border-gray-800/60 bg-gray-950/80 backdrop-blur-md hidden lg:block">
        <Sidebar unreadCount={0} onLogout={handleLogout} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}