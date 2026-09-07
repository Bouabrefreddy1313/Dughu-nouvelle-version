"use client"

import { useState } from "react"
import { BriefcaseBusiness, Home, Video, Zap, Play, Search, X, LayoutGrid, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import Badge from "@/components/common/Badge"
import ProfileMenu from "@/components/layout/ProfileMenu"
import GlobalSearch from "@/components/common/GlobalSearch"
import NotificationDropdown from "@/components/notifications/NotificationDropdown"
import { useNotificationUnreadCount } from "@/hooks/queries/use-notifications"
import { useScrollDirection } from "@/hooks/useScrollDirection"

interface HeaderProps {
  user?: {
    id?: string | number
    name?: string | null
    username?: string | null
    avatar?: string | null
    image?: string | null
    dughu?: { userId?: string }
    [key: string]: unknown
  } | null
  onLogout?: () => void
  onSearch?: (q: string) => void
  onMenuClick?: () => void
  chatOpen?: boolean
  onToggleChat?: () => void
  /** Ouvre/ferme la sidebar droite (mobile/tablette). */
  onToggleRightSidebar?: () => void
  /** État d'ouverture de la sidebar droite (mobile/tablette) — style actif du bouton grille. */
  rightSidebarOpen?: boolean
  /** Masque le header sur mobile/tablette (ex : profil en couverture plein écran). */
  hideOnMobile?: boolean
  /** Total de messages non lus (badge sur l'icône messagerie). */
  messageUnreadCount?: number
}

export default function Header({ user, onLogout, onSearch, onMenuClick, chatOpen, onToggleChat, onToggleRightSidebar, rightSidebarOpen = false, hideOnMobile = false, messageUnreadCount = 0 }: HeaderProps) {
  const [q, setQ] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [desktopQuery, setDesktopQuery] = useState("")
  const [mobileQuery, setMobileQuery] = useState("")

  const userId = String(user?.id || user?.dughu?.userId || "")
  const { badgeCount24h } = useNotificationUnreadCount(userId)


  const navItems = [
    { icon: <Home size={22} />, label: "Accueil", active: true, href: "/home", tooltipId: "accueil-tooltip" },
    { icon: <Video size={22} />, label: "Vidéos", href: "/videos", tooltipId: "videos-tooltip" },
    { icon: <Zap size={22} />, label: "Flash", href: "/flash", tooltipId: "flash-tooltip" },
    { icon: <Play size={22} />, label: "Akwaplay", href: "/akwaplay", tooltipId: "akwaplay-tooltip" },
  ]

  const staticRelationItems = [
    { icon: <UsersRound size={22} />, label: "Fraternisés", tooltipId: "fraternises-tooltip" },
    { icon: <BriefcaseBusiness size={22} />, label: "Réseautés", tooltipId: "reseautes-tooltip" },
  ]

  const scrollDirection = useScrollDirection({ threshold: 8, offset: 56 })

  return (
    <header
      className={cn(
        // Structure de base
        "fixed top-0 left-0 right-0 h-[56px] bg-white shadow-sm z-50 flex items-center justify-between gap-1 px-2 sm:gap-2 sm:px-4",
        // Safe-area iOS (encoche / Dynamic Island)
        "[padding-top:max(0px,env(safe-area-inset-top))]",
        // Scroll-aware : masquage fluide sur mobile uniquement
        // lg+ : toujours visible (pas de transform)
        "transition-transform duration-300 ease-in-out",
        scrollDirection === "down" ? "-translate-y-full lg:translate-y-0" : "translate-y-0",
        hideOnMobile && "hidden lg:flex"
      )}
    >
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
        <GlobalSearch value={desktopQuery} onChange={setDesktopQuery} className="hidden w-56 lg:block" inputClassName="text-[15px]" />
      </div>

      {/* ═════ CENTRE : Navigation ═════ */}
      <nav className="hidden lg:flex min-w-0 items-center justify-center gap-20 h-full">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-label={item.label}
            aria-describedby={item.tooltipId}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center justify-center rounded-lg px-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
              item.active
                ? "text-[#A35A2A]"
                : "text-[#65676B] hover:bg-[#F0F2F5] hover:text-[#050505]"
            )}
          >
            {item.icon}
            {item.active && (
              <span aria-hidden="true" className="absolute -bottom-2 left-0 right-0 h-[3px] rounded-t-full bg-[#A35A2A]" />
            )}
            <span
              id={item.tooltipId}
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2D2D2D] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}
            </span>
          </a>
        ))}
        {staticRelationItems.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            aria-describedby={item.tooltipId}
            className="group relative flex h-10 items-center justify-center rounded-lg px-3 text-[#65676B] transition-colors duration-200 hover:bg-[#F0F2F5] hover:text-[#050505] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
          >
            {item.icon}
            <span
              id={item.tooltipId}
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2D2D2D] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* ═════ DROITE : Recherche mobile + Menu + Notifs + Chat + Profil ═════ */}
      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {/* Recherche (mobile / tablette) */}
        <button
          onClick={() => setMobileSearchOpen((v) => !v)}
          aria-label={mobileSearchOpen ? "Fermer la recherche" : "Ouvrir la recherche"}
          className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#65676B] hover:bg-[#E4E6EB]"
        >
          {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
        </button>

        {/* Sidebar droite (mobile / tablette) : bouton 4 carrés → tiroir droit */}
        <button
          onClick={onToggleRightSidebar}
          aria-label={rightSidebarOpen ? "Fermer la sidebar droite" : "Ouvrir la sidebar droite"}
          aria-expanded={rightSidebarOpen}
          className={cn(
            "lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition",
            rightSidebarOpen
              ? "bg-[#DBEAFE] text-[#A35A2A]"
              : "text-[#050505] hover:bg-[#F0F2F5]"
          )}
        >
          <LayoutGrid size={20} />
        </button>

        {/* Messagerie */}
        <button
          onClick={onToggleChat}
          className={cn(
            "relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition",
            chatOpen
              ? "bg-[#DBEAFE] text-[#A35A2A]"
              : "text-[#050505] hover:bg-[#F0F2F5]"
          )}
          aria-label={messageUnreadCount > 0 ? `Messagerie (${messageUnreadCount} message(s) non lu(s))` : "Messagerie"}
        >
          <img src="/images/msg.png" alt="Messagerie" className="w-8 h-8 object-contain" />
          {messageUnreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-[#A35A2A] text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">
              {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
            </Badge>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label={badgeCount24h > 0 ? `Notifications (${badgeCount24h} notification${badgeCount24h > 1 ? "s" : ""} récentes)` : "Notifications"}
            aria-expanded={notificationsOpen}
            className={cn(
              "relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#050505] transition cursor-pointer",
              notificationsOpen ? "bg-[#DBEAFE]/70" : "hover:bg-[#F0F2F5]"
            )}
          >
            <img src="/images/notif.png" alt="Notifications" className="w-6 h-6 object-contain" />
            {badgeCount24h > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-[#FF4444] text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white font-bold">
                {badgeCount24h > 99 ? "99+" : badgeCount24h}
              </Badge>
            )}
          </button>

          <NotificationDropdown
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            userId={userId}
          />
        </div>

        {/* Profil */}
        <ProfileMenu user={user} onLogout={onLogout} open={profileMenuOpen} onOpenChange={setProfileMenuOpen} />
      </div>

      {/* ═════ MOBILE/TABLETTE : Barre de recherche overlay ═════ */}
      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-md p-3 lg:hidden z-50">
          <GlobalSearch
            value={mobileQuery}
            onChange={setMobileQuery}
            autoFocus
            onNavigate={() => setMobileSearchOpen(false)}
            className="w-full"
          />
        </div>
      )}
    </header>
  )
}
