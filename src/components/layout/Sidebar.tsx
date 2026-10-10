import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  QrCode,
  Layers,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/qr-inventory', label: 'QR Inventory', icon: QrCode },
  { to: '/generate', label: 'Bulk QR Generation', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111111] text-white">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-[#292929]/70">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-10 h-10 bg-[#C9A24D] rounded-xl flex items-center justify-center font-extrabold text-black text-xl flex-shrink-0 shadow-[0_0_15px_rgba(201,162,77,0.3)]">
            D
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold text-white tracking-wide">DOMINOVA</h1>
              <p className="text-[10px] text-[#A3A3A3] tracking-widest uppercase">Dynamic QR System</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#161616] text-[#A3A3A3] hover:text-white transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-[#C9A24D]/15 text-[#C9A24D] border border-[#C9A24D]/30 shadow-[0_0_10px_rgba(201,162,77,0.15)]'
                  : 'text-[#A3A3A3] hover:bg-[#161616] hover:text-white',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-[#292929]">
        {!collapsed && profile && (
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-bold text-white truncate">{profile.full_name || profile.username}</p>
            <p className="text-xs text-[#737373] capitalize">{profile.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium w-full',
            'text-[#A3A3A3] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#111111] border border-[#292929] rounded-xl text-white shadow-lg"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-[#111111] border-r border-[#292929] transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-md text-[#A3A3A3] hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:block h-screen bg-[#111111] border-r border-[#292929] transition-all duration-300 flex-shrink-0 sticky top-0',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
