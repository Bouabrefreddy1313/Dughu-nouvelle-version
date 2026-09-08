"use client"

import { useRouter, usePathname } from "next/navigation"
import { Home, Zap, Play, Video, Clapperboard, UsersRound, BriefcaseBusiness } from "lucide-react"
import { cn } from "@/lib/utils"
import { useScrollDirection } from "@/hooks/useScrollDirection"

interface MobileBottomNavProps {
  user?: { name?: string | null; avatar?: string | null } | null
}

const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "Accueil" },
  { href: "/capsules", icon: Clapperboard, label: "Capsules" },
  { href: "/akwaplay", icon: Play, label: "Akwaplay" },
  { href: "/videos", icon: Video, label: "Vidéos" },
  { href: "/profile/relations?type=friend", icon: UsersRound, label: "Fraterniser" },
  { href: "/profile/relations?type=network", icon: BriefcaseBusiness, label: "Réseauter" },
]

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const scrollDirection = useScrollDirection({ threshold: 8, offset: 56 })

  return (
    <nav
      className={cn(
        // Positionnement et apparence de base
        "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white dark:bg-[#1A1A1A]/95 dark:backdrop-blur-md border-t border-gray-200 dark:border-white/10 lg:hidden",
        // Hauteur : 58px + safe-area-inset-bottom (encoche iPhone)
        // La safe-area assure que les boutons ne sont jamais sous la barre système
        "h-[calc(58px+env(safe-area-inset-bottom,0px))]",
        // Padding bottom pour pousser les items au-dessus de la zone système
        "[padding-bottom:max(4px,env(safe-area-inset-bottom))]",
        // Scroll-aware : masquage fluide vers le bas sur mobile uniquement
        // GPU-friendly : transform uniquement, pas de height/top
        "transition-transform duration-300 ease-in-out",
        scrollDirection === "down"
          ? "translate-y-full"
          : "translate-y-0",
      )}
      aria-label="Navigation principale mobile"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href === "/home" && pathname === "/")
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-[58px] min-w-0 flex-1 transition-colors",
              isActive ? "text-[#A35A2B] dark:text-[#B46D1C]" : "text-[#65676B] dark:text-[#A1A1AA] hover:text-[#A35A2B] dark:hover:text-[#B46D1C]"
            )}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className={cn(
              "text-[10px] font-medium truncate",
              isActive && "font-semibold"
            )}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}