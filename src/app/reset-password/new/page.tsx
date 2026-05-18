import { NewPasswordForm } from '@/components/auth/NewPasswordForm'

// Outside the (auth) group on purpose — when the user lands here via the
// emailed reset link they're already in a recovery session, often with a
// household, and (auth)/layout.tsx would bounce them to /list before they
// could set a new password.
export default function NewPasswordPage() {
  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
            Set a new password
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            Pick something at least 8 characters long.
          </p>
        </header>
        <NewPasswordForm />
      </div>
    </main>
  )
}
