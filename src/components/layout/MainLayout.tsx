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
}

export default function MainLayout({
  children,
  user,
  onLogout,
  onSearch,
  filter = "all",
  onFilterChange,
  wide = false,
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
    <div className="min-h-screen bg-[#f7f8fa] overflow-x-hidden">
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
      <div className="hidden xl:block">
        <RightSidebar user={user} chatOpen={chatOpen} />
        <ConversationSidebar open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>

      {/* Contenu central (feed) */}
      <main
        className={cn(
          "pt-[80px] sm:pt-[88px] pb-16 lg:pb-12 flex justify-center transition-[margin] duration-300 ease-in-out w-full",
          "lg:ml-[-100px] xl:ml-[-100px]",
          chatOpen ? "xl:mr-[640px]" : "xl:mr-[520px]"
        )}
      >
        <div className={cn(
          wide
            ? "w-full max-w-[980px] space-y-4 px-2 sm:px-4 lg:px-6"
            : "w-full max-w-[640px] sm:max-w-[720px] space-y-3 sm:space-y-4 px-2 sm:px-4 lg:px-6"
        )}>
          {children}
        </div>
      </main>
    </div>
  )
}