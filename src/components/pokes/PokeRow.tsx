"use client"

/**
 * Ligne d'un poke (réutilisable par les 3 onglets) : avatar, nom, date et
 * zone d'action (bouton fourni par l'onglet parent). Purement
 * présentationnelle : aucune logique réseau ici.
 */

import Image from "next/image"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/helpers"
import type { Poke } from "@/types/pokes/pokes.types"

interface PokeRowProps {
  poke: Poke
  /** Libellé du bouton d'action (ex. « Répondre », « Poker »). */
  actionLabel: string
  /** Style du bouton : principal (orange) ou secondaire (contour). */
  actionTone?: "primary" | "secondary"
  /** Action en cours pour cette ligne (désactive le bouton). */
  pending?: boolean
  onAction: (poke: Poke) => void
}

export default function PokeRow({
  poke,
  actionLabel,
  actionTone = "primary",
  pending = false,
  onAction,
}: PokeRowProps) {
  return (
    <li className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#F0F2F5]">
        <Image
          src={poke.user.avatar || "/images/avatar.png"}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
          unoptimized={poke.user.avatar?.startsWith("http")}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[#2D2D2D]">{poke.user.name}</p>
        <p className="truncate text-xs text-[#65676B]">
          {poke.user.username ? `@${poke.user.username}` : ""}
          {poke.user.username && poke.createdAt ? " · " : ""}
          {poke.createdAt ? timeAgo(poke.createdAt) : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAction(poke)}
        disabled={pending}
        aria-label={`${actionLabel} — ${poke.user.name}`}
        className={cn(
          "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A] disabled:cursor-not-allowed disabled:opacity-60",
          actionTone === "primary"
            ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
            : "border border-[#A35A2A]/40 bg-white text-[#A35A2A] hover:bg-[#F5EFE8]"
        )}
      >
        {pending ? "…" : actionLabel}
      </button>
    </li>
  )
}
