"use client"

/**
 * Carte d'un canal dans la grille (Écran 1).
 *
 * Spécifications demandées :
 *  - Format large (en largeur et compact en hauteur/longueur).
 *  - La photo de profil (avatar) est 100% visible au premier plan (z-20)
 *    et n'est JAMAIS cachée ou tronquée par l'élément blanc de la carte.
 *  - Dans la partie "canaux rejoints" : affichage complet des informations
 *    du canal (membres, visibilité, statut membre/propriétaire, catégorie, date)
 *    avec cadre agrandi en largeur et boutons d'action directs.
 */

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Star,
  Users,
  Check,
  Lock,
  Globe,
  MessageSquare,
  LogOut,
  Settings,
  ShieldCheck,
  Calendar,
} from "lucide-react"
import type { Canal } from "@/types/canal/canal.types"
import {
  useJoinOrRequestCanal,
  useLeaveCanal,
  useToggleFavorite,
} from "@/hooks/canal/use-canals"

interface CanalCardProps {
  canal: Canal
  currentUserId?: string
  isMine?: boolean
  isJoinedTab?: boolean
  onClick?: () => void
  onManage?: (canal: Canal) => void
}

export default function CanalCard({
  canal,
  currentUserId,
  isMine = false,
  isJoinedTab = false,
  onClick,
  onManage,
}: CanalCardProps) {
  const isOwner =
    isMine ||
    Boolean(
      currentUserId &&
        canal.userId &&
        String(canal.userId) === String(currentUserId)
    )

  const [isFav, setIsFav] = useState(canal.isFavorite)
  const [joinStatus, setJoinStatus] = useState<"none" | "joined" | "requested">(
    canal.isJoined || isOwner || isJoinedTab ? "joined" : "none"
  )

  const [coverSrc, setCoverSrc] = useState(canal.cover || "/images/cover.jpg")
  const [logoSrc, setLogoSrc] = useState(canal.logo || "/images/avatar.png")

  useEffect(() => {
    setCoverSrc(canal.cover || "/images/cover.jpg")
  }, [canal.cover])

  useEffect(() => {
    setLogoSrc(canal.logo || "/images/avatar.png")
  }, [canal.logo])

  const toggleFavMutation = useToggleFavorite()
  const joinMutation = useJoinOrRequestCanal()
  const leaveMutation = useLeaveCanal()

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

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId || isOwner || leaveMutation.isPending) return
    if (!window.confirm(`Voulez-vous vraiment quitter le canal "${canal.name}" ?`)) return
    setJoinStatus("none")
    leaveMutation.mutate({
      userId: currentUserId,
      canalId: canal.id,
    })
  }

  const formattedDate = canal.createdAt
    ? new Date(canal.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div
      onClick={onClick}
      className="group relative flex w-full flex-col rounded-3xl border border-gray-200/90 bg-white shadow-sm transition-all duration-300 hover:border-[#985810]/60 hover:shadow-lg cursor-pointer"
    >
      {/* ========================================================================= */}
      {/* 1. Bannière Cover (Hauteur compacte h-28, large) */}
      {/* ========================================================================= */}
      <div className="relative h-28 w-full overflow-hidden rounded-t-3xl bg-gradient-to-r from-[#985810]/15 via-[#985810]/5 to-[#985810]/25">
        <Image
          src={coverSrc}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setCoverSrc("/images/cover.jpg")}
          unoptimized={coverSrc?.startsWith("http")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Badges sur la bannière : Type + Membres */}
        <div className="absolute left-3 top-3 flex items-center gap-2 z-10">
          <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
            {canal.type === "public" ? (
              <>
                <Globe size={13} className="text-emerald-400" />
                <span>Public</span>
              </>
            ) : (
              <>
                <Lock size={13} className="text-amber-400" />
                <span>Privé</span>
              </>
            )}
          </span>

          <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
            <Users size={13} className="text-[#d48937]" />
            <span>{canal.memberCount || 0}</span>
          </span>
        </div>

        {/* Bouton Favori */}
        <button
          type="button"
          onClick={handleToggleFav}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:scale-110 active:scale-95 shadow-sm"
        >
          <Star
            size={16}
            className={isFav ? "fill-amber-400 text-amber-400" : "text-white/90"}
          />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. Corps de la carte en blanc */}
      {/* ========================================================================= */}
      <div className="relative p-4 pt-0">
        {/* Ligne Seam : Avatar dégagé à 100% au premier plan + Boutons d'action à droite */}
        <div className="flex items-end justify-between -mt-8 mb-2.5">
          {/* Avatar (photo de profil) : z-20 et border-4 pour être parfaitement visible au-dessus du blanc */}
          <div className="relative size-16 shrink-0 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden z-20">
            <Image
              src={logoSrc}
              alt={canal.name}
              fill
              sizes="64px"
              className="object-cover"
              onError={() => setLogoSrc("/images/avatar.png")}
              unoptimized={logoSrc?.startsWith("http")}
            />
          </div>

          {/* Actions alignées sur la même ligne (gain de hauteur) */}
          <div className="flex items-center gap-2 z-10">
            {joinStatus === "joined" || isOwner || isJoinedTab ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.()
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#985810] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d] active:scale-[0.98]"
                >
                  <MessageSquare size={14} />
                  Ouvrir le chat
                </button>

                {isOwner ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onManage) onManage(canal)
                      else onClick?.()
                    }}
                    title="Gérer le canal & demandes d'adhésion"
                    className="flex size-8 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-gray-200"
                  >
                    <Settings size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={leaveMutation.isPending}
                    title="Quitter le canal"
                    className="flex size-8 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                  >
                    <LogOut size={14} />
                  </button>
                )}
              </>
            ) : joinStatus === "requested" ? (
              <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200">
                Demande envoyée
              </span>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-[#985810] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d] active:scale-[0.98]"
              >
                {canal.type === "public" ? "Intégrer" : "Demander"}
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Informations du canal */}
        {/* ========================================================================= */}
        <div className="space-y-1.5">
          {/* Nom du canal + Badges horizontaux */}
          <div className="flex flex-wrap items-center gap-2">
            <h3
              title={canal.name}
              className="text-base font-black text-gray-900 group-hover:text-[#985810] transition-colors truncate max-w-[280px]"
            >
              {canal.name}
            </h3>

            <span className="inline-flex items-center gap-1 rounded-full bg-[#985810]/10 px-2 py-0.5 text-[11px] font-bold text-[#985810] border border-[#985810]/25">
              {canal.categoryName || "Général"}
            </span>

            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                <ShieldCheck size={11} />
                Créateur
              </span>
            )}

            {(isJoinedTab || (joinStatus === "joined" && !isOwner)) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                <Check size={11} />
                Membre
              </span>
            )}
          </div>

          {/* Description courte (1 ligne) */}
          {canal.description && (
            <p className="text-xs font-medium text-gray-600 line-clamp-1 leading-snug">
              {canal.description}
            </p>
          )}

          {/* Section d'informations spécifiques pour les canaux rejoints */}
          {(isJoinedTab || joinStatus === "joined") && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-1.5 text-[11px] text-gray-600 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold text-gray-800">
                  <Users size={12} className="text-[#985810]" />
                  {canal.memberCount || 0} membres inscrits
                </span>

                <span className="flex items-center gap-1 text-gray-500">
                  {canal.type === "public" ? (
                    <>
                      <Globe size={11} className="text-emerald-500" />
                      Canal public
                    </>
                  ) : (
                    <>
                      <Lock size={11} className="text-amber-500" />
                      Canal privé
                    </>
                  )}
                </span>
              </div>

              {formattedDate && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Calendar size={11} />
                  Depuis le {formattedDate}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
