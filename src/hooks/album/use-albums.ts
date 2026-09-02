/**
 * Hook client Album (TanStack Query).
 *
 * Utilise le service frontend album.service.ts (aucun fetch ni Axios ici) :
 *  - `useAlbums` : liste paginée des albums de l'utilisateur connecté ;
 *  - `useCreateAlbum` : création (multipart) puis invalidation de la liste ;
 *  - `useDeleteAlbum` / `useDeleteAlbumImage` : suppression avec mise à jour
 *    optimiste de la liste (rollback + erreur en cas d'échec).
 */

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchAlbums,
  createAlbum,
  deleteAlbum,
  deleteAlbumImage,
} from "@/services/album/album.service"
import type { AlbumListResponse } from "@/types/album/album.types"

export function useAlbums(params: { userId?: string; enabled?: boolean } = {}) {
  const { userId, enabled = true } = params

  return useQuery<AlbumListResponse>({
    queryKey: ["albums", userId ?? ""],
    queryFn: ({ signal }) => fetchAlbums({ userId }, signal),
    enabled: enabled && !!userId,
    staleTime: 30_000,
  })
}

export function useCreateAlbum(params: { userId?: string } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { albumName: string; type: string; files: File[]; onProgress?: (p: number) => void }) =>
      createAlbum(
        { albumName: input.albumName, type: input.type, files: input.files, userId: params.userId },
        { onProgress: input.onProgress }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["albums", params.userId ?? ""] })
    },
  })
}

export function useDeleteAlbum(params: { userId?: string } = {}) {
  const queryClient = useQueryClient()
  const listKey = ["albums", params.userId ?? ""]

  return useMutation({
    mutationFn: (albumId: string) => deleteAlbum(albumId),
    // Mise à jour optimiste : on retire l'album de la liste immédiatement.
    onMutate: async (albumId) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<AlbumListResponse>(listKey)
      queryClient.setQueryData<AlbumListResponse>(listKey, (old) =>
        old
          ? { ...old, albums: old.albums.filter((a) => a.id !== albumId) }
          : old
      )
      return { previous }
    },
    onError: (_error, _albumId, context) => {
      // Rollback en cas d'échec.
      if (context?.previous) queryClient.setQueryData(listKey, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}

export function useDeleteAlbumImage(params: { userId?: string } = {}) {
  const queryClient = useQueryClient()
  const listKey = ["albums", params.userId ?? ""]

  return useMutation({
    mutationFn: (input: { albumId: string; imageId: string }) => deleteAlbumImage(input.imageId),
    // Mise à jour optimiste : on retire le média de l'album et on ajuste
    // le compteur + la cover si c'était la première image.
    onMutate: async ({ albumId, imageId }) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<AlbumListResponse>(listKey)
      queryClient.setQueryData<AlbumListResponse>(listKey, (old) =>
        old
          ? {
              ...old,
              albums: old.albums.map((album) => {
                if (album.id !== albumId) return album
                const media = album.media.filter((m) => m.id !== imageId)
                return {
                  ...album,
                  media,
                  count: media.length,
                  cover: media[0]?.url || "",
                }
              }),
            }
          : old
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}
