import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#121212',
          border: '1px solid #2A2A2A',
          color: '#FFFFFF',
          fontSize: '14px',
        },
        classNames: {
          success: 'border-l-4 !border-l-green-500',
          error: 'border-l-4 !border-l-red-500',
          warning: 'border-l-4 !border-l-amber-500',
          info: 'border-l-4 !border-l-blue-500',
        },
      }}
      richColors
      closeButton
    />
  )
}
