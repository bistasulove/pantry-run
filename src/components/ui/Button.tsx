'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90 active:opacity-80 disabled:opacity-50',
  secondary:
    'bg-bg-surface text-text-primary border border-border-default hover:bg-[#EEEDE8] active:bg-[#E4E2DC] disabled:opacity-50 dark:hover:bg-[#2E2E30] dark:active:bg-[#38383B]',
  ghost:
    'bg-transparent text-text-primary hover:bg-[#EEEDE8] active:bg-[#E4E2DC] disabled:opacity-50 dark:hover:bg-[#2E2E30] dark:active:bg-[#38383B]',
  destructive: 'bg-destructive text-white hover:opacity-90 active:opacity-80 disabled:opacity-50',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = '', variant = 'primary', fullWidth = false, type = 'button', children, ...rest },
  ref,
) {
  const base =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-medium leading-snug transition-opacity duration-150 ease-out-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed'
  const width = fullWidth ? 'w-full' : ''
  const variantClass = VARIANT_CLASSES[variant]

  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variantClass} ${width} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
})

export default Button
