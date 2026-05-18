import { Suspense } from 'react'

import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  // (auth)/layout.tsx already bounces signed-in users who have a household
  // away to /list — no additional guard needed here.
  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
            Sign in
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            Pick up your household on this device.
          </p>
        </header>
        {/* Suspense boundary required by Next 16 because SignInForm calls
            useSearchParams to read the optional ?error= callback hint. */}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  )
}
