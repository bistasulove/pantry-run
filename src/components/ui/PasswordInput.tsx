'use client'

import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string
  hint?: string
  error?: string | null
}

// Mirrors Input's API + visual but wraps the field in a flex container so
// the eye toggle can sit inside the rounded border. Stays out of Input so
// the base component doesn't grow a trailing-slot prop for one use case.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, hint, error, id, className = '', disabled, ...rest }, ref) {
    const reactId = useId()
    const inputId = id ?? reactId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
    const [visible, setVisible] = useState(false)

    const wrapperBase =
      'flex w-full min-h-[44px] items-stretch rounded-xl border bg-bg-surface transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent'
    const wrapperBorder = error
      ? 'border-destructive focus-within:outline-destructive'
      : 'border-border-default'

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-text-primary text-[13px] leading-snug font-medium"
          >
            {label}
          </label>
        ) : null}
        <div className={`${wrapperBase} ${wrapperBorder}`}>
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`text-text-primary placeholder:text-text-secondary flex-1 rounded-xl bg-transparent px-4 text-[16px] leading-relaxed focus:outline-none ${className}`.trim()}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="text-text-secondary hover:text-text-primary flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
          >
            {visible ? (
              <EyeOff size={18} strokeWidth={1.5} aria-hidden />
            ) : (
              <Eye size={18} strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </div>
        {hint && !error ? (
          <p id={hintId} className="text-text-secondary text-[12px] leading-snug">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-destructive text-[12px] leading-snug">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

export default PasswordInput
