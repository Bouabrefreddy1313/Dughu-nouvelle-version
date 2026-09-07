"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import MainLayout from "@/components/layout/MainLayout"
import NotificationCard from "@/components/notifications/NotificationCard"
import {
  useNotifications,
  useMarkNotificationRead,
} from "@/hooks/queries/use-notifications"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationItem,
} from "@/types/notifications/notification.types"
import {
  filterNotificationItemByCategory,
  BACKEND_SUPPORTED_FILTERS,
} from "@/services/notifications/notifications.mapper"

export default function NotificationsPage() {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const user = rawUser
  const userId = String(user?.id || user?.dughu?.userId || "")

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>(
    NOTIFICATION_CATEGORIES[0] // "Tout" par défaut
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [loadedNotifications, setLoadedNotifications] = useState<NotificationItem[]>([])

  const tabsRef = useRef<HTMLDivElement>(null)

  // Délégation au backend si le filtre est nativement supporté, sinon récupération 'all' et filtrage client
  const apiFilter = BACKEND_SUPPORTED_FILTERS.has(activeCategory.filterValue)
    ? activeCategory.filterValue
    : "all"

  const {
    notifications,
    isLoading,
    isFetching,
    hasMore,
    refetch,
    total,
    apiUnreadCount,
  } = useNotifications({
    filter: apiFilter,
    page: currentPage,
    userId,
    enabled: true,
  })

  const { markRead, markAllRead } = useMarkNotificationRead()

  // Maintient la liste accumulée des notifications au fil des pages (scroll infini / charger plus)
  useEffect(() => {
    if (currentPage === 1) {
      setLoadedNotifications(notifications)
    } else if (notifications && notifications.length > 0) {
      setLoadedNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => String(n.id)))
        const fresh = notifications.filter((n) => !existingIds.has(String(n.id)))
        return [...prev, ...fresh]
      })
    }
  }, [notifications, currentPage])

  // Défilement horizontal fluide des onglets
  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return
    const offset = direction === "left" ? -250 : 250
    tabsRef.current.scrollBy({ left: offset, behavior: "smooth" })
  }

  // Changement de catégorie : réinitialise à la page 1 et vide la liste locale
  const handleCategorySelect = (category: NotificationCategory) => {
    setActiveCategory(category)
    setCurrentPage(1)
    setLoadedNotifications([])
  }

  // Clic sur une notification : marquer comme lu et naviguer
  const handleItemClick = useCallback(
    (item: NotificationItem) => {
      markRead(item.id)

      let targetUrl = item.url || "/home"

      // Sécurité : redirection stricte vers /points pour tout ce qui concerne les points
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
          if (typeof window !== "undefined" && parsed.host === window.location.host) {
            router.push(parsed.pathname + parsed.search + parsed.hash)
            return
          }
        } catch {}
        window.location.href = targetUrl
      } else {
        router.push(targetUrl)
      }
    },
    [markRead, router]
  )

  // Filtrage des notifications : "all" affiche tout sans distinction ; les autres onglets filtrent via NOTIF_TYPE_TO_CATEGORY
  const displayedNotifications = useMemo(() => {
    const list =
      currentPage === 1 && loadedNotifications.length === 0
        ? notifications
        : loadedNotifications

    if (activeCategory.id === "all") {
      return list
    }

    return list.filter((item) =>
      filterNotificationItemByCategory(item, activeCategory.id)
    )
  }, [loadedNotifications, notifications, currentPage, activeCategory.id])

  // Marquer toutes les notifications affichées comme lues
  const handleMarkAllAsRead = () => {
    if (displayedNotifications.length > 0) {
      markAllRead(displayedNotifications.map((n) => n.id))
    }
  }

  const displayedUnreadCount = useMemo(() => {
    return displayedNotifications.filter((n) => n.seen === 0).length
  }, [displayedNotifications])

  return (
    <MainLayout user={user} active="notifications">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-20">
        {/* ── EN-TÊTE PRINCIPAL ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#A35A2A]/10 text-[#A35A2A] flex items-center justify-center shrink-0">
                  <Bell size={22} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Toutes les notifications
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Consultez l&apos;historique complet de vos interactions et actualités
                    {apiUnreadCount > 0 && (
                      <span className="ml-1.5 font-semibold text-amber-800">
                        • {apiUnreadCount} non lue{apiUnreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Rafraîchir les notifications"
                className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
                title="Actualiser"
              >
                <RefreshCw size={16} className={cn(isFetching && "animate-spin text-[#A35A2A]")} />
              </button>

              {displayedUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#A35A2A]/10 hover:bg-[#A35A2A]/20 text-[#A35A2A] transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck size={16} />
                  <span>Tout marquer comme lu</span>
                </button>
              )}
            </div>
          </div>

          {/* ── BARRE DE CATÉGORIES HORIZONTALE ── */}
          <div className="relative mt-6 pt-5 border-t border-gray-100 flex items-center">
            {/* Bouton défilement gauche */}
            <button
              onClick={() => scrollTabs("left")}
              aria-label="Défiler vers la gauche"
              className="hidden sm:flex absolute left-0 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 items-center justify-center hover:bg-gray-50 transition -translate-x-3 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Liste défilable des onglets */}
            <div
              ref={tabsRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 px-1 sm:px-2 w-full"
            >
              {NOTIFICATION_CATEGORIES.map((cat) => {
                const isActive = activeCategory.id === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs sm:text-[13px] font-semibold whitespace-nowrap transition cursor-pointer shrink-0 select-none",
                      isActive
                        ? "bg-[#A35A2A] text-white shadow-sm"
                        : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                    )}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Bouton défilement droit */}
            <button
              onClick={() => scrollTabs("right")}
              aria-label="Défiler vers la droite"
              className="hidden sm:flex absolute right-0 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 items-center justify-center hover:bg-gray-50 transition translate-x-3 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── LISTE DES NOTIFICATIONS ── */}
        <div className="space-y-2">
          {isLoading && currentPage === 1 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={`page-skel-${i}`}
                  className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-start gap-4 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center my-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Bell size={32} />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                Aucune notification dans la catégorie « {activeCategory.label} »
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {activeCategory.id === "all"
                  ? "Vous n'avez reçu aucune notification pour le moment."
                  : `Aucune interaction récente ne correspond au filtre ${activeCategory.label}.`}
              </p>
              {activeCategory.id !== "all" && (
                <button
                  onClick={() => handleCategorySelect(NOTIFICATION_CATEGORIES[0])}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-[#A35A2A] bg-[#A35A2A]/10 hover:bg-[#A35A2A]/20 transition cursor-pointer"
                >
                  Afficher toutes les notifications
                </button>
              )}
            </div>
          ) : (
            displayedNotifications.map((item) => (
              <NotificationCard
                key={`page-notif-${item.id}`}
                item={item}
                onClick={handleItemClick}
                compact={false}
              />
            ))
          )}
        </div>

        {/* ── PAGINATION : CHARGER PLUS ── */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={isFetching}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-white border border-gray-200 shadow-sm text-[#A35A2A] hover:bg-amber-50/50 transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isFetching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Chargement des notifications suivantes...
                </>
              ) : (
                <>
                  Charger plus de notifications
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
