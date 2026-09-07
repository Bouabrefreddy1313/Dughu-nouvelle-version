"use client"

import { Check, LoaderCircle, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageLikeButtonProps {
  isLiked: boolean
  isLoading?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}

export function PageLikeButton({
  isLiked,
  isLoading = false,
  onClick,
  className,
}: PageLikeButtonProps) {
  if (isLiked) {
    return null
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      disabled={isLoading}
      aria-pressed={false}
      aria-label="J'aime cet espace"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 min-w-0 sm:min-w-[84px] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px]",
        "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]",
        className
      )}
    >
      {isLoading ? (
        <LoaderCircle size={13} className="animate-spin sm:w-[15px] sm:h-[15px]" aria-hidden="true" />
      ) : (
        <ThumbsUp size={13} className="sm:w-[15px] sm:h-[15px]" aria-hidden="true" />
      )}
      <span>J&apos;aime</span>
    </button>
  )
}

export default PageLikeButton
