import { ShoppingBag } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        aria-hidden
        className="bg-bg-surface border-border-default text-text-secondary flex h-20 w-20 items-center justify-center rounded-full border"
      >
        <ShoppingBag size={32} strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-text-primary text-[24px] leading-snug font-bold">
        Your list is empty
      </h2>
      <p className="text-text-secondary max-w-xs text-[16px] leading-relaxed">
        Tap the bar below to add your first item. Things like &quot;milk&quot; or
        &quot;bananas&quot; sort themselves.
      </p>
    </div>
  )
}

export default EmptyState
