import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, Lock, User, AlertCircle, Mail, Sparkles, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Modes: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')

  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    const newErrors: Record<string, string> = {}

    if (mode === 'signin') {
      if (!identifier.trim()) newErrors.identifier = 'Username or email address is required'
      if (!password) newErrors.password = 'Password is required'
    } else if (mode === 'signup') {
      if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email address is required'
      if (!identifier.trim()) newErrors.identifier = 'Username is required'
      if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    } else if (mode === 'forgot') {
      if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email address is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      if (mode === 'signin') {
        const { error } = await signIn(identifier.trim(), password)
        if (error) {
          setErrorMessage(error)
          toast.error(error)
        } else {
          toast.success('Welcome back to DOMINOVA')
          navigate('/dashboard', { replace: true })
        }
      } else if (mode === 'signup') {
        const { error, requiresConfirmation } = await signUp(email.trim(), password, {
          username: identifier.trim(),
          fullName: fullName.trim(),
        })

        if (error) {
          setErrorMessage(error)
          toast.error(error)
        } else if (requiresConfirmation) {
          setSuccessMessage(
            'Account registered successfully! A confirmation email has been sent. Please verify your email before logging in.'
          )
          toast.success('Confirmation email dispatched!')
        } else {
          toast.success('Account created successfully! Welcome to DOMINOVA.')
          navigate('/dashboard', { replace: true })
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email.trim())
        if (error) {
          setErrorMessage(error)
          toast.error(error)
        } else {
          setSuccessMessage('Password reset instructions have been sent to your email address.')
          toast.success('Reset email sent!')
        }
      }
    } finally {
      setLoading(false)
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
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-[#A3A3A3] text-sm mt-1.5">
              {mode === 'signin' && 'Sign in to access your admin dashboard'}
              {mode === 'signup' && 'Register a new admin or operator account'}
              {mode === 'forgot' && 'Enter your email to receive a password reset link'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-[#292929] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className={`pb-2.5 text-sm font-semibold transition-all relative ${
                mode === 'signin' ? 'text-[#C9A24D]' : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Sign In
              {mode === 'signin' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C9A24D]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className={`pb-2.5 text-sm font-semibold ml-6 transition-all relative ${
                mode === 'signup' ? 'text-[#C9A24D]' : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Sign Up
              {mode === 'signup' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C9A24D]" />
              )}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    icon={<User className="w-4 h-4 text-[#A3A3A3]" />}
                  />
                </div>
                <div>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    icon={<Mail className="w-4 h-4 text-[#A3A3A3]" />}
                    autoComplete="email"
                  />
                </div>
              </>
            )}

            {mode === 'forgot' ? (
              <div>
                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  icon={<Mail className="w-4 h-4 text-[#A3A3A3]" />}
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <Input
                  label={mode === 'signin' ? 'Username or Email' : 'Username'}
                  type="text"
                  placeholder={mode === 'signin' ? 'Enter username or email address' : 'Choose a username'}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  error={errors.identifier}
                  icon={<User className="w-4 h-4 text-[#A3A3A3]" />}
                  autoComplete="username"
                  autoFocus={mode === 'signin'}
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#A3A3A3]">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setErrorMessage(null)
                      }}
                      className="text-xs text-[#C9A24D] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  error={errors.password}
                  icon={<Lock className="w-4 h-4 text-[#A3A3A3]" />}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
            )}

            {mode === 'signup' && (
              <div>
                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  icon={<Lock className="w-4 h-4 text-[#A3A3A3]" />}
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Quick Access Helper (Sign in only) */}
            {mode === 'signin' && (
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
            )}

            <Button
              type="submit"
              variant="gold"
              size="lg"
              loading={loading}
              className="w-full font-bold shadow-[0_0_20px_rgba(201,162,77,0.25)] text-base"
            >
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
            </Button>

            {mode === 'forgot' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin')
                    setErrorMessage(null)
                  }}
                  className="text-xs text-[#A3A3A3] hover:text-white underline"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-xs text-[#737373]">
          &copy; {new Date().getFullYear()} DOMINOVA. All rights reserved.
        </div>
      </div>

      {/* Right Decorative Showcase */}
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
                <p className="text-xs text-[#A3A3A3]">Assign organization name and destination buttons</p>
              </div>
            </div>

            <div className="p-4 bg-[#111111] border border-[#292929] rounded-xl flex items-center gap-3.5">
              <span className="text-lg">⚡</span>
              <div className="text-sm">
                <span className="font-semibold text-white">Instant Cloud Sync</span>
                <p className="text-xs text-[#A3A3A3]">Protected by Supabase Auth and Row Level Security</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
