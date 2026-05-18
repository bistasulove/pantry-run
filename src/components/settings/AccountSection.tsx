'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { UpgradeAccountSheet } from '@/components/auth/UpgradeAccountSheet'
import { Button } from '@/components/ui/Button'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useListStore } from '@/store/listStore'

function providerLabel(provider: string | null): string {
  if (!provider) return 'Email'
  if (provider === 'google') return 'Google'
  if (provider === 'email') return 'Email'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function AccountSection() {
  const router = useRouter()
  const { isAnonymous, email, pendingEmail, provider } = useSession()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [resending, setResending] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  // Three states for the section:
  // 1. Upgraded (not anon)         → email + provider + Sign out
  // 2. Anon with pending email     → "check your inbox" + resend
  // 3. Anon with no pending email  → Save-your-account CTA
  // State 2 exists because Supabase's anon-upgrade is two-phase when email
  // confirmation is enabled: updateUser({ email, password }) queues the email
  // change but `is_anonymous` only flips false once the user clicks the
  // confirmation link.
  const isPendingConfirmation = isAnonymous && !!pendingEmail

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AccountSection] sign-out failed', error)
      setToast({ message: "Couldn't sign you out. Try again." })
      setSigningOut(false)
      return
    }
    // Wipe client stores so nothing flashes on the way out. SessionProvider's
    // auth listener also calls clearUser(), but doing it here removes the race.
    useHouseholdStore.getState().clearHousehold()
    useListStore.getState().setItems([])
    router.refresh()
    router.replace('/welcome')
  }

  async function handleResend() {
    if (!pendingEmail || resending) return
    setResending(true)
    const supabase = createClient()
    // supabase.auth.resend explicitly retriggers a verification email without
    // requiring a state change. updateUser({ email }) is a no-op when the
    // value matches the current `new_email`, which is why our first try did
    // nothing. emailRedirectTo points the link at our callback so a successful
    // click lands on `/auth/callback?code=…` instead of the bare Site URL.
    const emailRedirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.resend({
      type: 'email_change',
      email: pendingEmail,
      options: { emailRedirectTo },
    })
    setResending(false)
    if (error) {
      console.error('[AccountSection] resend failed', error)
      setToast({ message: "Couldn't resend the email. Try again in a minute." })
      return
    }
    setToast({ message: `Sent another confirmation to ${pendingEmail}.` })
  }

  function renderBody() {
    if (!isAnonymous) {
      return (
        <>
          <dl className="text-text-primary mb-3 flex flex-col gap-1 text-[14px] leading-relaxed">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Email</dt>
              <dd className="truncate font-medium">{email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Signed in with</dt>
              <dd className="font-medium">{providerLabel(provider)}</dd>
            </div>
          </dl>
          <Button onClick={handleSignOut} variant="secondary" fullWidth disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </>
      )
    }

    if (isPendingConfirmation) {
      return (
        <>
          <p className="text-text-secondary mb-1 text-[14px] leading-relaxed">
            We sent a confirmation link to:
          </p>
          <p className="text-text-primary mb-3 truncate text-[16px] leading-relaxed font-semibold">
            {pendingEmail}
          </p>
          <p className="text-text-secondary mb-3 text-[13px] leading-snug">
            Click the link in that email to finish saving your account. Until then you can keep
            using the list — your data is safe.
          </p>
          <Button onClick={handleResend} variant="secondary" fullWidth disabled={resending}>
            {resending ? 'Resending…' : 'Resend confirmation email'}
          </Button>
        </>
      )
    }

    return (
      <>
        <p className="text-text-secondary mb-3 text-[14px] leading-relaxed">
          Save your account so you can sign in from other devices and don&apos;t lose your list.
        </p>
        <Button onClick={() => setSheetOpen(true)} variant="primary" fullWidth>
          Save your account
        </Button>
      </>
    )
  }

  return (
    <section className="border-border-default/60 border-t pt-6">
      <h3 className="text-text-primary mb-2 text-[17px] leading-normal font-semibold">Account</h3>

      {renderBody()}

      <UpgradeAccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpgraded={(message) => setToast({ message })}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </section>
  )
}

export default AccountSection
