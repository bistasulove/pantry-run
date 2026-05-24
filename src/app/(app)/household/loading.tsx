import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div
      className="flex h-full flex-col gap-8 overflow-y-auto px-4 py-6"
      aria-busy="true"
      aria-label="Loading household"
    >
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </header>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="mx-auto h-4 w-32" />
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
    </div>
  )
}
