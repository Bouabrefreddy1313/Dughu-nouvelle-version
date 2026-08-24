"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import Header from "@/components/layout/Header"
import LeftSidebar from "@/components/sidebar/LeftSidebar"
import RightSidebar from "@/components/sidebar/RightSidebar"
import ConversationSidebar from "@/components/sidebar/ConversationSidebar"

interface MainLayoutProps {
  children: React.ReactNode
  user?: any
  onLogout?: () => void
  onSearch?: (q: string) => void
  filter?: "all" | "following"
  onFilterChange?: (f: "all" | "following") => void
  wide?: boolean
  /** Masque la sidebarre droite (RightSidebar + ConversationSidebar). */
  noRightSidebar?: boolean
  active?: string
  workspace?: boolean
  /** Réserve la largeur de la sidebar gauche au contenu sur desktop. */
  reserveLeftSidebar?: boolean
}

export default function MainLayout({
  children,
  user,
  onLogout,
  onSearch,
  filter = "all",
  onFilterChange,
  wide = false,
  noRightSidebar = false,
  active = "feed",
  workspace = false,
  reserveLeftSidebar = false,
}: MainLayoutProps) {
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Header
        user={user}
        onLogout={onLogout}
        onSearch={onSearch}
        onMenuClick={() => setMobileMenuOpen(true)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(!chatOpen)}
      />

      {/* Overlay mobile pour le menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LeftSidebar - desktop fixe, mobile repliable */}
       <div className={cn(
         "transition-all duration-300",
         mobileMenuOpen
           ? "fixed inset-y-0 left-0 z-50 w-[270px] translate-x-0"
           : "hidden lg:block lg:fixed lg:left-0 lg:top-[72px] lg:bottom-0 lg:w-[270px] lg:z-30"
       )}>
        <LeftSidebar
          user={user}
          active={active}
          filter={filter}
          onFilterChange={(f) => {
            onFilterChange?.(f)
            setMobileMenuOpen(false)
          }}
          mobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Colonnes fixes à droite (RightSidebar + ConversationSidebar) */}
      {!noRightSidebar && (
        <div className="hidden xl:block">
          <RightSidebar user={user} chatOpen={chatOpen} />
        </div>
      )}

      {/* ConversationSidebar : toujours accessible via le bouton messagerie du header, même sans RightSidebar */}
      <ConversationSidebar user={user} open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Zone de contenu sous le header (réservations d'espace pour les sidebars fixes) */}
      <div className="flex w-full pt-[80px] sm:pt-[88px]">
        {/* Réservation espace de la sidebar gauche (fixe en lg+) */}
        <div className="hidden lg:block lg:w-[270px] lg:shrink-0" aria-hidden="true" />

        {/* Contenu central (timeline) */}
        <main className="min-w-0 flex-1 px-2 pb-16 sm:px-4 lg:px-6 lg:pb-12">
          <div
            className={cn(
              "mx-auto w-full",
              wide ? "max-w-[1100px]" : "max-w-[800px]",
              "space-y-3 sm:space-y-4"
            )}
          >
            {children}
          </div>
        </main>

        {/* Réservation espace de la sidebar droite (fixe en xl+) */}
        {!noRightSidebar && (
          <div
            className={cn(
              "hidden xl:block xl:shrink-0",
              chatOpen ? "xl:w-[540px]" : "xl:w-[240px]"
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
