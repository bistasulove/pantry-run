interface SkeletonProps {
  className?: string
  'aria-label'?: string
}

export function Skeleton({ className = '', ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden={rest['aria-label'] ? undefined : true}
      aria-label={rest['aria-label']}
      className={`bg-border-default/60 animate-pulse rounded-xl ${className}`.trim()}
    />
  )
}

export default Skeleton
