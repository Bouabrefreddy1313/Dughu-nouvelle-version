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

      {/* Bouton menu mobile - caché quand le menu est ouvert */}
      {!mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed bottom-4 left-4 z-50 lg:hidden w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#A35A2A] text-white shadow-lg flex items-center justify-center"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
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
          active="feed"
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
      <ConversationSidebar open={chatOpen} onClose={() => setChatOpen(false)} />

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
              chatOpen ? "xl:w-[640px]" : "xl:w-[580px]"
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}