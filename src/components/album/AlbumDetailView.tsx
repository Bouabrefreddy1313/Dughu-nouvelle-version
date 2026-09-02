"use client"

/**
 * Vue détail d'un album : grille de toutes les photos/vidéos, suppression
 * d'un média au survol (icône poubelle) avec confirmation, compteur mis à jour.
 */

import { useState } from "react"
import Image from "next/image"
import { ArrowLeft, Images, Trash2 } from "lucide-react"
import ConfirmDeleteModal from "./ConfirmDeleteModal"
import type { AlbumItem, AlbumMedia } from "@/types/album/album.types"

interface AlbumDetailViewProps {
  album: AlbumItem
  onBack: () => void
  onDeleteImage: (input: { albumId: string; imageId: string }) => void
  /** Id du média en cours de suppression (pour l'état pending). */
  deletingImageId?: string | null
}

export default function AlbumDetailView({ album, onBack, onDeleteImage, deletingImageId }: AlbumDetailViewProps) {
  const [target, setTarget] = useState<AlbumMedia | null>(null)

  return (
    <div>
      {/* En-tête : retour + nom + compteur */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-[#65676B] transition hover:bg-[#F5EFE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
          aria-label="Retour à la liste des albums"
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-[#2D2D2D]">{album.name || "Album sans nom"}</h2>
          <p className="text-xs text-[#65676B]">
            {album.count} {album.count > 1 ? "médias" : "média"}
          </p>
        </div>
      </div>

      {album.media.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[#F5EFE8] text-[#A35A2A]" aria-hidden>
            <Images size={26} />
          </span>
          <p className="mt-3 text-sm font-semibold text-[#2D2D2D]">Cet album est vide</p>
          <p className="mt-1 max-w-sm text-xs text-[#65676B]">
            Les photos et vidéos que vous publierez dans cet album apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {album.media.map((media) => (
            <li key={media.id} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              {media.type === "video" ? (
                <video src={media.url} className="size-full object-cover" muted playsInline />
              ) : (
                <Image
                  src={media.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 240px"
                  className="object-cover"
                  unoptimized
                />
              )}
              <button
                type="button"
                onClick={() => setTarget(media)}
                disabled={deletingImageId === media.id}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/80 disabled:opacity-50"
                aria-label={`Supprimer ce média de l'album ${album.name}`}
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteModal
        open={target !== null}
        title="Supprimer ce média ?"
        description="Cette action est irréversible. Le média sera retiré de l'album."
        pending={deletingImageId === target?.id}
        onConfirm={() => {
          if (!target) return
          onDeleteImage({ albumId: album.id, imageId: target.id })
          setTarget(null)
        }}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      />
    </div>
  )
}
