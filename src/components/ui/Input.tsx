'use client'

import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: string
  error?: string | null
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className = '', ...rest },
  ref,
) {
  const reactId = useId()
  const inputId = id ?? reactId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const base =
    'block w-full min-h-[44px] rounded-xl border bg-bg-surface px-4 text-[16px] leading-relaxed text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-colors duration-150'
  const borderClass = error
    ? 'border-destructive focus-visible:outline-destructive'
    : 'border-border-default'

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-text-primary text-[13px] leading-snug font-medium">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${base} ${borderClass} ${className}`.trim()}
        {...rest}
      />
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
})

export default Input
