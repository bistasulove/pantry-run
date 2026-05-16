'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the sheet for keyboard users.
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="ease-out-expo absolute inset-0 bg-black/40 transition-opacity duration-[250ms]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-bg-surface text-text-primary animate-sheet-up relative w-full max-w-md rounded-t-2xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl outline-none"
      >
        {title ? (
          <h2 className="text-text-primary mb-3 text-[20px] leading-snug font-semibold">{title}</h2>
        ) : null}
        {children}
      </div>
      <style jsx global>{`
        @keyframes pantry-sheet-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-sheet-up {
          animation: pantry-sheet-up 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-sheet-up {
            animation: none;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}

export default Sheet
