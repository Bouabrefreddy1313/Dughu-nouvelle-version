"use client"

import { LoaderCircle, UserCheck, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  isFollowing: boolean
  isLoading?: boolean
  onClick: () => void
  className?: string
}

export function FollowButton({
  isFollowing,
  isLoading = false,
  onClick,
  className,
}: FollowButtonProps) {
  const Icon = isFollowing ? UserCheck : UserPlus

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-pressed={isFollowing}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 min-w-0 sm:min-w-[104px] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px]",
        isFollowing
          ? "bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6E9]"
          : "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]",
        className
      )}
    >
      {isLoading ? (
        <LoaderCircle size={13} className="animate-spin sm:w-[15px] sm:h-[15px]" aria-hidden="true" />
      ) : (
        <Icon size={13} className="sm:w-[15px] sm:h-[15px]" aria-hidden="true" />
      )}
      <span>{isFollowing ? "Abonné" : "S'abonner"}</span>
    </button>
  )
}

export default FollowButton
