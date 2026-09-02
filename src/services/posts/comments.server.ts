/**
 * Service SERVEUR du domaine Commentaires — utilisé UNIQUEMENT par les
 * Route Handlers /api/comments. Ne connaît pas React, appelle l'API externe
 * Dughu via l'instance serveur (lib/dughu) et n'expose jamais de secret.
 */

import { dughu, dughuApi, mapComments, resolveMediaUrl } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * Récupère TOUS les commentaires Dughu d'un post.
 * L'API pagine par défaut par 10, on parcourt donc toutes les pages et on
 * déduplique les résultats.
 */
async function fetchAllDughuComments(postId: string, viewerDughuId: string) {
  const readPage = (pag: unknown): unknown[] => {
    const p = pag as Record<string, unknown> | null
    const unwrapped =
      p?.comments && typeof p.comments === "object" && !Array.isArray(p.comments)
        ? p.comments
        : p?.result && typeof p.result === "object" && !Array.isArray(p.result)
          ? p.result
          : p
    const u = unwrapped as Record<string, unknown> | null
    if (Array.isArray(u)) return u
    return (u?.data as unknown[]) || []
  }

  const first = await dughuApi.getComments(postId, viewerDughuId, 1)
  const f = first as Record<string, unknown> | null
  const firstUnwrapped =
    f?.comments && typeof f.comments === "object" && !Array.isArray(f.comments) ? f.comments : f
  const fu = firstUnwrapped as Record<string, unknown> | null
  const lastPage = Number(fu?.last_page || 1) || 1

  const remainingPages: number[] = []
  for (let p = 2; p <= lastPage; p++) remainingPages.push(p)

  const BATCH_SIZE = 3
  const results: unknown[][] = [readPage(first)]
  for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((p) => dughuApi.getComments(postId, viewerDughuId, p))
    )
    for (const r of batchResults) results.push(readPage(r))
  }

  const all = results.flat()
  const seen = new Set<string>()
  return all.filter((item) => {
    const c = item as Record<string, unknown>
    const id = String(c?.id ?? "")
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/**
 * L'API Dughu ne supporte qu'un seul niveau de réponses : `storeCommentReplique`
 * n'accepte que l'id d'un COMMENTAIRE racine. Si `parentId` est une réponse,
 * on résout l'id du commentaire racine qui la contient.
 */
async function resolveRootCommentId(postId: string, parentId: string, viewerDughuId: string): Promise<string> {
  try {
    const all = await fetchAllDughuComments(postId, viewerDughuId)
    for (const item of all) {
      const c = item as Record<string, unknown>
      const id = String(c?.id ?? "")
      if (id === parentId) return id
      const rawReplies =
        (Array.isArray(c?.reponses) && c?.reponses) ||
        (Array.isArray(c?.replies) && c?.replies) ||
        (Array.isArray(c?.children) && c?.children) ||
        (Array.isArray(c?.answers) && c?.answers)
      if (rawReplies) {
        for (const r of rawReplies as Record<string, unknown>[]) {
          if (String(r?.id ?? "") === parentId) return id
        }
      }
    }
  } catch { /* on retombe sur parentId en fallback */ }
  return parentId
}

export interface CommentListResult {
  success: boolean
  message?: string
  status?: number
  comments?: unknown
}

/** Liste tous les commentaires d'un post (retourne status 404 si non Dughu). */
export async function listCommentsForPost(
  postId: string,
  viewerDughuIdParam: string
): Promise<CommentListResult> {
  // Seule source : l'API Dughu (les posts Dughu ont un ID numérique).
  if (!dughu.enabled || !/^\d+$/.test(String(postId))) {
    return { success: false, message: "Publication introuvable.", status: 404 }
  }
  let viewerDughuId = viewerDughuIdParam || ""
  if (!viewerDughuId) viewerDughuId = await getDughuUserIdFromCookies()
  if (!viewerDughuId) viewerDughuId = "0"
  const rawList = await fetchAllDughuComments(String(postId), viewerDughuId)
  const comments = mapComments({ data: rawList }, viewerDughuId || "")
  return { success: true, comments }
}

export interface AddCommentInput {
  postId: string
  userId: string
  dughuUserId?: string
  content: string
  parentId: string | null
  file: File | null
}

export interface AddCommentResult {
  success: boolean
  message?: string
  status?: number
  comment?: unknown
}

/** Publie un commentaire (ou une réponse) sur l'API Dughu. */
export async function addCommentToDughu(input: AddCommentInput): Promise<AddCommentResult> {
  const { postId, userId, content, parentId, file } = input
  if (!dughu.enabled || !/^\d+$/.test(String(postId))) {
    return { success: false, message: "Publication introuvable.", status: 404 }
  }
  let dughuUserId = input.dughuUserId || ""
  if (!dughuUserId) {
    dughuUserId = await getDughuUserIdFromCookies()
  }
  if (!dughuUserId) {
    return { success: false, message: "ID Dughu requis.", status: 404 }
  }
  try {
    const dForm = new FormData()
    dForm.append("user_id", String(dughuUserId))
    dForm.append("post_id", String(postId))
    if (content?.trim()) dForm.append("text", content.trim())
    // Réponses plates sous le commentaire racine (contrainte API Dughu).
    let resolvedParentId = parentId ? String(parentId) : null
    if (parentId) {
      resolvedParentId = await resolveRootCommentId(String(postId), String(parentId), String(dughuUserId))
      dForm.append("comment_id", String(resolvedParentId))
    }
    // Média envoyé directement à Dughu (plus de stockage de fichier local).
    if (file) dForm.append("file", file, file.name)

    const raw = parentId ? await dughuApi.replyComment(dForm) : await dughuApi.addComment(dForm)
    const r = raw as Record<string, unknown> | null
    if (r?.success) {
      const result = (r.result || {}) as Record<string, unknown>
      const rawPath = String(result?.file_path || result?.file || result?.image || result?.c_file || "") || null
      const filePath = rawPath ? resolveMediaUrl(rawPath) : null
      const ft = String(result?.file_type || result?.fileType || "").toLowerCase()
      const isImage = ft.startsWith("image")
      const isVideo = ft.startsWith("video")
      const newReplyId = String(result?.id ?? "")
      return {
        success: true,
        status: 201,
        comment: {
          id: newReplyId || String(Date.now()),
          content: result?.text ?? content.trim(),
          userId,
          postId: String(postId),
          parentId: resolvedParentId || null,
          createdAt: result?.created_at || new Date().toISOString(),
          isMine: true,
          user: {
            id: String(dughuUserId),
            name: String(dughuUserId) || "Utilisateur",
            username: "",
            avatar: "/images/avatar.png",
          },
          liked: false,
          likesCount: 0,
          image: isImage ? filePath : null,
          video: isVideo ? filePath : null,
          file: !isImage && !isVideo && filePath ? filePath : null,
          fileType: ft || null,
        },
      }
    }
    return { success: false, message: (r?.message as string) || "Erreur commentaire (API Dughu).", status: 502 }
  } catch (err) {
    if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
    console.error("DUGHU ADD COMMENT ERROR:", err)
    return { success: false, message: "Erreur commentaire (API Dughu).", status: 502 }
  }
}

