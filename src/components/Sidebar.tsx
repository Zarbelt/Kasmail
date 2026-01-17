import { NavLink } from 'react-router-dom'
import { Mail, Send, Trash2, AlertTriangle, Settings, LogOut } from 'lucide-react'

const navItems = [
  { to: '/inbox', label: 'Inbox', icon: Mail, countKey: 'inboxUnread' },
  { to: '/sent', label: 'Sent', icon: Send },
  { to: '/trash', label: 'Trash', icon: Trash2 },
  { to: '/junk', label: 'Junk', icon: AlertTriangle },
]

interface SidebarProps {
  unreadCount: number
  onLogout: () => void
}

export default function Sidebar({ unreadCount, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-800 bg-gray-950/80 flex flex-col h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          KasMail
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300'
                  : 'text-gray-300 hover:bg-gray-800/60'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.countKey === 'inboxUnread' && unreadCount > 0 && (
              <span className="ml-auto bg-cyan-600 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-4 ${
              isActive ? 'bg-cyan-950/60 text-cyan-300' : 'text-gray-300 hover:bg-gray-800/60'
            }`
          }
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-950/30 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}