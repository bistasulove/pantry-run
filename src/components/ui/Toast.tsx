'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ToastOptions {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  durationMs?: number
}

interface ToastProps {
  toast: ToastOptions | null
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!toast) return
    const duration = toast.durationMs ?? 4000
    timerRef.current = setTimeout(onDismiss, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast, onDismiss])

  if (!toast || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-50 flex justify-center px-4"
    >
      <div className="bg-text-primary text-bg-base pointer-events-auto flex max-w-md min-w-[280px] items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14px] leading-relaxed shadow-lg">
        <span className="truncate">{toast.message}</span>
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick()
              onDismiss()
            }}
            className="text-accent shrink-0 text-[13px] font-semibold tracking-wide uppercase"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export default Toast
