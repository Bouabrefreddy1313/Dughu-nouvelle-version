"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Header from "@/components/layout/Header"
import LeftSidebar from "@/components/sidebar/LeftSidebar"
import RightSidebar from "@/components/sidebar/RightSidebar"
import ConversationSidebar from "@/components/sidebar/ConversationSidebar"
import ConversationPopup from "@/components/sidebar/ConversationPopup"
import MobileBottomNav from "@/components/layout/MobileBottomNav"
import type { ChatSummary } from "@/lib/messages"

/** Nombre maximal de fenêtres de conversation ouvertes simultanément. */
const MAX_CONVERSATION_POPUPS = 3

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
  // Total de messages non lus, remonté par ConversationSidebar → badge rouge
  // sur l'icône messagerie du header.
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const [openConversations, setOpenConversations] = useState<ChatSummary[]>([])

  const openConversationPopup = useCallback((conversation: ChatSummary) => {
    // Ouvrir la conversation = la lire : on retire le compteur de non-lus de la
    // copie affichée, sinon la bulle rabattue garderait un badge obsolète.
    const readConversation: ChatSummary = { ...conversation, unreadCount: 0 }
    setOpenConversations((current) => {
      if (current.some((item) => item.contact.id === conversation.contact.id)) return current
      const next = [...current, readConversation]
      return next.length > MAX_CONVERSATION_POPUPS
        ? next.slice(next.length - MAX_CONVERSATION_POPUPS)
        : next
    })
  }, [])

  const closeConversationPopup = useCallback((targetUserId: string) => {
    setOpenConversations((current) =>
      current.filter((item) => item.contact.id !== targetUserId)
    )
  }, [])

  const openFullConversation = useCallback(
    (targetUserId: string) => {
      setOpenConversations([])
      router.push(`/messages?target=${encodeURIComponent(targetUserId)}`)
    },
    [router]
  )

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
        messageUnreadCount={messageUnreadCount}
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
      <ConversationSidebar
        user={user}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onOpenConversation={openConversationPopup}
        onUnreadCountChange={setMessageUnreadCount}
      />

      {/* Fenêtres de conversation (popups en bas, comme Facebook) */}
      {openConversations.length > 0 && (
        <>
          {/* Mobile : dernière conversation en bottom sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:hidden">
            {(() => {
              const last = openConversations[openConversations.length - 1]
              return last ? (
                <ConversationPopup
                  currentUserId={String(user?.dughu?.userId || "")}
                  conversation={last}
                  myName={user?.name}
                  onClose={() => closeConversationPopup(last.contact.id)}
                  onOpenFull={openFullConversation}
                />
              ) : null
            })()}
          </div>

          {/* Desktop/tablette : fenêtres côte à côte */}
          <div className="pointer-events-none fixed bottom-0 right-0 z-[60] hidden items-end gap-3 p-4 sm:flex">
            {openConversations.map((conversation) => (
              <div key={conversation.contact.id} className="pointer-events-auto w-[330px]">
                <ConversationPopup
                  currentUserId={String(user?.dughu?.userId || "")}
                  conversation={conversation}
                  myName={user?.name}
                  onClose={() => closeConversationPopup(conversation.contact.id)}
                  onOpenFull={openFullConversation}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Zone de contenu sous le header (réservations d'espace pour les sidebars fixes) */}
      <div className="flex w-full pt-[80px] sm:pt-[88px]">
        {/* Réservation espace de la sidebar gauche (fixe en lg+) */}
        <div className="hidden lg:block lg:w-[270px] lg:shrink-0" aria-hidden="true" />

        {/* Contenu central (timeline) */}
        <main className="min-w-0 flex-1 px-2 pb-20 sm:px-4 sm:pb-16 lg:px-6 lg:pb-12">
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

      {/* Barre de navigation mobile (tab bar en bas) */}
      <MobileBottomNav user={user} />
    </div>
  )
}
