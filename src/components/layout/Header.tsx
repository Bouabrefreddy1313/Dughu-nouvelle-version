"use client"

import { useState, useRef, useEffect } from "react"
import { Home, Video, Zap, Play, Search, X, LayoutGrid, UserRoundPlus, UserCheck } from "lucide-react"
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
  chatOpen?: boolean
  onToggleChat?: () => void
}

export default function Header({ user, onLogout, onSearch, chatOpen, onToggleChat }: HeaderProps) {
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
    { icon: <UserRoundPlus size={24} />, label: "Réseauter" },
    { icon: <UserCheck size={24} />, label: "Abonnés" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-white shadow-sm z-50 flex items-center justify-between pl-0 pr-4">
      {/* ═════ GAUCHE : Logo + Recherche ═════ */}
      <div className="flex items-center gap-1 w-[380px] lg:w-[440px] shrink-0">
        <a href="/home" className="shrink-0 -ml-1">
          <img src="/images/logo.png" alt="Dughu" className="h-10 w-auto object-contain" />
        </a>
        
        {/* Barre de recherche AGRANDIE */}
        <div className="hidden md:flex items-center bg-[#F0F2F5] rounded-full px-3 py-2 w-[160px] lg:w-[200px] -ml-1">
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
      <div className="hidden md:flex items-center h-full absolute left-1/2 -translate-x-[calc(50%+100px)]">
        {navItems.map((item, i) => (
          <a
            key={i}
            href={item.href ?? "#"}
            onClick={(event) => !item.href && event.preventDefault()}
            className={cn(
              "relative flex items-center justify-center h-full px-6 lg:px-9 cursor-pointer transition-colors duration-200",
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
      </div>

      {/* ═════ DROITE : Menu + Notifs + Chat + Profil ═════ */}
      <div className="flex items-center gap-2 w-[320px] justify-end shrink-0">
        {/* Menu / Grid */}
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#050505] transition">
          <LayoutGrid size={20} />
        </button>

        {/* Messagerie */}
        <button
          onClick={onToggleChat}
          className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center transition",
            chatOpen
              ? "bg-[#DBEAFE] text-[#A35A2A]"
              : "text-[#050505]"
          )}
        >
          <img src="/images/msg.png" alt="Messagerie" className="w-8 h-8 object-contain" />
          
        </button>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#050505] transition">
          <img src="/images/notif.png" alt="Notifications" className="w-6 h-6 object-contain" />
          <Badge className="absolute -top-1 -right-1 bg-[#FF4444] text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">
            3
          </Badge>
        </button>

        {/* Profil */}
        <ProfileMenu user={user} onLogout={onLogout} open={profileMenuOpen} onOpenChange={setProfileMenuOpen} />
      </div>

      {/* ═════ MOBILE : Barre de recherche overlay ═════ */}
      <button
        onClick={() => setMobileSearchOpen((v) => !v)}
        className="md:hidden w-10 h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#65676B] hover:bg-[#E4E6EB] ml-2"
      >
        {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
      </button>

      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-md p-3 md:hidden z-50">
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
