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

  const trimmedName = name.trim().slice(0, 40)
  const isValid = trimmedName.length > 0

  function persistAndGo(path: '/create' | '/join') {
    if (!isValid) return
    setDisplayName(trimmedName)
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
          hint="Shown next to items you add so other members know who's who."
          autoComplete="given-name"
          maxLength={40}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => persistAndGo('/create')}
            variant="primary"
            fullWidth
            disabled={!isValid}
          >
            Create a household
          </Button>
          <Button
            onClick={() => persistAndGo('/join')}
            variant="secondary"
            fullWidth
            disabled={!isValid}
          >
            Join with a code
          </Button>
        </div>
      </div>
    </main>
  )
}
