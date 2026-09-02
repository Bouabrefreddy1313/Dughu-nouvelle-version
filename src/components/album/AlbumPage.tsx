"use client"

/**
 * Page « Album » — liste des albums de l'utilisateur connecté
 * (GET /album?user_id=&page=), création (POST /album, multipart avec
 * progression), suppression d'un album (DELETE /album/{id}) et d'un média
 * (DELETE /destroyOneImage/{image_id}) — le tout avec confirmations et
 * mises à jour optimistes.
 */

import { useMemo, useState } from "react"
import { ImagePlus, RefreshCw } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  useAlbums,
  useCreateAlbum,
  useDeleteAlbum,
  useDeleteAlbumImage,
} from "@/hooks/album/use-albums"
import AlbumGrid from "./AlbumGrid"
import AlbumDetailView from "./AlbumDetailView"
import CreateAlbumModal from "./CreateAlbumModal"
import ConfirmDeleteModal from "./ConfirmDeleteModal"
import type { AlbumItem, AlbumVisibility } from "@/types/album/album.types"

export default function AlbumPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<AlbumItem | null>(null)
  const [openedAlbumId, setOpenedAlbumId] = useState<string | null>(null)

  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  const albumsQuery = useAlbums({ userId })
  const createAlbum = useCreateAlbum({ userId })
  const deleteAlbum = useDeleteAlbum({ userId })
  const deleteAlbumImage = useDeleteAlbumImage({ userId })

  const albums = useMemo(() => albumsQuery.data?.albums ?? [], [albumsQuery.data])
  const openedAlbum = albums.find((album) => album.id === openedAlbumId) ?? null

  const isLoading = albumsQuery.isLoading || albumsQuery.isFetching
  const isError = albumsQuery.isError
  const errorMessage =
    albumsQuery.error instanceof Error ? albumsQuery.error.message : "Impossible de charger vos albums."

  const handleCreate = (input: { albumName: string; type: AlbumVisibility; files: File[] }) => {
    createAlbum.mutate(
      { ...input, onProgress: setProgress },
      {
        onSuccess: () => {
          setCreateOpen(false)
          setProgress(undefined)
        },
        onError: () => setProgress(undefined),
      }
    )
  }

  return (
    <MainLayout user={rawUser} noRightSidebar active="album" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-5 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F5EFE8] text-[#A35A2A]">
              <ImagePlus size={22} aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Album</h1>
              <p className="mt-0.5 text-sm text-[#65676B]">Vos photos et vidéos, organisées en albums.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#A35A2A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8B5A2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]"
          >
            <ImagePlus size={16} aria-hidden />
            <span className="hidden sm:inline">Créer un album</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </header>

        <div className="min-h-[420px]">
          {isError ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-sm font-semibold text-[#2D2D2D]">{errorMessage}</p>
              <p className="mt-1 text-xs text-[#65676B]">Vérifiez votre connexion puis réessayez.</p>
              <button
                type="button"
                onClick={() => void albumsQuery.refetch()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#A35A2A] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#8B5A2B]"
              >
                <RefreshCw size={14} aria-hidden />
                Réessayer
              </button>
            </div>
          ) : openedAlbum ? (
            <AlbumDetailView
              album={openedAlbum}
              onBack={() => setOpenedAlbumId(null)}
              onDeleteImage={({ albumId, imageId }) => deleteAlbumImage.mutate({ albumId, imageId })}
              deletingImageId={deleteAlbumImage.isPending ? deleteAlbumImage.variables?.imageId : null}
            />
          ) : (
            <AlbumGrid
              albums={albums}
              loading={isLoading}
              onOpen={(album) => setOpenedAlbumId(album.id)}
              onDelete={(album) => setDeleteTarget(album)}
              onCreate={() => setCreateOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Création */}
      <CreateAlbumModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        progress={progress}
        pending={createAlbum.isPending}
        error={createAlbum.error instanceof Error ? createAlbum.error.message : null}
      />

      {/* Suppression d'un album */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Supprimer cet album ?"
        description="Cette action est irréversible, voulez-vous vraiment supprimer cet album et tout son contenu ?"
        pending={deleteAlbum.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteAlbum.mutate(deleteTarget.id, {
            onSuccess: () => {
              if (openedAlbumId === deleteTarget.id) setOpenedAlbumId(null)
              setDeleteTarget(null)
            },
          })
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </MainLayout>
  )
}
