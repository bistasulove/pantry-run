'use client'

import { useState } from 'react'

import { LeaveHouseholdSection } from '@/components/settings/LeaveHouseholdSection'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/userStore'

interface SettingsViewProps {
  memberRowId: string
  initialDisplayName: string
}

export function SettingsView({ memberRowId, initialDisplayName }: SettingsViewProps) {
  const setDisplayName = useUserStore((s) => s.setDisplayName)
  const [name, setName] = useState(initialDisplayName)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  const trimmed = name.trim().slice(0, 40)
  const canSave = trimmed.length > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('household_members')
      .update({ display_name: trimmed })
      .eq('id', memberRowId)
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
    <div className="flex flex-col gap-6 px-4 py-6">
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

      <LeaveHouseholdSection />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

export default SettingsView
