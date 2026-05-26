'use client'

import { Bell, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { usePushNotifications, type PushDevice } from '@/hooks/usePushNotifications'

const isDev = process.env.NODE_ENV !== 'production'

function formatJoinedDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotificationsSection() {
  const { status, devices, thisDeviceId, subscribe, unsubscribe, removeDevice, sendTest, error } =
    usePushNotifications()
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const [busy, setBusy] = useState(false)

  async function withBusy(label: string, op: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await op()
      setToast({ message: label })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <Bell size={18} strokeWidth={1.5} className="text-text-secondary" />
        <h3 className="text-text-primary text-[17px] leading-normal font-semibold">
          Notifications
        </h3>
      </header>

      {status === 'loading' && (
        <p className="text-text-secondary text-[14px] leading-relaxed">Checking support…</p>
      )}

      {status === 'unsupported' && (
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Your browser doesn&rsquo;t support push notifications. Use Chrome, Firefox, Edge, or
          Safari (macOS 13+ / iOS 16.4+ installed to the home screen).
        </p>
      )}

      {status === 'sw_not_registered' && (
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Push notifications need the service worker, which isn&rsquo;t registered in{' '}
          <span className="text-text-primary">npm run dev</span>. To test push, run{' '}
          <span className="text-text-primary">npm run build &amp;&amp; npm run start</span>.
        </p>
      )}

      {status === 'ios_needs_pwa' && (
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Notifications on iPhone require installing Pantry Run to your Home Screen first. Tap the
          Share button in Safari, then <span className="text-text-primary">Add to Home Screen</span>
          .
        </p>
      )}

      {status === 'denied' && (
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Notifications are blocked for this site. Re-enable them in your browser&rsquo;s site
          settings, then come back here to turn them on.
        </p>
      )}

      {status === 'disabled' && (
        <>
          <p className="text-text-secondary text-[14px] leading-relaxed">
            Get a quiet ping when something needs your attention. You can turn this off anytime.
          </p>
          <Button
            variant="primary"
            onClick={() => withBusy('Notifications enabled', subscribe)}
            disabled={busy}
          >
            {busy ? 'Enabling…' : 'Enable notifications'}
          </Button>
        </>
      )}

      {status === 'enabled' && (
        <>
          <p className="text-text-secondary text-[14px] leading-relaxed">
            Notifications are on. Manage your devices below.
          </p>
          <DeviceList
            devices={devices}
            thisDeviceId={thisDeviceId}
            disabled={busy}
            onRemove={(id) => withBusy('Device removed', () => removeDevice(id))}
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => withBusy('Notifications turned off', unsubscribe)}
              disabled={busy}
            >
              Turn off on this device
            </Button>
            {isDev && (
              <Button
                variant="ghost"
                onClick={async () => {
                  if (busy) return
                  setBusy(true)
                  try {
                    const result = await sendTest()
                    setToast({
                      message: `Sent: ${result.sent}, expired: ${result.expired}, failed: ${result.failed}`,
                    })
                  } catch (err) {
                    setToast({
                      message: err instanceof Error ? err.message : 'Test failed',
                    })
                  } finally {
                    setBusy(false)
                  }
                }}
                disabled={busy}
              >
                Send test notification
              </Button>
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-destructive text-[14px] leading-relaxed">
          {error}
        </p>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </section>
  )
}

interface DeviceListProps {
  devices: PushDevice[]
  thisDeviceId: string | null
  disabled: boolean
  onRemove: (id: string) => void
}

function DeviceList({ devices, thisDeviceId, disabled, onRemove }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <p className="text-text-secondary text-[14px] leading-relaxed">No devices registered yet.</p>
    )
  }
  return (
    <ul className="border-border-default flex flex-col gap-0 overflow-hidden rounded-xl border">
      {devices.map((device, idx) => {
        const isCurrent = device.id === thisDeviceId
        const label = device.user_agent_label || 'Browser'
        return (
          <li
            key={device.id}
            className={`bg-bg-surface flex items-center justify-between gap-3 px-4 py-3 ${
              idx > 0 ? 'border-border-default border-t' : ''
            }`}
          >
            <div className="flex flex-col">
              <span className="text-text-primary text-[14px] leading-normal font-medium">
                {label}
                {isCurrent && (
                  <span className="text-text-secondary ml-2 text-[12px] font-normal">
                    (this device)
                  </span>
                )}
              </span>
              <span className="text-text-secondary text-[12px] leading-snug">
                Added {formatJoinedDate(device.created_at)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(device.id)}
              disabled={disabled}
              aria-label={`Remove ${label}`}
              className="text-text-secondary hover:text-destructive focus-visible:outline-accent inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} strokeWidth={1.5} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default NotificationsSection
