import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Layouts
import { AdminLayout } from '@/components/layout/AdminLayout'

// Admin Pages
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import QRInventoryPage from '@/pages/QRInventoryPage'
import BulkGeneratePage from '@/pages/BulkGeneratePage'
import SettingsPage from '@/pages/SettingsPage'

// Public Dynamic Customer Landing Page
import PublicLandingPage from '@/pages/PublicLandingPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#111111',
              border: '1px solid #292929',
              color: '#FFFFFF',
            },
          }}
          richColors
          closeButton
        />
        <ErrorBoundary>
          <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public Dynamic QR Landing Pages (Primary route: /product/:id) */}
          <Route path="/product/:id" element={<PublicLandingPage />} />
          <Route path="/product/:qrCodeId" element={<PublicLandingPage />} />
          <Route path="/q/:qrCodeId" element={<PublicLandingPage />} />
          <Route path="/qr/:qrCodeId" element={<PublicLandingPage />} />

          {/* Protected Administration Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/qr-inventory" element={<QRInventoryPage />} />
            <Route path="/generate" element={<BulkGeneratePage />} />
            <Route path="/qr-batches" element={<Navigate to="/generate" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
