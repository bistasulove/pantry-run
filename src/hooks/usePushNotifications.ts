'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { userAgentLabel } from '@/lib/push/ua-label'
import { createClient } from '@/lib/supabase/client'

type SubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row']

export type PushDevice = Pick<
  SubscriptionRow,
  'id' | 'endpoint' | 'user_agent_label' | 'created_at'
>

// status state machine — drives the Settings UI directly.
//
//   'loading'         — initial probe in progress
//   'unsupported'     — browser lacks the APIs (e.g. Firefox on iOS, old Edge)
//   'ios_needs_pwa'   — iOS Safari that's not installed to the home screen
//                       (Push requires PWA install on iOS 16.4+)
//   'denied'          — user previously hit "Block" on the permission prompt
//   'disabled'        — supported + permission default, no sub registered
//   'enabled'         — at least one sub registered on this user
//
// 'denied' is recoverable only via the browser's site-settings UI; we surface
// that in the disabled-state copy rather than retrying the prompt.
export type PushStatus =
  | 'loading'
  | 'unsupported'
  | 'ios_needs_pwa'
  | 'sw_not_registered'
  | 'denied'
  | 'disabled'
  | 'enabled'

interface UsePushNotificationsResult {
  status: PushStatus
  devices: PushDevice[]
  thisDeviceId: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  removeDevice: (id: string) => Promise<void>
  error: string | null
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/.test(ua)
  // Chrome iOS reports CriOS; we want true Safari only.
  const isSafari = /Safari\//.test(ua) && !/CriOS\/|FxiOS\/|EdgiOS\//.test(ua)
  return isIos && isSafari
}

function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari sets navigator.standalone in installed PWAs.
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

function detectStatus(): Exclude<PushStatus, 'disabled' | 'enabled'> | 'ok' {
  if (typeof window === 'undefined') return 'loading'
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) {
    if (isIosSafari() && !isInstalledPwa()) return 'ios_needs_pwa'
    return 'unsupported'
  }
  const permission = Notification.permission
  if (permission === 'denied') return 'denied'
  return 'ok'
}

// VAPID public keys are base64url-encoded; PushManager.subscribe needs the
// raw Uint8Array. Spec helper.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const padded = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  // Allocate an explicit ArrayBuffer so the resulting Uint8Array is typed
  // as Uint8Array<ArrayBuffer> (what PushManager.subscribe expects under
  // TS5's stricter BufferSource typing). Without this, a bare Uint8Array
  // ends up as Uint8Array<ArrayBufferLike>, which includes SharedArrayBuffer.
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Subscription missing endpoint or keys')
  }
  const label = typeof navigator !== 'undefined' ? userAgentLabel(navigator.userAgent) : 'Browser'
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, p256dh, auth, userAgentLabel: label }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`subscribe failed: ${res.status} ${detail}`)
  }
}

async function deleteSubscriptionRow(args: { endpoint?: string; id?: string }): Promise<void> {
  const res = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`unsubscribe failed: ${res.status} ${detail}`)
  }
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [devices, setDevices] = useState<PushDevice[]>([])
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  const refreshDevices = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, user_agent_label, created_at')
      .order('created_at', { ascending: false })
    if (queryError) {
      // RLS limits this to the user's own rows; an error here is real (network).
      setError(queryError.message)
      return
    }
    setDevices(data ?? [])
  }, [supabase])

  // Initial probe + device list. Also issues an idempotent re-subscribe POST
  // when a browser subscription exists — this is the self-heal path for users
  // who switched households since their last open (the server overwrites
  // household_id on upsert so fan-out targets the new home).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const probed = detectStatus()
      if (probed !== 'ok') {
        if (!cancelled) setStatus(probed)
        return
      }
      // Fast-path: if no SW is registered yet, awaiting `ready` would hang
      // forever. This happens in `next dev` because ServiceWorkerRegistrar
      // skips registration to avoid HMR interference — surface that explicitly
      // instead of leaving the UI stuck at 'loading'. In production this
      // branch is effectively dead (the registrar always runs), but it's a
      // useful guard if SW registration ever fails for other reasons.
      const regs = await navigator.serviceWorker.getRegistrations()
      if (regs.length === 0) {
        if (!cancelled) setStatus('sw_not_registered')
        return
      }
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (cancelled) return
        if (existing) {
          setThisEndpoint(existing.endpoint)
          // Self-heal — server idempotent.
          try {
            await postSubscription(existing)
          } catch (err) {
            console.warn('[push] self-heal subscribe failed', err)
          }
          setStatus('enabled')
          await refreshDevices()
        } else {
          setStatus('disabled')
          // No browser sub here, but the user may have other devices enabled.
          await refreshDevices()
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('disabled')
          setError(err instanceof Error ? err.message : 'probe failed')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshDevices])

  // Realtime device-list sync so removing a device on another tab updates here.
  useEffect(() => {
    if (
      status === 'loading' ||
      status === 'unsupported' ||
      status === 'ios_needs_pwa' ||
      status === 'sw_not_registered'
    )
      return
    const channel = supabase
      .channel('push-subscriptions-self')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'push_subscriptions' }, () => {
        void refreshDevices()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [status, supabase, refreshDevices])

  // pushsubscriptionchange — the SW posts a message and we re-subscribe.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== 'pushsubscriptionchange') return
      void (async () => {
        try {
          if (!vapidPublicKey) return
          const reg = await navigator.serviceWorker.ready
          const fresh = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          })
          await postSubscription(fresh)
          setThisEndpoint(fresh.endpoint)
          await refreshDevices()
        } catch (err) {
          console.warn('[push] re-subscribe after change failed', err)
        }
      })()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [vapidPublicKey, refreshDevices])

  const subscribe = useCallback(async () => {
    setError(null)
    if (!vapidPublicKey) {
      setError('Push not configured (missing VAPID public key)')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }
      if (permission !== 'granted') {
        // 'default' = user dismissed the prompt without choosing.
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }))
      await postSubscription(sub)
      setThisEndpoint(sub.endpoint)
      setStatus('enabled')
      await refreshDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'subscribe failed')
    }
  }, [vapidPublicKey, refreshDevices])

  const unsubscribe = useCallback(async () => {
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const endpoint = sub?.endpoint ?? thisEndpoint ?? undefined
      if (sub) await sub.unsubscribe()
      if (endpoint) await deleteSubscriptionRow({ endpoint })
      setThisEndpoint(null)
      setStatus('disabled')
      await refreshDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unsubscribe failed')
    }
  }, [thisEndpoint, refreshDevices])

  const removeDevice = useCallback(
    async (id: string) => {
      setError(null)
      try {
        // If the row being removed is this browser's, also clear the local sub.
        const isCurrent = devices.find((d) => d.id === id)?.endpoint === thisEndpoint
        if (isCurrent) {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) await sub.unsubscribe()
          setThisEndpoint(null)
          setStatus('disabled')
        }
        await deleteSubscriptionRow({ id })
        await refreshDevices()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'remove failed')
      }
    },
    [devices, thisEndpoint, refreshDevices],
  )

  const thisDeviceId = useMemo(() => {
    if (!thisEndpoint) return null
    return devices.find((d) => d.endpoint === thisEndpoint)?.id ?? null
  }, [devices, thisEndpoint])

  return {
    status,
    devices,
    thisDeviceId,
    subscribe,
    unsubscribe,
    removeDevice,
    error,
  }
}
