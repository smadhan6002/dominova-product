import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home, ShieldAlert } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DOMINOVA] Uncaught application error caught by ErrorBoundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || 'An unexpected error occurred.'
      const isSupabaseIssue =
        errorMessage.toLowerCase().includes('supabase') ||
        errorMessage.toLowerCase().includes('api key') ||
        errorMessage.toLowerCase().includes('url is required')

      return (
        <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-4 sm:p-6 select-none font-sans">
          <div className="w-full max-w-lg bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Subtle Gold Ambient Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-[#C9A24D]/10 rounded-full blur-3xl" />

            {/* Header Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Application Encountered an Error</h2>
                <p className="text-xs text-[#A3A3A3] mt-0.5">DOMINOVA Dynamic QR Management System</p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-4 rounded-xl bg-[#161616] border border-[#292929] mb-5">
              <p className="text-xs font-mono text-red-300 break-words leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {/* Helpful Notice if Supabase Related */}
            {isSupabaseIssue && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Configuration Notice:</strong> If deploying to Vercel, verify that{' '}
                  <code className="text-white bg-black/50 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
                  <code className="text-white bg-black/50 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> are set in Vercel Project Settings &rarr; Environment Variables.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A24D] hover:bg-[#D4AF37] text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(201,162,77,0.25)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#161616] hover:bg-[#202020] text-white border border-[#292929] font-medium text-sm transition-colors"
              >
                <Home className="w-4 h-4 text-[#A3A3A3]" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
