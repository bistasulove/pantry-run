import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <header className="px-4 pt-6 pb-3">
        <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
          Shopping history
        </h1>
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Trips you and your household have finished.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading shopping history">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  )
}
