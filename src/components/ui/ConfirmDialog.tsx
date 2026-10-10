import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmStyles = {
    danger: 'bg-error hover:bg-error/80 text-white',
    warning: 'bg-warning hover:bg-warning/80 text-brand-black',
    default: 'bg-gradient-to-r from-brand-gold to-brand-gold-soft text-brand-black hover:brightness-110',
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-brand-card border border-brand-border rounded-xl p-6 max-w-md w-full animate-fade-in shadow-2xl">
        <h3 className="text-lg font-semibold text-brand-text mb-2">{title}</h3>
        <p className="text-sm text-brand-text-secondary mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-brand-text-secondary border border-brand-border rounded-lg hover:bg-brand-surface transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50',
              confirmStyles[variant]
            )}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
