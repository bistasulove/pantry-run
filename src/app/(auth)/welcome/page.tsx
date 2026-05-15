'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUserStore } from '@/store/userStore'

export default function WelcomePage() {
  const router = useRouter()
  const storedName = useUserStore((state) => state.displayName) ?? ''
  const setDisplayName = useUserStore((state) => state.setDisplayName)
  const [name, setName] = useState(storedName)

  function persistAndGo(path: '/create' | '/join') {
    const trimmed = name.trim().slice(0, 40)
    setDisplayName(trimmed || null)
    router.push(path)
  }

  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[32px] leading-tight font-bold">
            Pantry Run
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            A shared shopping list for your household.
          </p>
        </header>

        <Input
          label="Your first name"
          hint="Optional. Shown next to items you add."
          autoComplete="given-name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <Button onClick={() => persistAndGo('/create')} variant="primary" fullWidth>
            Create a household
          </Button>
          <Button onClick={() => persistAndGo('/join')} variant="secondary" fullWidth>
            Join with a code
          </Button>
        </div>
      </div>
    </main>
  )
}
