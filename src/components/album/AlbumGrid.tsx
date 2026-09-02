"use client"

/**
 * Grille responsive des cartes albums + squelettes / état vide réutilisables
 * dans la page Album.
 */

import { Images } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import AlbumCard from "./AlbumCard"
import type { AlbumItem } from "@/types/album/album.types"

interface AlbumGridProps {
  albums: AlbumItem[]
  loading?: boolean
  onOpen: (album: AlbumItem) => void
  onDelete: (album: AlbumItem) => void
  /** Ouvre la modale de création (état vide). */
  onCreate: () => void
}

export function AlbumSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-44 rounded-2xl" />
      ))}
    </div>
  )
}

export function AlbumEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span className="flex size-16 items-center justify-center rounded-full bg-[#F5EFE8] text-[#A35A2A]" aria-hidden>
        <Images size={30} />
      </span>
      <p className="mt-3 text-sm font-bold text-[#2D2D2D]">Aucun album pour le moment</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#65676B]">
        Créez votre premier album pour rassembler vos plus belles photos et vidéos sur Dughu.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 rounded-full bg-[#A35A2A] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#8B5A2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
      >
        Créer mon premier album
      </button>
    </div>
  )
}

export default function AlbumGrid({ albums, loading = false, onOpen, onDelete, onCreate }: AlbumGridProps) {
  if (loading) return <AlbumSkeletons />
  if (albums.length === 0) return <AlbumEmpty onCreate={onCreate} />

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {albums.map((album) => (
        <AlbumCard key={album.id} album={album} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  )
}
