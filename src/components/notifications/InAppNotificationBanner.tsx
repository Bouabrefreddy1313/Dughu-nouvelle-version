"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Heart,
  MessageCircle,
  Zap,
  UserPlus,
  Users,
  Globe,
  Gift,
  X,
  ExternalLink,
} from "lucide-react"
import type { NotificationItem } from "@/types/notifications/notification.types"
import { useMarkNotificationRead } from "@/hooks/queries/use-notifications"

interface InAppNotificationBannerProps {
  notification: NotificationItem | null
  onDismiss: () => void
}

/** Icône décorative selon le type */
function getBadgeIcon(type: string) {
  const norm = (type || "").toLowerCase()
  if (norm.includes("poke")) return <Zap size={12} className="fill-current text-white" />
  if (norm.includes("reaction") || norm.includes("like_post")) return <Heart size={12} className="fill-current text-white" />
  if (norm.includes("comment")) return <MessageCircle size={12} className="fill-current text-white" />
  if (norm.includes("follow") || norm.includes("friend") || norm.includes("network")) return <UserPlus size={12} className="text-white" />
  if (norm.includes("group")) return <Users size={12} className="text-white" />
  if (norm.includes("page") || norm.includes("espace")) return <Globe size={12} className="text-white" />
  if (norm.includes("point")) return <Gift size={12} className="text-white" />
  return <Bell size={12} className="text-white" />
}

function getBadgeBg(type: string) {
  const norm = (type || "").toLowerCase()
  if (norm.includes("poke")) return "bg-amber-500"
  if (norm.includes("reaction") || norm.includes("like_post")) return "bg-rose-500"
  if (norm.includes("comment")) return "bg-blue-500"
  if (norm.includes("follow") || norm.includes("friend") || norm.includes("network")) return "bg-emerald-500"
  if (norm.includes("group")) return "bg-purple-500"
  if (norm.includes("page") || norm.includes("espace")) return "bg-indigo-500"
  if (norm.includes("point")) return "bg-[#E5A817]"
  return "bg-[#985810]"
}

export default function InAppNotificationBanner({
  notification,
  onDismiss,
}: InAppNotificationBannerProps) {
  const router = useRouter()
  const { markRead } = useMarkNotificationRead()

  // Auto-fermeture après 6 secondes
  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => {
      onDismiss()
    }, 6000)
    return () => clearTimeout(timer)
  }, [notification, onDismiss])

  // Fermeture à la touche Échap
  useEffect(() => {
    if (!notification) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [notification, onDismiss])

  if (!notification) return null

  const handleClick = () => {
    void markRead(notification.id)
    onDismiss()
    if (notification.url) {
      router.push(notification.url)
    }
  }

  const avatar = notification.notifier.avatar || "/images/avatar.png"
  const title = notification.title || notification.notifier.fullName || "Nouvelle notification"
  const badgeBg = getBadgeBg(notification.type)
  const badgeIcon = getBadgeIcon(notification.type)

  return (
    <aside
      aria-label="Nouvelle notification"
      aria-live="polite"
      className="fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-6 z-[9999] sm:max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleClick()
          }
        }}
        className="group relative flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-amber-200/80 dark:border-white/15 shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden ring-1 ring-black/5"
      >
        {/* Avatar avec badge de type superposé */}
        <div className="relative shrink-0 mt-0.5">
          <img
            src={avatar}
            alt=""
            className="w-11 h-11 rounded-full object-cover border border-black/5 dark:border-white/10"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = "/images/avatar.png"
            }}
          />
          <span
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${badgeBg} flex items-center justify-center shadow-xs border-2 border-white dark:border-[#1E1E1E]`}
          >
            {badgeIcon}
          </span>
        </div>

        {/* Contenu textuel */}
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-[#1C1E21] dark:text-[#F3F4F6] truncate">
              {title}
            </h4>
            <span className="text-[10px] text-[#A35A2A] dark:text-[#B46D1C] font-semibold shrink-0">
              À l&apos;instant
            </span>
          </div>
          <p className="text-xs text-[#4B4C4F] dark:text-[#D1D5DB] mt-0.5 line-clamp-2 leading-relaxed">
            {notification.text}
          </p>
        </div>

        {/* Actions : Voir + Fermer */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            aria-label="Voir la notification"
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#65676B] hover:text-[#985810] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] transition"
          >
            <ExternalLink size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            aria-label="Fermer la notification"
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#65676B] hover:text-red-500 hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Barre de progression (timer visuel de 6s) */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-[#985810] transition-all duration-[6000ms] ease-linear"
            style={{ width: "100%", animation: "inapp-progress 6s linear forwards" }}
          />
        </div>
      </div>
    </aside>
  )
}
