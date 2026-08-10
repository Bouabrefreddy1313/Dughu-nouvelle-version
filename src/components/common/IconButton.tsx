"use client"

import { cn } from "@/lib/utils"

interface IconButtonProps {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  ariaLabel?: string
}

const SIZES = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-[46px] h-[46px]",
}

export default function IconButton({
  children,
  onClick,
  active,
  size = "md",
  className,
  ariaLabel,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer select-none",
        SIZES[size],
        active ? "bg-[#DBEAFE] text-[#A35A2A]" : "bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]",
        className
      )}
    >
      {children}
    </button>
  )
}