"use client"

/**
 * Carte d'un canal dans la grille (Écran 1).
 *
 * Affiche :
 *  - Cover + avatar médaillon superposé (bas-gauche)
 *  - Étoile favori en haut à droite avec mise à jour optimiste
 *  - Nombre de membres avec icône personnes
 *  - Nom du canal (tronqué) + catégorie
 *  - Bouton d'action "Intégrer" (selon public/privé) ou gestion (si mes canaux)
 */

import { useState } from "react"
import Image from "next/image"
import { Star, Users, Check, Lock, Globe } from "lucide-react"
import type { Canal } from "@/types/canal/canal.types"
import { useJoinOrRequestCanal, useToggleFavorite } from "@/hooks/canal/use-canals"

interface CanalCardProps {
  canal: Canal
  currentUserId?: string
  isMine?: boolean
  onClick?: () => void
}

export default function CanalCard({ canal, currentUserId, isMine = false, onClick }: CanalCardProps) {
  const [isFav, setIsFav] = useState(canal.isFavorite)
  const [joinStatus, setJoinStatus] = useState<"none" | "joined" | "requested">(
    canal.isJoined ? "joined" : "none"
  )

  const toggleFavMutation = useToggleFavorite()
  const joinMutation = useJoinOrRequestCanal()

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) return
    const next = !isFav
    setIsFav(next)
    toggleFavMutation.mutate({
      userId: currentUserId,
      canalId: canal.id,
      action: next ? "add" : "remove",
    })
  }

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId || joinStatus !== "none" || joinMutation.isPending) return

    if (canal.type === "public") {
      setJoinStatus("joined")
      joinMutation.mutate({
        userId: currentUserId,
        canalId: canal.id,
        type: "direct",
      })
    } else {
      setJoinStatus("requested")
      joinMutation.mutate({
        userId: currentUserId,
        canalId: canal.id,
        type: "request",
      })
    }
  }

  return (
    <div
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#F97316]/50 hover:shadow-md cursor-pointer"
    >
      {/* Cover + Avatar + Étoile */}
      <div className="relative h-28 w-full bg-gradient-to-r from-orange-100 to-amber-100">
        <Image
          src={canal.cover || "/images/cover.jpg"}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 220px"
          className="object-cover"
          unoptimized={canal.cover?.startsWith("http")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Bouton Favori en haut à droite */}
        <button
          type="button"
          onClick={handleToggleFav}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:scale-110 active:scale-95"
        >
          <Star
            size={16}
            className={isFav ? "fill-amber-400 text-amber-400" : "text-white/90"}
          />
        </button>

        {/* Badge Visibilité + Nombre de membres */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white/95 backdrop-blur-sm">
          {canal.type === "public" ? <Globe size={11} /> : <Lock size={11} />}
          <span className="flex items-center gap-0.5 ml-1">
            <Users size={11} />
            {canal.memberCount || 0}
          </span>
        </div>

        {/* Avatar médaillon superposé en bas à gauche */}
        <div className="absolute -bottom-4 left-3 size-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
          <Image
            src={canal.logo || "/images/avatar.png"}
            alt={canal.name}
            fill
            sizes="48px"
            className="object-cover"
            unoptimized={canal.logo?.startsWith("http")}
          />
        </div>
      </div>

      {/* Contenu textuel */}
      <div className="flex flex-1 flex-col justify-between p-3.5 pt-5">
        <div>
          <h3 className="truncate text-[14px] font-bold text-gray-900 group-hover:text-[#EA580C]">
            {canal.name}
          </h3>
          <p className="mt-0.5 truncate text-[12px] font-medium text-[#EA580C]">
            {canal.categoryName || "Général"}
          </p>
          {canal.description && (
            <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
              {canal.description}
            </p>
          )}
        </div>

        {/* Bouton d'action en bas */}
        <div className="mt-3">
          {isMine ? (
            <button
              type="button"
              className="w-full rounded-xl bg-gray-100 py-1.5 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              Gérer
            </button>
          ) : joinStatus === "joined" ? (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200"
            >
              <Check size={13} />
              Rejoint
            </button>
          ) : joinStatus === "requested" ? (
            <button
              type="button"
              disabled
              className="w-full rounded-xl bg-amber-50 py-1.5 text-center text-xs font-semibold text-amber-700 border border-amber-200"
            >
              Demande envoyée
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joinMutation.isPending}
              className="w-full rounded-xl bg-[#EA580C] py-1.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#C2410C] active:scale-[0.98]"
            >
              Intégrer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
