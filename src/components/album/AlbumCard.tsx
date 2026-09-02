"use client"

/**
 * Carte d'album réutilisable : cover (ou placeholder), nom, badge de visibilité
 * (Public/Privé), nombre de médias et menu contextuel (⋮) avec suppression.
 */

import { Globe, Images, Lock, MoreVertical, Trash2 } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AlbumItem } from "@/types/album/album.types"
import { cn } from "@/lib/utils"

interface AlbumCardProps {
  album: AlbumItem
  onOpen: (album: AlbumItem) => void
  onDelete: (album: AlbumItem) => void
}

export default function AlbumCard({ album, onOpen, onDelete }: AlbumCardProps) {
  // L'API renvoie « public » ou « prive » (sans accent) ; « private » reste
  // toléré pour les anciennes données.
  const isPublic = album.type !== "private" && album.type !== "prive"

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:border-[#E7CAB0]">
      {/* Cover cliquable */}
      <button
        type="button"
        onClick={() => onOpen(album)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
        aria-label={`Ouvrir l'album ${album.name}`}
      >
        {album.cover ? (
          <Image
            src={album.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-cover transition group-hover:scale-105"
            unoptimized
          />
        ) : (
          <span className="flex size-full items-center justify-center text-gray-300" aria-hidden>
            <Images size={40} />
          </span>
        )}
      </button>

      <div className="flex items-start justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => onOpen(album)}
          className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
        >
          <p className="truncate text-sm font-bold text-[#2D2D2D]">{album.name || "Album sans nom"}</p>
          <p className="mt-0.5 text-xs text-[#65676B]">
            {album.count} {album.count > 1 ? "médias" : "média"}
          </p>
        </button>

        {/* Menu contextuel (Base UI : le Trigger rend un bouton natif) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#65676B] transition hover:bg-[#F5EFE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
            aria-label={`Options de l'album ${album.name}`}
          >
            <MoreVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem
              onClick={() => onDelete(album)}
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <Trash2 size={14} aria-hidden />
              Supprimer l&apos;album
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badge de visibilité */}
      <span
        className={cn(
          "mx-3 mb-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          isPublic ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-[#65676B]"
        )}
      >
        {isPublic ? <Globe size={11} aria-hidden /> : <Lock size={11} aria-hidden />}
        {isPublic ? "Public" : "Privé"}
      </span>
    </div>
  )
}
