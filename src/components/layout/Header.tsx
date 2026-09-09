"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BriefcaseBusiness, Home, Video, TrendingUp, Play, Search, X, LayoutGrid, UsersRound } from "lucide-react"
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
  const { unreadCount } = useNotificationUnreadCount(userId)

  const pathname = usePathname()

  const navItems = [
    {
      icon: <Home size={22} />,
      label: "Accueil",
      active: pathname === "/home" || pathname === "/",
      href: "/home",
      tooltipId: "accueil-tooltip",
    },
    {
      icon: <Video size={22} />,
      label: "Vidéos",
      active: pathname.startsWith("/videos"),
      href: "/videos",
      tooltipId: "videos-tooltip",
    },
    {
      icon: <TrendingUp size={22} />,
      label: "Tendances",
      active: pathname.startsWith("/tendances"),
      href: "/tendances",
      tooltipId: "tendances-tooltip",
    },
    {
      icon: <Play size={22} />,
      label: "Akwaplay",
      active: pathname.startsWith("/akwaplay"),
      href: "/akwaplay",
      tooltipId: "akwaplay-tooltip",
    },
    {
      icon: <UsersRound size={22} />,
      label: "Fraternisés",
      active: pathname.startsWith("/fraternises"),
      href: "/fraternises",
      tooltipId: "fraternises-tooltip",
    },
    {
      icon: <BriefcaseBusiness size={22} />,
      label: "Réseautés",
      active: pathname.startsWith("/reseautes"),
      href: "/reseautes",
      tooltipId: "reseautes-tooltip",
    },
  ]

  const scrollDirection = useScrollDirection({ threshold: 8, offset: 56 })

  return (
    <header
      className={cn(
        // Structure de base
        "fixed top-0 left-0 right-0 h-[56px] bg-white dark:bg-[#1A1A1A] border-b border-gray-100 dark:border-white/10 shadow-sm z-50 flex items-center justify-between gap-1 px-2 sm:gap-2 sm:px-4",
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
          className="lg:hidden -ml-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex shrink-0 items-center justify-center text-[#050505] dark:text-[#E4E6EB] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link
          href="/home"
          className="shrink-0 cursor-pointer"
        >
          <img src="/images/logo.png" alt="Dughu" className="h-10 w-auto max-w-[80px] sm:max-w-[120px] object-contain object-left" />
        </Link>

        {/* Barre de recherche AGRANDIE (desktop) */}
        <GlobalSearch value={desktopQuery} onChange={setDesktopQuery} className="hidden w-56 lg:block" inputClassName="text-[15px]" />
      </div>

      {/* ═════ CENTRE : Navigation (6 accès directs) ═════ */}
      <nav className="hidden sm:flex min-w-0 items-center justify-center gap-1 sm:gap-2.5 md:gap-5 lg:gap-8 xl:gap-12 h-full">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            aria-describedby={item.tooltipId}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center justify-center rounded-lg px-2 sm:px-2.5 lg:px-3 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
              item.active
                ? "text-[#A35A2A] dark:text-[#B46D1C]"
                : "text-[#65676B] dark:text-[#A1A1AA] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] hover:text-[#050505] dark:hover:text-[#F3F4F6]"
            )}
          >
            {item.icon}
            {item.active && (
              <span aria-hidden="true" className="absolute -bottom-2 left-0 right-0 h-[3px] rounded-t-full bg-[#A35A2A] dark:bg-[#B46D1C]" />
            )}
            <span
              id={item.tooltipId}
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2D2D2D] dark:bg-[#383838] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* ═════ DROITE : Recherche mobile + Menu + Notifs + Chat + Profil ═════ */}
      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {/* Recherche (mobile / tablette) */}
        <button
          onClick={() => setMobileSearchOpen((v) => !v)}
          aria-label={mobileSearchOpen ? "Fermer la recherche" : "Ouvrir la recherche"}
          className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] flex items-center justify-center text-[#65676B] dark:text-[#E4E6EB] hover:bg-[#E4E6EB] dark:hover:bg-[#333333]"
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
              ? "bg-[#DBEAFE] dark:bg-[#985810]/30 text-[#A35A2A] dark:text-[#C07520]"
              : "text-[#050505] dark:text-[#E4E6EB] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A]"
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
              ? "bg-[#DBEAFE] dark:bg-[#985810]/30 text-[#A35A2A] dark:text-[#C07520]"
              : "text-[#050505] dark:text-[#E4E6EB] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A]"
          )}
          aria-label={messageUnreadCount > 0 ? `Messagerie (${messageUnreadCount} message(s) non lu(s))` : "Messagerie"}
        >
          <img src="/images/msg.png" alt="Messagerie" className="w-8 h-8 object-contain" />
          {messageUnreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-[#A35A2A] text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#1A1A1A]">
              {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
            </Badge>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""})` : "Notifications"}
            aria-expanded={notificationsOpen}
            className={cn(
              "relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#050505] dark:text-[#E4E6EB] transition cursor-pointer",
              notificationsOpen ? "bg-[#DBEAFE]/70 dark:bg-[#985810]/30" : "hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A]"
            )}
          >
            <img src="/images/notif.png" alt="Notifications" className="w-6 h-6 object-contain" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-[#FF4444] text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#1A1A1A] font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
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
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1E1E1E] shadow-md border-b border-gray-100 dark:border-white/10 p-3 lg:hidden z-50">
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
