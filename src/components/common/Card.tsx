"use client"

import { cn } from "@/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-[#1E1E1E] text-foreground rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] border border-[#ececec] dark:border-white/10 transition-colors duration-200",
        className
      )}
    >
      {children}
    </div>
  )
}