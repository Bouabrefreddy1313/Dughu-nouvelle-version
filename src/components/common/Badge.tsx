import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "red" | "yellow" | "green" | "brown"
  className?: string
}

const VARIANTS = {
  default: "bg-[#A35A2A] text-white",
  red: "bg-[#FF4444] text-white",
  yellow: "bg-[#F5C33B] text-[#050505]",
  green: "bg-green-500 text-white",
  brown: "bg-[#A35A2A]/10 text-[#A35A2A]",
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px]",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}