'use client'

import { Check, Copy, Share2 } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/Button'

interface InviteCodeProps {
  code: string
  householdName: string
}

function formatCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (clean.length !== 6) return clean
  return `${clean.slice(0, 3)}-${clean.slice(3)}`
}

// Capability detection that survives SSR hydration. getServerSnapshot drives
// the initial client render so it matches the server; React then transitions
// to getSnapshot post-hydration.
const noopSubscribe = () => () => {}
function getCanShareClient() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}
function getCanShareServer() {
  return false
}

export function InviteCode({ code, householdName }: InviteCodeProps) {
  const [copied, setCopied] = useState(false)
  const formatted = formatCode(code)
  const canShare = useSyncExternalStore(noopSubscribe, getCanShareClient, getCanShareServer)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[InviteCode] clipboard write failed', err)
    }
  }

  async function handleShare() {
    const shareText = `Join ${householdName} on Pantry Run with code ${formatted}.`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Pantry Run invite',
          text: shareText,
        })
        return
      } catch (err) {
        // User cancelled the share sheet — fall through to clipboard.
        if ((err as DOMException)?.name === 'AbortError') return
        console.error('[InviteCode] share failed, falling back to clipboard', err)
      }
    }
    await copyToClipboard()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        aria-label={`Invite code ${formatted.split('').join(' ')}`}
        className="bg-bg-surface border-border-default text-text-primary rounded-xl border px-6 py-5 font-mono text-[32px] leading-tight font-bold tracking-[0.2em] tabular-nums select-all"
      >
        {formatted}
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={handleShare} variant="primary" fullWidth>
          <Share2 size={18} strokeWidth={1.5} aria-hidden />
          {canShare ? 'Share invite' : 'Copy invite'}
        </Button>
        {canShare ? (
          <Button onClick={copyToClipboard} variant="secondary" fullWidth>
            {copied ? (
              <Check size={18} strokeWidth={1.5} aria-hidden />
            ) : (
              <Copy size={18} strokeWidth={1.5} aria-hidden />
            )}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
        ) : null}
        <p
          aria-live="polite"
          className={`text-text-secondary text-center text-[12px] leading-snug ${copied ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
        >
          Copied to clipboard
        </p>
      </div>
    </div>
  )
}

export default InviteCode
