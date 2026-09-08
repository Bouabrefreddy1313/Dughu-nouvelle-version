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
import { logout } from "@/services/auth/auth.service"
import NotificationManager from "@/components/notifications/NotificationManager"

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
  /** Masque le header principal sur mobile/tablette (ex : profil en couverture plein écran). */
  hideHeaderOnMobile?: boolean
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
  hideHeaderOnMobile = false,
}: MainLayoutProps) {
  const [chatOpen, setChatOpen] = useState(false)
  // Sidebar droite en tiroir (mobile/tablette) : ouverte par le bouton grille du header.
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false)
  // Total de messages non lus, remonté par ConversationSidebar → badge rouge
  // sur l'icône messagerie du header.
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const [openConversations, setOpenConversations] = useState<ChatSummary[]>([])

  // ── Déconnexion ─────────────────────────────────────────────────────────────
  // Le menu profil et sa modale de confirmation sont partagés par TOUTES les
  // pages via le Header. Toute page qui ne transmet pas onLogout bénéficie
  // quand même d'une déconnexion fonctionnelle (service auth + redirection
  // /login) — sinon le bouton « Se déconnecter » de la modale restait
  // silencieusement inerte (`onLogout?.()` sur undefined).
  const handleLogout = onLogout ?? (() => {
    void logout().finally(() => router.push("/login"))
  })

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

  const currentUserId = String(user?.id || user?.dughu?.userId || "")

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#121212] text-foreground transition-colors duration-200">
      {/* Gestionnaire global de notifications In-App et Push */}
      <NotificationManager userId={currentUserId} />

      <Header
        user={user}
        onLogout={handleLogout}
        onSearch={onSearch}
        onMenuClick={() => {
          // Ouverture de la sidebar gauche (mobile) : ferme automatiquement la
          // sidebar droite pour qu'elles ne soient jamais ouvertes ensemble.
          setMobileRightSidebarOpen(false)
          setMobileMenuOpen(true)
        }}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onToggleRightSidebar={() => {
          // Ouverture de la sidebar droite (mobile) : ferme automatiquement la
          // sidebar gauche pour qu'elles ne soient jamais ouvertes ensemble.
          setMobileMenuOpen(false)
          setMobileRightSidebarOpen((v) => !v)
        }}
        rightSidebarOpen={mobileRightSidebarOpen}
        messageUnreadCount={messageUnreadCount}
        hideOnMobile={hideHeaderOnMobile}
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

      {/* Overlay mobile pour la sidebar droite */}
      {mobileRightSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileRightSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* RightSidebar : TOUJOURS montée pour que le bouton ☷ du Header fonctionne
          sur TOUTES les pages, même avec noRightSidebar={true}.
          - noRightSidebar={true} → hideOnDesktop=true → sidebar masquée sur xl+
            (colonne fixe invisible) mais le tiroir mobile reste fonctionnel.
          - noRightSidebar={false} → sidebar fixe sur xl+ (comportement normal). */}
      <RightSidebar
        user={user}
        open={mobileRightSidebarOpen}
        onClose={() => setMobileRightSidebarOpen(false)}
        hideOnDesktop={noRightSidebar}
      />

      {/* Zone de contenu sous le header (réservations d'espace pour les sidebars fixes).
          Quand le header est masqué sur mobile (profil), la couverture part du haut
          de l'écran : padding supérieur nul sous lg, conservé sur desktop. */}
      <div className={cn("flex w-full", hideHeaderOnMobile ? "pt-0 lg:pt-[88px]" : "pt-[56px] sm:pt-[88px]")}>
        {/* Réservation espace de la sidebar gauche (fixe en lg+) */}
        <div className="hidden lg:block lg:w-[270px] lg:shrink-0" aria-hidden="true" />

        {/* Contenu central (timeline) */}
        {/* Mobile : px-0 → posts edge-to-edge, sm+ : px-4, xl : px-4, 2xl : px-6
            pb-[calc(80px+env(safe-area-inset-bottom,0px))] → espace pour la tapbar + safe-area iOS */}
        <main className="min-w-0 flex-1 px-0 pb-[calc(80px+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-16 lg:px-6 xl:px-4 2xl:px-6 lg:pb-12">
          <div
            className={cn(
              "mx-auto w-full",
              wide ? "max-w-[1100px]" : "max-w-[750px] xl:max-w-[780px]",
              // Mobile : pas d'espace entre posts (border-b les sépare)
              // sm+ : espacement normal entre cartes
              "space-y-0 sm:space-y-3 md:space-y-4"
            )}
          >
            {children}
          </div>
        </main>

        {/* Réservation espace de la sidebar droite (fixe en xl+) :
            - xl (1280px à 1535px, laptops 13"-15" ex: 1280x903 à 1417x903) :
              sidebar droite 240px + right-4 (16px) + 8px respiration = 264px
              afin que le feed et les cards de post ne soient pas comprimés.
            - 2xl (1536px+, écrans très larges) : 484px (240px + right-[220px] + 24px)
              pour aérer la mise en page sur les grands moniteurs. */}
        {!noRightSidebar && (
          <div className="hidden xl:block xl:w-[264px] 2xl:w-[484px] xl:shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* Barre de navigation mobile (tab bar en bas) */}
      <MobileBottomNav user={user} />
    </div>
  )
}