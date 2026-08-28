"use client"

import { useRouter, usePathname } from "next/navigation"
import { Home, Zap, Play, Video, UserCircle2, Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileBottomNavProps {
  user?: { name?: string | null; avatar?: string | null } | null
}

const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "Accueil" },
  { href: "/flash", icon: Zap, label: "Flash" },
  { href: "/capsules", icon: Clapperboard, label: "Capsules" },
  { href: "/akwaplay", icon: Play, label: "Play" },
  { href: "/videos", icon: Video, label: "Vidéos" },
  { href: "/profile", icon: UserCircle2, label: "Profil" },
]

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Masquer sur desktop (lg+)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white border-t border-gray-200 h-[58px] pb-1 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href === "/home" && pathname === "/")
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-full min-w-0 flex-1 transition-colors",
              isActive ? "text-[#A35A2B]" : "text-[#65676B] hover:text-[#A35A2B]"
            )}
            aria-label={item.label}
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