'use client'

import { SettingsView } from '@/app/(app)/settings/SettingsView'

// Pure client page — the (app) layout already gated auth + membership and
// hydrated userId + displayName into the stores, so we don't need any server
// round trip here. SettingsView reads the user's id and display name from
// the stores it already has.
export default function SettingsPage() {
  return <SettingsView />
}
