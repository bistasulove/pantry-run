import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div
      className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </header>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
