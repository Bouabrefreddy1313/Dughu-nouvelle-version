"use client"

/**
 * Dropdown / Panneau de notifications de Dughu.
 *
 * - S'ouvre au clic sur l'icône cloche du header ;
 * - Affiche les notifications chargées depuis GET /api/notifications ;
 * - Différenciation visuelle marquée pour 'seen === 0' (non lue) et 'seen === 1' (lue) ;
 * - Badges d'icônes spécifiques selon le type (poke, reaction, commentaire, relation, groupe...) ;
 * - Filtres dynamiques : "Toutes", "Pokes", "Non lues" ;
 * - Action "Tout marquer comme lu" ;
 * - Pagination ("Charger plus") et états de chargement / vide ;
 * - Redirection fluide au clic et fermeture automatique.
 */

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Bell,
  Zap,
  Heart,
  MessageCircle,
  Users,
  UserPlus,
  Globe,
  Gift,
  CheckCheck,
  ChevronRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/helpers"
import {
  useNotifications,
  useMarkNotificationRead,
} from "@/hooks/queries/use-notifications"
import type { NotificationItem } from "@/types/notifications/notification.types"
import NotificationCard from "@/components/notifications/NotificationCard"

interface NotificationDropdownProps {
  open: boolean
  onClose: () => void
  userId?: string
}

/**
 * Rendu de l'icône décorative du type de notification.
 */
function NotificationTypeBadge({ type }: { type: string }) {
  const normalized = type.toLowerCase()

  if (normalized.includes("poke")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
        <Zap size={11} className="fill-current" />
      </span>
    )
  }

  if (normalized.includes("reaction") || normalized.includes("like_post")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
        <Heart size={11} className="fill-current" />
      </span>
    )
  }

  if (normalized.includes("comment")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
        <MessageCircle size={11} className="fill-current" />
      </span>
    )
  }

  if (normalized.includes("follow") || normalized.includes("friend") || normalized.includes("network")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
        <UserPlus size={11} />
      </span>
    )
  }

  if (normalized.includes("group")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-sm">
        <Users size={11} />
      </span>
    )
  }

  if (normalized.includes("page") || normalized.includes("espace")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
        <Globe size={11} />
      </span>
    )
  }

  if (normalized.includes("point")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#E5A817] text-white flex items-center justify-center shadow-sm">
        <Gift size={11} />
      </span>
    )
  }

  return (
    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-500 text-white flex items-center justify-center shadow-sm">
      <Bell size={11} />
    </span>
  )
}

export default function NotificationDropdown({
  open,
  onClose,
  userId,
}: NotificationDropdownProps) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<"all" | "poke" | "unread">("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Filtre API dynamique
  const apiFilter = activeTab === "poke" ? "poke" : "all"

  const {
    notifications,
    isLoading,
    isFetching,
    hasMore,
    refetch,
  } = useNotifications({
    filter: apiFilter,
    page: currentPage,
    userId,
    enabled: open,
  })

  const { markRead, markAllRead } = useMarkNotificationRead()

  // Fermeture automatique au clic en dehors
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onClose])

  // Filtrage local supplémentaire si l'onglet "Non lues" est sélectionné
  const displayedNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => n.seen === 0)
    }
    return notifications
  }, [notifications, activeTab])

  // Calcul du nombre de notifications non lues affichées
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.seen === 0).length
  }, [notifications])

  // Clic sur une notification : marquer comme lu et naviguer
  const handleItemClick = (item: NotificationItem) => {
    markRead(item.id)
    onClose()

    // URL cible normalisée
    let targetUrl = item.url || "/home"

    // Sécurité supplémentaire : redirection systématique vers /points pour tout ce qui concerne les points
    const normType = String(item.type || "").toLowerCase()
    if (
      normType.includes("point") ||
      targetUrl.includes("historique-points") ||
      targetUrl.includes("points-history") ||
      (item.fullLink && item.fullLink.includes("historique-points"))
    ) {
      targetUrl = "/points"
    }

    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      try {
        const parsed = new URL(targetUrl)
        if (
          parsed.pathname.includes("historique-points") ||
          parsed.pathname.includes("points-history") ||
          parsed.pathname === "/points"
        ) {
          router.push("/points")
          return
        }
        // Si l'URL pointe vers l'application actuelle
        if (typeof window !== "undefined" && parsed.host === window.location.host) {
          router.push(parsed.pathname + parsed.search + parsed.hash)
          return
        }
      } catch {
        // Lien externe standard
      }
      window.location.href = targetUrl
    } else {
      router.push(targetUrl)
    }
  }

  // Marquer toutes les notifications actuellement affichées comme lues
  const handleMarkAllAsRead = () => {
    markAllRead(notifications.map((n) => n.id))
  }

  if (!open) return null

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "fixed sm:absolute right-2 sm:right-0 top-14 sm:top-12 z-50",
        "w-[calc(100vw-16px)] sm:w-[410px] max-w-[430px]",
        "bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-gray-100/90",
        "flex flex-col max-h-[82vh] sm:max-h-[620px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      )}
    >
      {/* ── EN-TÊTE DU DROPDOWN ── */}
      <div className="p-4 sm:p-5 pb-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-lg text-[#1F1F1F] tracking-tight">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#A35A2A] text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-[#A35A2A] hover:bg-[#A35A2A]/10 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Tout marquer comme lu"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── ONGLETS DE FILTRE ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 bg-gray-50/50 shrink-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab("all")
            setCurrentPage(1)
          }}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0",
            activeTab === "all"
              ? "bg-[#1F1F1F] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
          )}
        >
          Toutes
        </button>

        <button
          onClick={() => {
            setActiveTab("poke")
            setCurrentPage(1)
          }}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0",
            activeTab === "poke"
              ? "bg-[#1F1F1F] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
          )}
        >
          <Zap size={12} className={activeTab === "poke" ? "text-amber-400" : "text-amber-600"} />
          Pokes
        </button>

        <button
          onClick={() => {
            setActiveTab("unread")
            setCurrentPage(1)
          }}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0",
            activeTab === "unread"
              ? "bg-[#1F1F1F] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
          )}
        >
          Non lues
        </button>
      </div>

      {/* ── LISTE DÉFILANTE DES NOTIFICATIONS ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-gray-50">
        {isLoading && notifications.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 items-center py-2 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-8 text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Bell size={26} />
            </div>
            <p className="font-bold text-gray-800 text-sm">
              {activeTab === "unread"
                ? "Aucune notification non lue"
                : activeTab === "poke"
                ? "Aucun poke pour le moment"
                : "Aucune notification pour le moment"}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-[240px] mx-auto">
              Vous serez alerté dès qu&apos;une personne interagit avec vous sur Dughu.
            </p>
          </div>
        ) : (
          displayedNotifications.map((item) => (
            <NotificationCard
              key={`notif-${item.id}`}
              item={item}
              onClick={handleItemClick}
              compact={true}
            />
          ))
        )}
      </div>

      {/* ── PIED DE PAGE : PAGINATION + LIEN VERS LA PAGE COMPLÈTE ── */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/80 text-center shrink-0 flex items-center justify-between px-4">
        {hasMore && activeTab !== "unread" ? (
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={isFetching}
            className="text-xs font-semibold text-[#A35A2A] hover:underline inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {isFetching ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Chargement...
              </>
            ) : (
              "Charger plus"
            )}
          </button>
        ) : (
          <span />
        )}

        <button
          onClick={() => {
            onClose()
            router.push("/notifications")
          }}
          className="text-xs font-bold text-[#A35A2A] hover:text-[#8C4B20] inline-flex items-center gap-1 cursor-pointer transition hover:underline ml-auto"
        >
          Voir plus de notifications
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
