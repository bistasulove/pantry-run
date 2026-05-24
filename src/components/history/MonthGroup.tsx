'use client'

interface MonthGroupProps {
  label: string
  children: React.ReactNode
}

// Section heading for a calendar month, used to break up the flat trips list.
// No collapse state — keeps the view scannable and the implementation simple.
export function MonthGroup({ label, children }: MonthGroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-text-secondary text-[13px] leading-snug font-medium tracking-wide uppercase">
        {label}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

export default MonthGroup
