"use client"

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH STORY CARD — Fichier UNIQUE regroupant les deux cartes du rail Flash :
//   • FlashAddCard      → carte "Ajouter un flash" (photo de profil utilisateur)
//   • FlashStoryCard     → carte d'une story active d'un ami
// Remplace les anciens composants divergents (MiniStories / StoryCard).
// ═══════════════════════════════════════════════════════════════════════════════

import Image from "next/image"
import { Plus, User, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveMediaUrl } from "@/lib/dughu"

export interface FlashCardUser {
  id?: string | null
  name?: string | null
  avatar?: string | null
  dughu?: { userId?: string | null }
}

/** Aperçu du dernier Flash de l'utilisateur (s'il en a un). */
export interface FlashAddPreview {
  image?: string | null
  video?: string | null
  bg?: string | null
  text?: string | null
}

/* ─────────────────────────────────────────────────────────────
   Carte "Ajouter un flash" — si l'utilisateur a déjà publié un
   Flash, on affiche son dernier Flash en fond (mobile = image,
   sinon fond coloré + texte) à la place de la photo de profil.
   ───────────────────────────────────────────────────────────── */
export function FlashAddCard({
  currentUser,
  preview,
  onClick,
}: {
  currentUser?: FlashCardUser
  preview?: FlashAddPreview
  onClick?: () => void
}) {
  const avatarSrc = currentUser?.avatar ? resolveMediaUrl(currentUser.avatar) : null
  const previewSrc = preview?.image ? resolveMediaUrl(preview.image) : null
  const videoSrc = preview?.video ? resolveMediaUrl(preview.video) : null
  const hasPreview = !!previewSrc || !!videoSrc || !!preview?.bg || !!preview?.text

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ajouter un flash"
      className="flex flex-col items-center shrink-0 cursor-pointer group/add"
    >
      <div className="w-[120px] h-[168px] rounded-2xl overflow-hidden relative flex flex-col border border-gray-200/80 shadow-sm transition-all duration-300 ease-out group-hover/add:shadow-lg group-hover/add:shadow-[#E08543]/15 group-hover/add:-translate-y-0.5">
        {/* Partie haute — dernier Flash publié, sinon photo de profil */}
        <div className="h-[70%] bg-gray-100 relative overflow-hidden">
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={currentUser?.name || "Moi"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover/add:scale-105"
              sizes="120px"
            />
          ) : videoSrc ? (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <Video size={24} className="text-white/60" />
            </div>
          ) : preview?.bg ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: preview.bg }}
            >
              <span className="text-white text-[13px] font-semibold text-center leading-tight px-2 line-clamp-4 drop-shadow-sm">
                {preview.text || ""}
              </span>
            </div>
          ) : avatarSrc ? (
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
            {hasPreview ? "Votre flash" : "Ajouter un flash"}
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
  video,
  thumbnail,
  bg,
  text,
  avatar,
  name,
  viewed = false,
  onClick,
  ariaLabel,
}: {
  image?: string
  video?: string
  thumbnail?: string | null
  bg?: string
  text?: string
  avatar?: string | null
  name?: string | null
  viewed?: boolean
  onClick?: () => void
  ariaLabel?: string
}) {
  const avatarSrc = avatar ? resolveMediaUrl(avatar) : null
  const thumbRaw = thumbnail || image
  const thumbSrc = thumbRaw ? resolveMediaUrl(thumbRaw) : null
  const videoSrc = video ? resolveMediaUrl(video) : null
  const initial = name?.charAt(0)?.toUpperCase() || "U"

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex flex-col items-center shrink-0 cursor-pointer group/story relative"
    >
      <div className="w-[120px] h-[168px] rounded-2xl overflow-hidden relative flex flex-col border border-gray-200/80 shadow-sm transition-all duration-300 ease-out group-hover/story:shadow-lg group-hover/story:shadow-[#E08543]/15 group-hover/story:-translate-y-0.5">
        {thumbSrc ? (
          <div className="absolute inset-0">
            <Image src={thumbSrc} alt={name || ""} fill className="object-cover transition-transform duration-500 ease-out group-hover/story:scale-105" sizes="104px" />
          </div>
        ) : videoSrc ? (
          <div className="absolute inset-0 bg-black">
            <video src={videoSrc} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          </div>
        ) : bg ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: bg }}
          >
            <span className="text-white text-[13px] font-semibold text-center leading-tight px-2 line-clamp-4 drop-shadow-sm">
              {text || ""}
            </span>
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

        {/* Avatar en haut — anneau épais couleur Dughu, disparaît une fois le Flash lu */}
        <div
          className={cn(
            "absolute top-2.5 left-2.5 w-8 h-8 rounded-full overflow-hidden bg-[#A35A2A]",
            !viewed && "ring-4 ring-[#E08543]"
          )}
        >
          {avatarSrc ? (
            <Image src={avatarSrc} alt={name || ""} fill className="object-cover" sizes="32px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold bg-[#A35A2A]">
              {initial}
            </div>
          )}
        </div>

        {/* Nom incrusté en bas de la carte */}
        <span className="absolute bottom-2 left-2.5 right-2.5 text-[12px] font-semibold text-white truncate drop-shadow-sm">
          {name || "Utilisateur"}
        </span>
      </div>
    </button>
  )
}