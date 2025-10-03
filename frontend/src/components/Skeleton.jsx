export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function SkeletonText({ width = '100%', className = '' }) {
  return (
    <div className={`h-4 animate-pulse bg-gray-200 rounded ${className}`} style={{ width }} />
  )
}

export function SkeletonCircle({ size = 40, className = '' }) {
  const px = typeof size === 'number' ? `${size}px` : size
  return (
    <div className={`animate-pulse bg-gray-200 rounded-full ${className}`} style={{ width: px, height: px }} />
  )
}


