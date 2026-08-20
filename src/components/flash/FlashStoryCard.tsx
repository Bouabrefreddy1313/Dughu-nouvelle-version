"use client"

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH STORY CARD — Fichier UNIQUE regroupant les deux cartes du rail Flash :
//   • FlashAddCard      → carte "Ajouter un flash" (photo de profil utilisateur)
//   • FlashStoryCard     → carte d'une story active d'un ami
// Remplace les anciens composants divergents (MiniStories / StoryCard).
// ═══════════════════════════════════════════════════════════════════════════════

import Image from "next/image"
import { Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveMediaUrl } from "@/lib/dughu"

export interface FlashCardUser {
  name?: string | null
  avatar?: string | null
}

/* ─────────────────────────────────────────────────────────────
   Carte "Ajouter un flash" — affiche la photo de profil de
   l'utilisateur connecté en fond (si disponible).
   ───────────────────────────────────────────────────────────── */
export function FlashAddCard({
  currentUser,
  onClick,
}: {
  currentUser?: FlashCardUser
  onClick?: () => void
}) {
  const avatarSrc = currentUser?.avatar ? resolveMediaUrl(currentUser.avatar) : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ajouter un flash"
      className="flex flex-col items-center shrink-0 cursor-pointer group/add"
    >
      <div className="w-[120px] h-[168px] rounded-2xl overflow-hidden relative flex flex-col border border-gray-200/80 shadow-sm transition-all duration-300 ease-out group-hover/add:shadow-lg group-hover/add:shadow-[#E08543]/15 group-hover/add:-translate-y-0.5">
        {/* Partie haute — photo de profil de l'utilisateur */}
        <div className="h-[70%] bg-gray-100 relative overflow-hidden">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={currentUser?.name || "Moi"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover/add:scale-105"
              sizes="120px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#E08543]/25 to-[#2D2D2D]/10 flex items-center justify-center">
              <User size={26} className="text-[#A35A2A]" strokeWidth={1.75} />
            </div>
          )}
          {/* voile pour la lisibilité du bouton + */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        {/* Bouton + qui chevauche les deux zones */}
        <div className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#E08543] ring-4 ring-white flex items-center justify-center text-white shadow-md z-10 transition-transform duration-300 ease-out group-hover/add:scale-110">
          <Plus size={20} strokeWidth={2.5} />
        </div>

        {/* Partie basse */}
        <div className="h-[30%] bg-white flex items-center justify-center px-2 pt-1">
          <span className="text-[12px] font-semibold text-[#2D2D2D] text-center leading-tight">
            Ajouter un flash
          </span>
        </div>
      </div>
    </button>
  )
}
/* ─────────────────────────────────────────────────────────────
   Carte "story active d'un ami" — média en fond, avatar via
   l'anneau vu/non-vu, nom incrusté en bas.
   ───────────────────────────────────────────────────────────── */
export function FlashStoryCard({
  image,
  avatar,
  name,
  viewed = false,
  onClick,
  ariaLabel,
}: {
  image?: string
  avatar?: string | null
  name?: string | null
  viewed?: boolean
  onClick?: () => void
  ariaLabel?: string
}) {
  const avatarSrc = avatar ? resolveMediaUrl(avatar) : null
  const initial = name?.charAt(0)?.toUpperCase() || "U"

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex flex-col items-center shrink-0 cursor-pointer group/story relative"
    >
      <div className="w-[120px] h-[168px] rounded-2xl overflow-hidden relative flex flex-col border border-gray-200/80 shadow-sm transition-all duration-300 ease-out group-hover/story:shadow-lg group-hover/story:shadow-[#E08543]/15 group-hover/story:-translate-y-0.5">
        {image ? (
          <div className="absolute inset-0">
            <Image src={image} alt={name || ""} fill className="object-cover transition-transform duration-500 ease-out group-hover/story:scale-105" sizes="104px" />
          </div>
        ) : avatarSrc ? (
          <div className="absolute inset-0">
            <Image src={avatarSrc} alt={name || ""} fill className="object-cover transition-transform duration-500 ease-out group-hover/story:scale-105" sizes="104px" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E08543] to-[#A35A2A] flex items-center justify-center">
            <span className="text-white text-xl font-bold">{initial}</span>
          </div>
        )}

        {/* voile dégradé bas pour lisibilité du nom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Avatar en haut avec contour de statut */}
        <div className={cn("absolute top-2.5 left-2.5 w-8 h-8 rounded-full p-[2px]", viewed ? "bg-[#D8DADF]" : "bg-gradient-to-tr from-[#E08543] via-[#E08543] to-[#F2B183]")}>
          <div className="w-full h-full rounded-full overflow-hidden bg-[#A35A2A] border-2 border-white">
            {avatarSrc ? (
              <Image src={avatarSrc} alt={name || ""} fill className="object-cover" sizes="32px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold bg-[#A35A2A]">
                {initial}
              </div>
            )}
          </div>
        </div>

        {/* Nom incrusté en bas de la carte */}
        <span className="absolute bottom-2 left-2.5 right-2.5 text-[12px] font-semibold text-white truncate drop-shadow-sm">
          {name || "Utilisateur"}
        </span>
      </div>
    </button>
  )
}