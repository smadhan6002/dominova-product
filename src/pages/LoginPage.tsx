import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="w-8 h-8 border-2 border-[#C9A24D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const validate = () => {
    const newErrors: { identifier?: string; password?: string } = {}
    if (!identifier.trim()) newErrors.identifier = 'Username or email address is required'
    if (!password) newErrors.password = 'Password is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!validate()) return

    setLoading(true)
    setErrors({})

    const { error } = await signIn(identifier.trim(), password)

    if (error) {
      setErrorMessage(error)
      toast.error(error)
      setLoading(false)
    } else {
      toast.success('Welcome back to DOMINOVA')
      navigate('/dashboard', { replace: true })
    }
  }

  const handleQuickFill = () => {
    setIdentifier('dominova')
    setPassword('Dominova@product')
    setErrorMessage(null)
    toast.success('Admin credentials filled')
  }

  return (
    <div className="min-h-screen flex bg-[#080808] text-white">
      {/* Left Login Form Area */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C9A24D] rounded-xl flex items-center justify-center font-extrabold text-black text-xl shadow-[0_0_15px_rgba(201,162,77,0.3)]">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">DOMINOVA</h1>
            <p className="text-[11px] text-[#A3A3A3] tracking-wider">Dynamic QR Management System</p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
            <p className="text-[#A3A3A3] text-sm mt-1.5">Sign in to access your admin dashboard</p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                label="Username or Email"
                type="text"
                placeholder="Enter username or email address"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  if (errorMessage) setErrorMessage(null)
                }}
                error={errors.identifier}
                icon={<User className="w-4 h-4 text-[#A3A3A3]" />}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMessage) setErrorMessage(null)
                }}
                error={errors.password}
                icon={<Lock className="w-4 h-4 text-[#A3A3A3]" />}
                autoComplete="current-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#A3A3A3] hover:text-white transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Quick Access Helper */}
            <div className="p-3 bg-[#111111] border border-[#292929] rounded-xl flex items-center justify-between text-xs">
              <span className="text-[#A3A3A3]">
                Default Admin: <strong className="text-[#C9A24D]">dominova</strong>
              </span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-xs bg-[#C9A24D]/15 text-[#C9A24D] px-2.5 py-1 rounded-lg border border-[#C9A24D]/30 hover:bg-[#C9A24D]/25 transition-colors font-medium"
              >
                Quick Fill
              </button>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              loading={loading}
              className="w-full font-bold shadow-[0_0_20px_rgba(201,162,77,0.25)] text-base"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-xs text-[#737373]">
          &copy; {new Date().getFullYear()} DOMINOVA. All rights reserved.
        </div>
      </div>

      {/* Right Decorative Showcase (matching UI reference styling) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0c0c0c] border-l border-[#292929] flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Subtle ambient glows */}
        <div className="absolute top-1/4 -right-16 w-80 h-80 bg-[#C9A24D]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-16 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#111111] border border-[#C9A24D]/30 mb-2 shadow-[0_0_25px_rgba(201,162,77,0.15)]">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Dynamic QR Management</h3>
            <p className="text-[#A3A3A3] text-sm leading-relaxed">
              Generate permanent QR codes in bulk in advance, print physical materials, and assign business destinations on demand.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-[#111111] border border-[#292929] rounded-xl flex items-center gap-3.5">
              <span className="text-lg">🎯</span>
              <div className="text-sm">
                <span className="font-semibold text-white">Bulk Pre-Generation</span>
                <p className="text-xs text-[#A3A3A3]">Generate IDs 001–050 & print physical QRs beforehand</p>
              </div>
            </div>

            <div className="p-4 bg-[#111111] border border-[#292929] rounded-xl flex items-center gap-3.5">
              <span className="text-lg">📁</span>
              <div className="text-sm">
                <span className="font-semibold text-white">One QR = One Organization</span>
                <p className="text-xs text-[#A3A3A3]">Assign organization name and 4 destination buttons later</p>
              </div>
            </div>

            <div className="p-4 bg-[#111111] border border-[#292929] rounded-xl flex items-center gap-3.5">
              <span className="text-lg">⚡</span>
              <div className="text-sm">
                <span className="font-semibold text-white">Instant Link Updates</span>
                <p className="text-xs text-[#A3A3A3]">Update Google Reviews, Instagram, Web or WhatsApp anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
