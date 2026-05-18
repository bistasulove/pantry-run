import { ResetPasswordRequestForm } from '@/components/auth/ResetPasswordRequestForm'

// Lives outside the (auth) route group on purpose: /reset-password/new must
// be reachable for users who already have a real session (the recovery
// session set by the emailed link), and grouping these together with the
// "bounce signed-in users to /list" layout would break that flow. The
// request page does its own minimal copy and no server-side guard — sending
// a reset email to a signed-in user is harmless.
export default function ResetPasswordPage() {
  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
            Reset password
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            Enter the email on your account. We&apos;ll send you a link to set a new password.
          </p>
        </header>
        <ResetPasswordRequestForm />
      </div>
    </main>
  )
}
