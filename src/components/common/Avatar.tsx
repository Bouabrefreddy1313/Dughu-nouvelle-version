"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { resolveMediaUrl } from "@/lib/dughu"

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  verified?: boolean
  /** Supprime le cercle de fond colore : cache la photo sans anneau/ronde colore autour. */
  bare?: boolean
}

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
}

const DIMENSIONS: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
}

const FALLBACK_AVATAR = "/images/avatar.png"

export default function Avatar({ src, name, size = "md", className, verified, bare }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const dim = DIMENSIONS[size] || 40
  const resolved = src ? resolveMediaUrl(src) : ""
  const avatarSrc = (failed || !resolved) ? FALLBACK_AVATAR : resolved

  // Le conteneur externe est arrondi (rounded-full) : une bordure passée via
  // `className` (ex. border-2) épouse la forme ronde de la photo au lieu de
  // former un carré derrière l'avatar.
  return (
    <div className={cn("relative shrink-0 rounded-full", className)}>
      <div className={cn(
        SIZES[size],
        bare
          ? "rounded-full overflow-hidden select-none bg-transparent"
          : "rounded-full bg-gradient-to-br from-[#A35A2A] to-[#B87333] flex items-center justify-center text-white font-bold overflow-hidden select-none"
      )}>
        <Image
          src={avatarSrc}
          alt={name || ""}
          width={dim}
          height={dim}
          className="w-full h-full object-cover"
          sizes={`${dim}px`}
          onError={() => setFailed(true)}
        />
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