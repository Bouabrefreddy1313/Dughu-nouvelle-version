"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  Home,
  User,
  Gift,
  Clapperboard,
  Music2,
  Zap,
  Star,
  ArrowLeft,
  Video,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AkwaSidebarProps {
  open: boolean
  onClose: () => void
  onPublishClick: () => void
  drawer?: boolean
}

const NAV_ITEMS = [
  { id: "home", label: "Accueil", icon: Home, href: "/akwaplay" },
  { id: "profil", label: "Profil", icon: User, href: "/akwaplay/profile" },
  { id: "tendances", label: "Tendances", icon: Zap, href: "/akwaplay/trending" },
  { id: "shorts", label: "Capsules", icon: Clapperboard, href: "/akwaplay/shorts" },
  { id: "musiques", label: "Musiques libres", icon: Music2, href: "/akwaplay/musiques" },
  { id: "favoris", label: "Favoris", icon: Star, href: "/akwaplay/favorites" },
  { id: "points", label: "Points", icon: Gift, href: "/akwaplay/points" },
] as const

export default function AkwaSidebar({ open, onClose, onPublishClick, drawer = false }: AkwaSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  const navigate = (href: string) => {
    router.push(href)
    // Sur mobile ou en mode drawer : ferme la sidebar après navigation
    if (drawer || window.innerWidth < 1024) onClose()
  }

  return (
    <>
      {/* Overlay sombre */}
      {open && (
        <div
          className={cn(
            "fixed inset-0 bg-black/60 transition-opacity",
            drawer ? "z-40" : "z-30 lg:hidden"
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 flex flex-col transition-transform duration-300 ease-in-out",
          "w-[220px] overflow-y-auto overflow-x-hidden",
          drawer ? "z-50 shadow-2xl" : "z-30",
          open ? "translate-x-0" : "-translate-x-full",
          !drawer && open ? "lg:translate-x-0" : "",
          !drawer && !open ? "lg:-translate-x-full" : ""
        )}
        style={{ backgroundColor: "#1c1c1c", borderRight: "1px solid #2a2a2a" }}
        aria-label="Navigation Akwaplay"
      >
        {/* Nav principale */}
        <nav className="flex-1 py-3">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
              const active = isActive(href)
              return (
                <li key={id}>
                  <button
                    onClick={() => navigate(href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                      active
                        ? "text-white"
                        : "text-[#9a9a9a] hover:text-white hover:bg-white/5"
                    )}
                    style={active ? { backgroundColor: "rgba(255,255,255,0.1)" } : {}}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-[#985810]" : ""}
                    />
                    <span>{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Bouton Publier (mobile uniquement) */}
          <div className="px-3 mt-4 sm:hidden">
            <button
              onClick={onPublishClick}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition hover:brightness-110"
              style={{ backgroundColor: "#985810", color: "#ffffff" }}
            >
              <Video size={15} />
              <span>Publier une vidéo</span>
            </button>
          </div>
        </nav>

        {/* Séparateur + lien Dughu */}
        <div
          className="px-2 py-3"
          style={{ borderTop: "1px solid #2a2a2a" }}
        >
          <button
            onClick={() => router.push("/home")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#9a9a9a] hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Retour Dughu</span>
          </button>
        </div>
      </aside>
    </>
  )
}
