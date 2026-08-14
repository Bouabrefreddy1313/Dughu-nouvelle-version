"use client"

import { cn } from "@/lib/utils"

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  verified?: boolean
  /** Supprime le cercle de fond coloré : cache la photo sans anneau/ronde coloré autour. */
  bare?: boolean
}

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
}

export default function Avatar({ src, name, size = "md", className, verified, bare }: AvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className={cn(
        SIZES[size],
        bare
          ? "rounded-full overflow-hidden select-none bg-transparent"
          : "rounded-full bg-gradient-to-br from-[#A35A2A] to-[#B87333] flex items-center justify-center text-white font-bold overflow-hidden select-none"
      )}>
        {src ? (
          <img src={src} alt={name || ""} className="w-full h-full object-cover" />
        ) : (
          <img src="/images/avatar.png" alt="Avatar par défaut" className="w-full h-full object-cover" />
        )}
      </div>
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-[#A35A2A] rounded-full p-0.5 border-2 border-white">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  )
}