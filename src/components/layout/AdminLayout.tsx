import { Outlet, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from './Sidebar'
import { dataProvider } from '@/lib/dataProvider'
import { AlertTriangle } from 'lucide-react'

export function AdminLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#080808]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C9A24D] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#A3A3A3] text-xs">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const baseUrl = dataProvider.getBaseUrl()
  const isLocalOrPreview =
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1') ||
    baseUrl.includes('.vercel.app/preview')

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808] text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Development / Preview Domain Warning Banner */}
        {isLocalOrPreview && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Dev Domain Active:</strong> Permanent Base URL is currently <code className="text-white bg-black/40 px-1 py-0.5 rounded">{baseUrl}</code>.
              </span>
            </div>
            <Link to="/settings" className="underline hover:text-white font-semibold">
              Configure Production Domain &rarr;
            </Link>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
