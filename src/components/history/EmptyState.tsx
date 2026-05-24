import { Clock, WifiOff } from 'lucide-react'

interface HistoryEmptyStateProps {
  variant: 'no-trips' | 'offline'
}

export function HistoryEmptyState({ variant }: HistoryEmptyStateProps) {
  const isOffline = variant === 'offline'
  const Icon = isOffline ? WifiOff : Clock
  const title = isOffline ? "You're offline" : 'No trips yet'
  const body = isOffline
    ? 'Shopping history loads when you reconnect.'
    : 'Your first trip will appear here once you finish shopping.'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        aria-hidden
        className="bg-bg-surface border-border-default text-text-secondary flex h-20 w-20 items-center justify-center rounded-full border"
      >
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-text-primary text-[24px] leading-snug font-bold">{title}</h2>
      <p className="text-text-secondary max-w-xs text-[16px] leading-relaxed">{body}</p>
    </div>
  )
}

export default HistoryEmptyState
