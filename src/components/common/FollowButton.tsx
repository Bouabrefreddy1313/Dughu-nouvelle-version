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
        "inline-flex min-w-[104px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        isFollowing
          ? "bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6E9]"
          : "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]",
        className
      )}
    >
      {isLoading ? (
        <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
      ) : (
        <Icon size={15} aria-hidden="true" />
      )}
      <span>{isFollowing ? "Abonné" : "S'abonner"}</span>
    </button>
  )
}

export default FollowButton
