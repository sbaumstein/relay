import { Star } from 'lucide-react'

interface StarRatingProps {
  stars: number       // 0–5
  total: number       // total claims (to check threshold)
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function StarRating({ stars, total, showLabel = false, size = 'sm' }: StarRatingProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  if (total < 5) {
    return (
      <span className="text-xs text-muted-foreground">New seller</span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${iconSize} ${i <= stars ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground ml-1">
          ({total} transfer{total !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  )
}
