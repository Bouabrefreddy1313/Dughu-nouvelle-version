"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, Users, Heart } from "lucide-react"
import type { DughuEvent } from "@/types/events/events.types"

interface EventCardProps {
  event: DughuEvent
}

function formatDateBadge(dateStr?: string) {
  if (!dateStr) return { day: "--", month: "---" }
  try {
    let d: Date
    if (dateStr.includes("-")) {
      d = new Date(dateStr)
    } else if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/")
      d = new Date(`${year}-${month}-${day}`)
    } else {
      d = new Date(dateStr)
    }
    if (isNaN(d.getTime())) return { day: "--", month: "---" }

    const day = String(d.getDate()).padStart(2, "0")
    const month = d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase().replace(".", "")
    return { day, month }
  } catch {
    return { day: "--", month: "---" }
  }
}

export default function EventCard({ event }: EventCardProps) {
  const [imgError, setImgError] = useState(false)
  const { day, month } = formatDateBadge(event.startDate)
  const rawCover = event.coverPath || event.cover || ""
  const coverUrl =
    rawCover.startsWith("http") || rawCover.startsWith("/")
      ? rawCover
      : rawCover
      ? `https://dughuprod.s3.amazonaws.com/${rawCover.replace(/^\/+/, "")}`
      : ""

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Couverture 16:9 */}
      <div className="relative aspect-16/9 w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
        {coverUrl && !imgError ? (
          <Image
            src={coverUrl}
            alt={event.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900">
            <Calendar className="w-12 h-12 text-[#8B5E34]/40" />
          </div>
        )}

        {/* Date badge flottant */}
        <div className="absolute top-3 left-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs rounded-2xl p-2 min-w-[50px] text-center shadow-md border border-white/20">
          <span className="block text-xs font-black text-rose-600 dark:text-rose-400 tracking-wider">
            {month}
          </span>
          <span className="block text-lg font-black text-gray-900 dark:text-gray-100 leading-none mt-0.5">
            {day}
          </span>
        </div>

        {/* Badge "À venir" ou "Passé" */}
        {!event.isPassed ? (
          <div className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>À venir</span>
          </div>
        ) : (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Passé
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Date & Heure */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B5E34] dark:text-[#c48e58]">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {event.startDate}
            {event.startTime ? ` à ${event.startTime}` : ""}
          </span>
        </div>

        {/* Titre */}
        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-[#8B5E34] transition-colors">
          {event.name}
        </h3>

        {/* Lieu */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Organisateur & Participants */}
        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0">
              <Image
                src={event.organizer?.avatar || "/images/avatar.png"}
                alt={event.organizer?.name || "Organisateur"}
                fill
                className="object-cover"
                sizes="24px"
                unoptimized={Boolean(event.organizer?.avatar?.startsWith("http"))}
              />
            </div>
            <span className="truncate font-medium text-gray-700 dark:text-gray-300">
              {event.organizer?.name || "Organisateur"}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-medium">
            {event.interestedCount !== undefined && event.interestedCount > 0 && (
              <span className="flex items-center gap-1 text-gray-500">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                {event.interestedCount}
              </span>
            )}
            {event.goingCount !== undefined && event.goingCount > 0 && (
              <span className="flex items-center gap-1 text-gray-500">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {event.goingCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
