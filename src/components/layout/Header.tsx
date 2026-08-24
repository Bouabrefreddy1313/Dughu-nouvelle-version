"use client"

import { useState, useRef, useEffect } from "react"
import { Home, Video, Zap, Play, Search, X, LayoutGrid, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import Badge from "@/components/common/Badge"
import ProfileMenu from "@/components/layout/ProfileMenu"

interface HeaderProps {
  user?: {
    name?: string | null
    username?: string | null
    avatar?: string | null
    image?: string | null
  } | null
  onLogout?: () => void
  onSearch?: (q: string) => void
  onMenuClick?: () => void
  chatOpen?: boolean
  onToggleChat?: () => void
}

export default function Header({ user, onLogout, onSearch, onMenuClick, chatOpen, onToggleChat }: HeaderProps) {
  const [q, setQ] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const mobileSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchRef.current?.focus()
    }
  }, [mobileSearchOpen])

  const navItems = [
    { icon: <Home size={24} />, label: "Accueil", active: true, href: "/home" },
    { icon: <Video size={24} />, label: "Vidéos", href: "/videos" },
    { icon: <Zap size={24} />, label: "Flash", href: "/flash" },
    { icon: <Play size={24} />, label: "Akwaplay", href: "/akwaplay" },
    { icon: <UserCheck size={24} />, label: "Abonnés" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-white shadow-sm z-50 flex items-center justify-between gap-1 px-2 sm:gap-2 sm:px-4">
      {/* ═════ GAUCHE : Hamburger + Logo + Recherche ═════ */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <button
          onClick={onMenuClick}
          aria-label="Menu"
          className="lg:hidden -ml-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex shrink-0 items-center justify-center text-[#050505] hover:bg-[#F0F2F5]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <a href="/home" className="shrink-0">
          <img src="/images/logo.png" alt="Dughu" className="h-10 w-auto max-w-[80px] sm:max-w-[120px] object-contain object-left" />
        </a>

        {/* Barre de recherche AGRANDIE (desktop) */}
        <div className="hidden lg:flex min-w-0 items-center bg-[#F0F2F5] rounded-full px-3 py-2 w-56">
          <Search size={16} className="text-[#65676B] mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher sur Dughu..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch?.(q)}
            className="bg-transparent outline-none text-[15px] w-full text-[#050505] placeholder-[#65676B] min-w-0"
          />
        </div>
      </div>

      {/* ═════ CENTRE : Navigation ═════ */}
      <nav className="hidden lg:flex min-w-0 items-center justify-center h-full">
        {navItems.map((item, i) => (
          <a
            key={i}
            href={item.href ?? "#"}
            onClick={(event) => !item.href && event.preventDefault()}
            className={cn(
              "relative flex items-center justify-center h-full px-3 lg:px-8 xl:px-10 2xl:px-14 cursor-pointer transition-colors duration-200",
              item.active
                ? "text-[#A35A2A]"
                : "text-[#65676B] hover:bg-[#F0F2F5] hover:text-[#050505] rounded-lg mx-1"
            )}
            title={item.label}
          >
            {item.icon}
            {/* Indicateur actif en dessous */}
            {item.active && (
              <div className="absolute bottom-0 -left-3 -right-3 h-[3px] bg-[#A35A2A] rounded-t-full" />
            )}
          </a>
        ))}
      </nav>

      {/* ═════ DROITE : Recherche mobile + Menu + Notifs + Chat + Profil ═════ */}
      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {/* Recherche (mobile / tablette) */}
        <button
          onClick={() => setMobileSearchOpen((v) => !v)}
          className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#65676B] hover:bg-[#E4E6EB]"
        >
          {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
        </button>

        {/* Menu / Grid (desktop/tablette uniquement) */}
        <button className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-[#050505] transition">
          <LayoutGrid size={20} />
        </button>

        {/* Messagerie */}
        <button
          onClick={onToggleChat}
          className={cn(
            "relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition",
            chatOpen
              ? "bg-[#DBEAFE] text-[#A35A2A]"
              : "text-[#050505]"
          )}
        >
          <img src="/images/msg.png" alt="Messagerie" className="w-8 h-8 object-contain" />
          
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#050505] transition">
          <img src="/images/notif.png" alt="Notifications" className="w-6 h-6 object-contain" />
          <Badge className="absolute -top-1 -right-1 bg-[#FF4444] text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">
            3
          </Badge>
        </button>

        {/* Profil */}
        <ProfileMenu user={user} onLogout={onLogout} open={profileMenuOpen} onOpenChange={setProfileMenuOpen} />
      </div>

      {/* ═════ MOBILE/TABLETTE : Barre de recherche overlay ═════ */}
      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-md p-3 lg:hidden z-50">
          <div className="flex items-center bg-[#F0F2F5] rounded-full px-4 py-2.5">
            <Search size={18} className="text-[#65676B] mr-2.5 shrink-0" />
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Recherche sur Dughu..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSearch?.(q)
                  setMobileSearchOpen(false)
                }
              }}
              className="bg-transparent outline-none text-sm w-full text-[#050505] placeholder-[#65676B]"
            />
          </div>
        </div>
      )}
    </header>
  )
}
