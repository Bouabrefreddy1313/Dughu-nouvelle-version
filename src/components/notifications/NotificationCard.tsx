"use client"

import Image from "next/image"
import {
  Heart,
  MessageCircle,
  Zap,
  UserPlus,
  Users,
  Globe,
  Gift,
  Bell,
  Award,
  Video,
  Sparkles,
  DollarSign,
  Calendar,
  Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/helpers"
import type { NotificationItem } from "@/types/notifications/notification.types"
import {
  isSatriviumNotification,
  isPointNotification,
  isPointAttributionNotification,
} from "@/services/notifications/notifications.mapper"

interface NotificationCardProps {
  item: NotificationItem
  onClick: (item: NotificationItem) => void
  compact?: boolean
}

/**
 * Badge d'icône superposé sur l'avatar selon le type de notification.
 */
export function NotificationTypeBadge({ type }: { type: string }) {
  const normalized = String(type || "").toLowerCase()

  if (normalized.includes("satrivium")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-sm">
        <Sparkles size={11} />
      </span>
    )
  }

  if (normalized.includes("poke")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#A35A2A] text-white flex items-center justify-center shadow-sm">
        <Zap size={11} />
      </span>
    )
  }

  if (normalized.includes("react") || normalized.includes("like_post") || normalized.includes("like")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
        <Heart size={11} className="fill-white" />
      </span>
    )
  }

  if (normalized.includes("comment")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
        <MessageCircle size={11} />
      </span>
    )
  }

  if (normalized.includes("follow") || normalized.includes("relation") || normalized.includes("friend")) {
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

  if (normalized.includes("page") || normalized.includes("espace") || normalized.includes("space")) {
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

  if (normalized.includes("badge")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
        <Award size={11} />
      </span>
    )
  }

  if (normalized.includes("capsule") || normalized.includes("short") || normalized.includes("video")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
        <Video size={11} />
      </span>
    )
  }

  if (normalized.includes("finance")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-sm">
        <DollarSign size={11} />
      </span>
    )
  }

  if (normalized.includes("event")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
        <Calendar size={11} />
      </span>
    )
  }

  if (normalized.includes("channel") || normalized.includes("canal")) {
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-sm">
        <Radio size={11} />
      </span>
    )
  }

  return (
    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-500 text-white flex items-center justify-center shadow-sm">
      <Bell size={11} />
    </span>
  )
}

export default function NotificationCard({
  item,
  onClick,
  compact = false,
}: NotificationCardProps) {
  const isUnread = item.seen === 0

  // Règle spéciale Satrivium IA et Attribution/Retrait de points : forcer l'icône /images/logoSat/souriire.png et titre 'Satrivium'
  const isSatrivium = isSatriviumNotification(
    item.type,
    item.type2,
    item.notifier?.fullName,
    item.text
  )
  const isPoint = isPointNotification(
    item.type,
    item.type2,
    item.text,
    item.url
  )

  const isSpecialLogo = isSatrivium || isPoint
  const displayTitle = isSpecialLogo ? "Satrivium" : item.title || item.notifier?.fullName || null

  const avatarSrc = isSpecialLogo
    ? "/images/logoSat/souriire.png"
    : item.notifier?.avatar || "/images/avatar.png"

  return (
    <div
      onClick={() => onClick(item)}
      className={cn(
        "flex items-start gap-3.5 transition cursor-pointer select-none group",
        compact
          ? "p-3.5 sm:p-4 border-b border-gray-100 last:border-b-0"
          : "p-4 sm:p-5 rounded-2xl border mb-2.5 shadow-sm",
        isUnread
          ? compact
            ? "bg-[#A35A2A]/[0.04] hover:bg-[#A35A2A]/[0.08]"
            : "bg-white hover:bg-amber-50/20 border-[#A35A2A]/20"
          : compact
          ? "bg-white hover:bg-gray-50/80"
          : "bg-white hover:bg-gray-50/80 border-gray-100"
      )}
    >
      {/* Avatar avec Badge du Type */}
      <div className="relative shrink-0 mt-0.5">
        <div
          className={cn(
            "rounded-full overflow-hidden bg-gray-100 border border-gray-200/60 relative",
            compact ? "w-11 h-11" : "w-12 h-12"
          )}
        >
          <Image
            src={avatarSrc}
            alt={displayTitle || "Notification"}
            fill
            className={isSpecialLogo ? "object-contain p-1" : "object-cover"}
          />
        </div>
        <NotificationTypeBadge type={item.type} />
      </div>

      {/* Contenu textuel */}
      <div className="flex-1 min-w-0">
        {displayTitle && (
          <h4
            className={cn(
              "font-semibold leading-tight mb-1 truncate",
              compact ? "text-[13.5px]" : "text-[14.5px]",
              isUnread ? "text-[#1F1F1F]" : "text-[#333333]"
            )}
          >
            {displayTitle}
          </h4>
        )}
        <p
          className={cn(
            "leading-snug break-words",
            compact ? "text-[13px] line-clamp-3" : "text-sm sm:text-[14px] line-clamp-4",
            isUnread ? "text-[#1F1F1F] font-medium" : "text-[#4A4A4A] font-normal"
          )}
        >
          {item.text}
        </p>
        <p className="text-[11.5px] text-[#8A8D91] mt-1.5 font-medium flex items-center gap-1.5">
          <span>{timeAgo(item.createdAt)}</span>
        </p>
      </div>

      {/* Point indicatif pour les notifications non lues */}
      {isUnread && (
        <div className="self-center shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#A35A2A] block ring-4 ring-[#A35A2A]/15" />
        </div>
      )}
    </div>
  )
}
