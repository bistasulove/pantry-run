import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border-default/60 bg-bg-surface flex h-12 w-full items-stretch border-b">
        <Skeleton className="my-3 ml-4 h-6 w-24" />
        <Skeleton className="my-3 ml-6 h-6 w-16" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading reminders">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  )
}
