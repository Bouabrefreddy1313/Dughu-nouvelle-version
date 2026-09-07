"use client"

/**
 * Hooks client « Pages / Espaces » (TanStack Query).
 *
 * Les appels HTTP passent par les services frontend du domaine (instance Axios
 * cliente). Aucun fetch ici. Les mutations (like, boost, destroy, invite,
 * admins…) ne bénéficient d'AUCUN retry automatique (non idempotentes).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createOrUpdatePage,
  destroyPage,
  fetchPageDetail,
  fetchPages,
  inviteFriend,
  type PagesScope,
  updatePointsRecipient,
  updateSocialLinks,
  uploadPageImage,
} from "@/services/pages/pages.service"

export type { PagesScope } from "@/services/pages/pages.service"
import {
  addAdmin,
  removeAdmin,
  requestVerification,
  removeVerification,
  toggleVerification,
  updateAdminPrivileges,
} from "@/services/pages/page-admin.service"
import {
  boostPage,
  createOffer,
  fetchBoostPrice,
  fetchPageOffers,
} from "@/services/pages/page-offer.service"
import { fetchPageStats, type StatsFilter } from "@/services/pages/page-stats.service"
import type {
  DughuPage,
  PageFormValues,
  PageMutationResponse,
  PageSocialLinks,
} from "@/types/pages/pages.types"

const PAGE_DETAIL_KEY = (pageId: string) => ["page-detail", pageId]
const PAGES_LIST_KEY = (scope: PagesScope, q?: string) => ["pages-list", scope, q || ""]

/* ─────────────────────────────── REQUÊTES ─────────────────────────────── */

/** Liste des pages (feed / mine / liked / suggestions / administered). */
export function usePagesList(scope: PagesScope, params: { userId?: string; page?: number; q?: string; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...PAGES_LIST_KEY(scope, params.q), params.page ?? 1, params.userId],
    queryFn: () => fetchPages(scope, { page: params.page ?? 1, q: params.q }),
    enabled: (params.enabled ?? true) && !!params.userId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

/** Détail d'une page (POST /show/pages). */
export function usePageDetail(pageId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: [...PAGE_DETAIL_KEY(pageId || ""), userId || ""],
    queryFn: () => fetchPageDetail(pageId!, userId),
    enabled: !!pageId,
    staleTime: 30_000,
  })
}

/** Catégories des pages. */
export function usePageCategories() {
  return useQuery({
    queryKey: ["pages-categories"],
    queryFn: async () => {
      const { fetchPageCategories } = await import("@/services/pages/pages.service")
      return fetchPageCategories()
    },
    staleTime: 10 * 60_000,
  })
}

/** Actualité d'une page (GET /api/pages/:id/posts) — format PostCard complet. */
export function usePagePosts(pageId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ["page-posts", pageId || "", page],
    queryFn: async () => {
      const { fetchPagePosts } = await import("@/services/pages/pages.service")
      return fetchPagePosts(pageId!, page)
    },
    enabled: !!pageId,
    staleTime: 30_000,
  })
}

/** Galerie d'images. */
export function usePageImages(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-images", pageId || ""],
    queryFn: async () => {
      const { fetchPageImages } = await import("@/services/pages/pages.service")
      return fetchPageImages(pageId!, 1)
    },
    enabled: !!pageId,
    staleTime: 30_000,
  })
}

/** Likes d'une page. */
export function usePageLikes(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-likes", pageId || ""],
    queryFn: async () => {
      const { fetchPageLikes } = await import("@/services/pages/pages.service")
      return fetchPageLikes(pageId!)
    },
    enabled: !!pageId,
    staleTime: 30_000,
  })
}

/** Amis invitables à une page. */
export function useInvitableFriends(pageId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ["page-invites", pageId || ""],
    queryFn: async () => {
      const { fetchInvitableFriends } = await import("@/services/pages/pages.service")
      return fetchInvitableFriends(pageId!)
    },
    enabled: enabled && !!pageId,
    staleTime: 30_000,
  })
}

/** Statistiques (réservées aux admins). */
export function usePageStats(pageId: string | undefined, userId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ["page-stats", pageId || "", userId || ""],
    queryFn: () => fetchPageStats(pageId!, userId!, "all"),
    enabled: enabled && !!pageId && !!userId,
    retry: false,
    staleTime: 60_000,
  })
}

/** Prix d'un boost (appel à la demande du composant BoostModal). */
export function useBoostPrice() {
  return useQuery({
    queryKey: ["page-boost-price"],
    queryFn: () => fetchBoostPrice(7),
    enabled: false,
  })
}

/** Offres de la page (GET /api/pages/:id/offers). */
export function usePageOffers(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-offers", pageId || ""],
    queryFn: () => fetchPageOffers(pageId!),
    enabled: !!pageId,
    staleTime: 30_000,
  })
}

/* ─────────────────────────────── MUTATIONS ─────────────────────────────── */

function invalidatePages(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["pages-list"] })
  void queryClient.invalidateQueries({ queryKey: ["page-detail"] })
}

/** Like / unlike d'une page — MISE À JOUR OPTIMISTE du cache détail. */
export function useLikePage(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { likePage } = await import("@/services/pages/pages.service")
      return likePage(pageId)
    },
    retry: 0,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: PAGE_DETAIL_KEY(pageId) })
      const previous = queryClient.getQueryData<{ page?: DughuPage }>(PAGE_DETAIL_KEY(pageId))
      const page = previous?.page
      if (page) {
        const nowLiked = !page.isLiked
        queryClient.setQueryData<{ page?: DughuPage }>(PAGE_DETAIL_KEY(pageId), {
          page: { ...page, isLiked: nowLiked, likeCount: Math.max(0, page.likeCount + (nowLiked ? 1 : -1)) },
        })
      }
      return { previous }
    },
    onError: (_error, _vars, context) => {
      const previous = context?.previous as { page?: DughuPage } | undefined
      if (previous?.page) queryClient.setQueryData(PAGE_DETAIL_KEY(pageId), previous)
    },
    onSuccess: (data) => {
      if (data?.isLike !== undefined) {
        const confirmedLiked = Boolean(data.isLike)
        queryClient.setQueryData<{ page?: DughuPage }>(PAGE_DETAIL_KEY(pageId), (old) => {
          if (!old?.page) return old
          const diff = confirmedLiked ? (old.page.isLiked ? 0 : 1) : (old.page.isLiked ? -1 : 0)
          return {
            ...old,
            page: {
              ...old.page,
              isLiked: confirmedLiked,
              likeCount: Math.max(0, old.page.likeCount + diff),
            },
          }
        })
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) })
      void queryClient.invalidateQueries({ queryKey: ["pages-list"] })
    },
  })
}

/** Création / édition d'une page — avec upload éventuel d'avatar/cover (création). */
export function useCreateOrUpdatePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: PageFormValues & { pageId?: string }) => {
      const result = await createOrUpdatePage(values)
      const createdId = result.result?.page_id
      // Après création, on téléverse les photos de couverture et de profil
      // (élément optionnel en étape 1 du wizard). Aucun retry (mutation).
      if (createdId && values.coverImage) {
        try { await uploadPageImage(String(createdId), values.coverImage, "cover") } catch {}
      }
      if (createdId && values.profileImage) {
        try { await uploadPageImage(String(createdId), values.profileImage, "avatar") } catch {}
      }
      return result
    },
    retry: 0,
    onSettled: () => invalidatePages(queryClient),
  })
}

/** Suppression d'une page — le composant doit demander le MOT DE PASSE d'abord. */
export function useDestroyPage(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) => destroyPage(pageId, password),
    retry: 0,
    onSettled: () => {
      invalidatePages(queryClient)
      void queryClient.removeQueries({ queryKey: PAGE_DETAIL_KEY(pageId) })
    },
  })
}

/** Upload avatar / cover. */
export function useUploadPageImage(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, element }: { file: File; element: "avatar" | "cover" }) => uploadPageImage(pageId, file, element),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) })
    },
  })
}

/** Inviter un ami. */
export function useInviteFriend(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendId: string) => inviteFriend(pageId, friendId),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["page-invites", pageId] }),
  })
}

/** Ajouter un admin. */
export function useAddAdmin(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => addAdmin(pageId, userId),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Retirer un admin. */
export function useRemoveAdmin(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeAdmin(pageId, userId),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Mettre à jour les privilèges d'un admin. */
export function useUpdateAdminPrivileges(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { adminId: string; privileges: { general: boolean; info: boolean; social: boolean; avatar: boolean; design: boolean; admins: boolean; analytics: boolean; deletePage: boolean } }) =>
      updateAdminPrivileges(pageId, payload.adminId, payload.privileges),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Demande de vérification. */
export function useRequestVerification(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => requestVerification(pageId),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Retrait de vérification. */
export function useRemoveVerification(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeVerification(pageId),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Bascule de vérification (modération). */
export function useToggleVerification(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => toggleVerification(pageId),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Booster une page. */
export function useBoostPage(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => boostPage(pageId, days),
    retry: 0,
    onSettled: () => invalidatePages(queryClient),
  })
}

/** Créer une offre. */
export function useCreateOffer(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { description: string; discountType: string; discountPercent: number; expireDate: string; expireTime: string }) =>
      createOffer(pageId, payload),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["page-offers", pageId] }),
  })
}

/** Destinataire des points. */
export function useUpdatePointsRecipient(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recipient: "subscriber" | "owner" | "none") => updatePointsRecipient(pageId, recipient),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}

/** Liens sociaux. */
export function useUpdateSocialLinks(pageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (links: PageSocialLinks) => updateSocialLinks(pageId, links),
    retry: 0,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: PAGE_DETAIL_KEY(pageId) }),
  })
}