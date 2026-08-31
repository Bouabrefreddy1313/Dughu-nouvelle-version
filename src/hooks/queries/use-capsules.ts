"use client"

// ── Hook client Capsules (React Query) ──────────────────────────────────────
// suit le même pattern que use-flash.ts : fetch vers les routes internes
// /api/capsules/* + actions client (like, dislike, vue, commentaires…).

import { useQuery } from "@tanstack/react-query"
import type { Capsule, CapsuleComment, CapsuleCommentsResult } from "@/lib/capsule-service"

interface FeedParams {
  userId?: string
  page?: number
  perPage?: number
}

async function fetchCapsulesFeed({ userId, page = 1, perPage }: FeedParams) {
  const qs = new URLSearchParams()
  if (userId) qs.set("userId", userId)
  qs.set("page", String(page))
  if (perPage) qs.set("perPage", String(perPage))
  const res = await fetch(`/api/capsules?${qs}`)
  if (!res.ok) throw new Error("Erreur capsules")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Erreur capsules")
  return data as {
    success: boolean
    capsules: Capsule[]
    pagination: { page: number; perPage: number; total: number; hasMore: boolean }
  }
}

/** Feed des capsules (utilisé par la page /capsules et le rail du fil). */
export function useCapsulesFeed(params: FeedParams) {
  return useQuery({
    queryKey: ["capsules", "feed", params.userId ?? "", params.page ?? 1, params.perPage ?? ""],
    queryFn: () => fetchCapsulesFeed(params),
    enabled: !!params.userId,
    staleTime: 60_000,
  })
}

/** Like / unlike une capsule. */
export function toggleCapsuleLikeClient({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return postJson(`/api/capsules/${encodeURIComponent(capsuleId)}/react`, { action: "like", userId }) as
    Promise<{ success: boolean; liked?: boolean }>
}

/** Dislike / undislike une capsule. */
export function toggleCapsuleDislikeClient({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return postJson(`/api/capsules/${encodeURIComponent(capsuleId)}/react`, { action: "dislike", userId }) as
    Promise<{ success: boolean; disliked?: boolean }>
}

/** Enregistre une vue sur une capsule (best effort, sans erreur bloquante). */
export async function logCapsuleViewClient({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  try {
    const res = await fetch(`/api/capsules/${encodeURIComponent(capsuleId)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json().catch(() => ({ success: false }))
    return { ok: res.ok && !!data.success }
  } catch {
    return { ok: false }
  }
}

/** Commentaires d'une capsule (page demandée → commentaires distants + pagination). */
export async function fetchCapsuleCommentsClient({
  capsuleId,
  userId,
  page = 1,
}: {
  capsuleId: string
  userId?: string
  page?: number
}): Promise<CapsuleCommentsResult> {
  const qs = new URLSearchParams()
  if (userId) qs.set("userId", userId)
  qs.set("page", String(Math.max(1, page)))
  const res = await fetch(`/api/capsules/${encodeURIComponent(capsuleId)}/comments?${qs}`)
  const data = await res.json().catch(() => ({ success: false }))
  if (!res.ok || !data.success) throw new Error(data.message || "Erreur commentaires")
  const safePage = Math.max(1, page)
  const fallback = { page: safePage, perPage: 5, total: 0, lastPage: safePage, hasMore: false }
  return {
    comments: (data.comments || []) as CapsuleComment[],
    pagination: data.pagination || fallback,
  }
}

/** Ajoute un commentaire sur une capsule. */
export function addCapsuleCommentClient({ capsuleId, userId, content }: { capsuleId: string; userId?: string; content: string }) {
  return postJson(`/api/capsules/${encodeURIComponent(capsuleId)}/comments`, { content, userId }) as
    Promise<{ success: boolean; comment?: CapsuleComment | null }>
}

/** Répond à un commentaire (ou à une réponse) d'une capsule. */
export function replyCapsuleCommentClient({
  capsuleId,
  commentId,
  userId,
  content,
  isReplyReply = false,
}: {
  capsuleId: string
  commentId: string
  userId?: string
  content: string
  isReplyReply?: boolean
}) {
  return postJson(
    `/api/capsules/${encodeURIComponent(capsuleId)}/comments/${encodeURIComponent(commentId)}`,
    { action: isReplyReply ? "replyReply" : "reply", content, userId }
  ) as Promise<{ success: boolean; reply?: CapsuleComment | null }>
}

/** Like / unlike un commentaire de capsule. */
export function likeCapsuleCommentClient({
  capsuleId,
  commentId,
  userId,
}: {
  capsuleId: string
  commentId: string
  userId?: string
}) {
  return postJson(
    `/api/capsules/${encodeURIComponent(capsuleId)}/comments/${encodeURIComponent(commentId)}`,
    { action: "like", userId }
  ) as Promise<{ success: boolean; liked?: boolean; likesCount?: number }>
}

/** Signale une capsule. */
export function reportCapsuleClient({ capsuleId, userId, reason }: { capsuleId: string; userId?: string; reason?: string }) {
  return postJson(`/api/capsules/${encodeURIComponent(capsuleId)}/report`, { reason, userId })
}

/** Supprime une capsule (auteur uniquement). */
export async function deleteCapsuleClient(capsuleId: string) {
  const res = await fetch(`/api/capsules/${encodeURIComponent(capsuleId)}`, { method: "DELETE" })
  const data = await res.json().catch(() => ({ success: false }))
  if (!res.ok || !data.success) throw new Error(data.message || "Erreur suppression")
  return data
}

/** Crée une capsule (POST /store/capsule Dughu via la route interne multipart). */
export async function createCapsuleClient({
  video,
  caption,
  userId,
}: {
  video: File
  caption?: string
  userId?: string
}): Promise<Capsule | null> {
  const formData = new FormData()
  formData.append("video", video)
  if (caption) formData.append("caption", caption)
  if (userId) formData.append("userId", userId)
  const res = await fetch("/api/capsules", { method: "POST", body: formData })
  const data = await res.json().catch(() => ({ success: false }))
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Impossible de publier votre capsule.")
  }
  return (data.capsule as Capsule | null) ?? null
}

/** Capsules d'un utilisateur précis (GET /shortsUser/{user_id} Dughu). */
export function useUserCapsules(targetUserId?: string, viewerId?: string) {
  return useQuery({
    queryKey: ["capsules", "user", String(targetUserId ?? ""), String(viewerId ?? "")],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (viewerId) qs.set("viewerId", viewerId)
      const res = await fetch(
        `/api/capsules/user/${encodeURIComponent(String(targetUserId))}?${qs}`
      )
      const data = await res.json().catch(() => ({ success: false }))
      if (!res.ok || !data.success) throw new Error(data.message || "Erreur capsules")
      return (data.capsules || []) as Capsule[]
    },
    enabled: !!targetUserId,
    staleTime: 60_000,
  })
}

/* ── Actions ───────────────────────────────────────────────────────────────── */

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ success: false }))
  if (!res.ok || !data.success) throw new Error(data.message || "Erreur capsules")
  return data
}
