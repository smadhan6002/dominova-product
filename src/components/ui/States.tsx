import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, Inbox } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4', className)}>
      <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
      <p className="text-sm text-brand-text-secondary">{message}</p>
    </div>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ message = 'Something went wrong.', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4', className)}>
      <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-error" />
      </div>
      <p className="text-sm text-brand-text-secondary text-center max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-brand-gold hover:text-brand-gold-soft transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return <Inbox className="w-8 h-8 text-brand-text-muted" />
    if (React.isValidElement(icon)) return icon
    const IconComponent = icon as React.ComponentType<{ className?: string }>
    return <IconComponent className="w-8 h-8 text-brand-text-muted" />
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4', className)}>
      <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center">
        {renderIcon()}
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-brand-text mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-brand-text-secondary max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

interface StatusBadgeProps {
  status: 'available' | 'assigned' | 'disabled' | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    available: 'bg-success/10 text-success',
    assigned: 'bg-brand-gold/10 text-brand-gold',
    disabled: 'bg-error/10 text-error',
    active: 'bg-success/10 text-success',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        styles[status] || 'bg-brand-surface text-brand-text-secondary',
        className
      )}
    >
      {status}
    </span>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-brand-text">{title}</h1>
        {description && (
          <p className="text-brand-text-secondary mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
