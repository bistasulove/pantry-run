'use client'

import { useState } from 'react'

import { AccountSection } from '@/components/settings/AccountSection'
import { LeaveHouseholdSection } from '@/components/settings/LeaveHouseholdSection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useUserStore } from '@/store/userStore'

export function SettingsView() {
  const userId = useUserStore((s) => s.userId)
  const displayName = useUserStore((s) => s.displayName)
  const setDisplayName = useUserStore((s) => s.setDisplayName)
  const householdId = useHouseholdStore((s) => s.householdId)

  const [name, setName] = useState(displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  const trimmed = name.trim().slice(0, 40)
  const canSave = trimmed.length > 0 && !saving && trimmed !== (displayName ?? '')

  async function handleSave() {
    if (!canSave || !userId || !householdId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('household_members')
      .update({ display_name: trimmed })
      .eq('user_id', userId)
      .eq('household_id', householdId)
    setSaving(false)
    if (error) {
      console.error('[settings] save failed', error)
      setToast({ message: "Couldn't save your name." })
      return
    }
    setDisplayName(trimmed)
    setToast({ message: 'Saved' })
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-text-primary text-[24px] leading-snug font-bold">
          Settings
        </h2>
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Your name shows up next to items you add.
        </p>
      </header>

      <Input
        label="Display name"
        autoComplete="given-name"
        maxLength={40}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Button onClick={handleSave} variant="primary" fullWidth disabled={!canSave}>
        {saving ? 'Saving…' : 'Save'}
      </Button>

      <ThemeToggle />

      <AccountSection />

      <section id="notifications" className="scroll-mt-20">
        <NotificationsSection />
      </section>

      <LeaveHouseholdSection />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

export default SettingsView
