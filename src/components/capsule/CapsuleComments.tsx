"use client"

// ── CapsuleComments — panneau des commentaires d'une capsule ────────────────
// Liste hiérarchique (commentaires → réponses), ajout de commentaire,
// réponses et like de commentaire. Charge via /api/capsules/[id]/comments.

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, SendHorizonal, X } from "lucide-react"
import Avatar from "@/components/common/Avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { CapsuleComment } from "@/lib/capsule-service"
import {
  addCapsuleCommentClient,
  fetchCapsuleCommentsClient,
  likeCapsuleCommentClient,
  replyCapsuleCommentClient,
} from "@/hooks/queries/use-capsules"

interface CapsuleCommentsProps {
  capsuleId: string
  userId?: string
  onClose: () => void
  /** Appelé après un ajout / une réponse réussi(e) pour actualiser le compteur. */
  onCommentAdded?: () => void
}

function timeAgo(value: string) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

/**
 * Nom d'affichage d'un auteur de commentaire de capsule.
 * Les commentaires de l'utilisateur connecté s'affichent sous « Utilisateur »
 * (confidentialité) ; les autres auteurs conservent leur nom.
 */
function authorDisplayName(
  author: CapsuleComment["author"],
  currentUserId?: string
): string {
  if (author?.id && currentUserId && String(author.id) === String(currentUserId)) {
    return "Utilisateur"
  }
  return author?.name || "Utilisateur"
}

export default function CapsuleComments({ capsuleId, userId, onClose, onCommentAdded }: CapsuleCommentsProps) {
  const [comments, setComments] = useState<CapsuleComment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; isReplyReply?: boolean } | null>(null)
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Charge une page de commentaires depuis l'API distante (POST /fetchComments Dughu,
   * authentifié par le token de session). `append = true` ajoute la page à la liste
   * (pagination), sinon elle remplace la liste (chargement initial / réessai).
   */
  const load = useCallback(
    async (targetPage = 1, append = false) => {
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setLoadError(false)
        setErrorMessage("")
      }
      try {
        const res = await fetchCapsuleCommentsClient({ capsuleId, userId, page: targetPage })
        setComments((current) => {
          if (!append) return res.comments
          const seen = new Set(current.map((c) => c.id))
          return [...current, ...res.comments.filter((c) => !seen.has(c.id))]
        })
        setPage(res.pagination.page)
        setHasMore(res.pagination.hasMore)
        setLoadError(false)
      } catch (error) {
        console.error("Failed to load capsule comments:", error)
        setLoadError(true)
        setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les commentaires pour le moment.")
        if (append) toast.error("Impossible de charger plus de commentaires.")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [capsuleId, userId]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial du panneau : le spinner démarre dans l'état, la première page est chargée ici.
    void load(1, false)
  }, [load])

  const submit = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      if (replyTo) {
        const { reply } = await replyCapsuleCommentClient({
          capsuleId,
          commentId: replyTo.id,
          userId,
          content,
          isReplyReply: replyTo.isReplyReply,
        })
        if (reply) {
          // La réponse à une réponse est ajoutée à la réponse ciblée
          // (replies imbriquées) ; à un commentaire, à sa liste de réponses.
          setComments((current) =>
            replyTo.isReplyReply
              ? current.map((c) =>
                  c.replies.some((r) => r.id === replyTo.id)
                    ? { ...c, replies: c.replies.map((r) => (r.id === replyTo.id ? { ...r, replies: [...r.replies, reply] } : r)) }
                    : c
                )
              : patchComment(current, replyTo.id, (c) => ({ ...c, replies: [...c.replies, reply] }))
          )
        }
        setReplyTo(null)
        onCommentAdded?.()
      } else {
        const { comment } = await addCapsuleCommentClient({ capsuleId, userId, content })
        if (comment) setComments((current) => [...current, comment])
        onCommentAdded?.()
      }
      setDraft("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur commentaire")
    } finally {
      setSending(false)
    }
  }

  const likeComment = async (comment: CapsuleComment, parentCommentId?: string) => {
    if (!userId || pendingLikes.has(comment.id)) return
    setPendingLikes((s) => new Set(s).add(comment.id))
    // Mise à jour optimiste
    setComments((current) =>
      patchComment(current, comment.id, (c) => ({
        ...c,
        isLiked: true,
        likesCount: c.likesCount + (c.isLiked ? 0 : 1),
      }))
    )
    try {
      // Contrat Dughu /toggleLike/capsule/comment : comment_id = commentaire
      // racine parent, CommentReply_id = id de la réponse (si like d'une réponse).
      await likeCapsuleCommentClient({
        capsuleId,
        commentId: parentCommentId ?? comment.id,
        userId,
        replyId: parentCommentId ? comment.id : undefined,
      })
    } catch {
      // Rollback optimiste
      setComments((current) =>
        patchComment(current, comment.id, (c) => ({
          ...c,
          isLiked: false,
          likesCount: Math.max(0, c.likesCount - 1),
        }))
      )
      toast.error("Erreur de réaction")
    } finally {
      setPendingLikes((s) => {
        const next = new Set(s)
        next.delete(comment.id)
        return next
      })
    }
  }

  const startReply = (comment: CapsuleComment, isReplyReply = false) => {
    setReplyTo({ id: comment.id, name: authorDisplayName(comment.author, userId), isReplyReply })
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h4 className="text-[15px] font-semibold text-[#2D2D2D]">Commentaires</h4>
        <button type="button" onClick={onClose} aria-label="Fermer les commentaires" className="rounded-full p-1.5 text-[#65676B] hover:bg-[#F0F2F5]">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-10" role="status" aria-label="Chargement des commentaires">
            <Loader2 className="h-6 w-6 animate-spin text-[#985810]" />
            <span className="sr-only">Chargement des commentaires...</span>
          </div>
        ) : (
          <div>
            {loadError && comments.length === 0 && (
              <div className="mb-2 rounded-xl bg-[#FDEBEA] px-3 py-2 text-center" role="alert">
                <p className="text-[12px] text-[#B3402A]">
                  {errorMessage || "Impossible de charger les commentaires pour le moment."}
                </p>
                <button
                  type="button"
                  onClick={() => void load(1, false)}
                  className="mt-1 text-[12px] font-semibold text-[#985810] hover:underline"
                >
                  Réessayer
                </button>
              </div>
            )}
            {comments.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#65676B]">Aucun commentaire. Soyez le premier !</p>
            ) : (
              <>
                <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id}>
                <CapsuleCommentItem
                  comment={comment}
                  userId={userId}
                  onLike={likeComment}
                  onReply={startReply}
                  renderReply={(reply: CapsuleComment) => (
                    <div className="flex gap-2">
                      <Avatar src={reply.author?.avatar || undefined} name={reply.author?.name || "U"} size="sm" className="h-6 w-6 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="rounded-2xl bg-[#F0F2F5] px-3 py-1.5">
                          <p className="text-[11px] font-semibold text-[#2D2D2D]">{reply.author?.name || "Utilisateur"}</p>
                          <p className="whitespace-pre-wrap break-words text-[12px] text-[#2D2D2D]">{reply.content}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-3 pl-2 text-[11px] text-[#65676B]">
                          <span>{timeAgo(reply.createdAt)}</span>
                          <button
                            type="button"
                            onClick={() => likeComment(reply, comment.id)}
                            disabled={!userId}
                            className={cn("font-medium disabled:opacity-50", reply.isLiked ? "text-[#985810]" : "hover:underline")}
                          >
                            J&apos;aime{reply.likesCount > 0 ? ` · ${reply.likesCount}` : ""}
                          </button>
                          <button type="button" onClick={() => startReply(reply, true)} className="font-medium hover:underline">
                            Répondre
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                />
              </li>
            ))}
              </ul>
                {hasMore && (
                  <div className="pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => void load(page + 1, true)}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1 rounded-full border border-[#985810]/40 px-4 py-1.5 text-[12px] font-semibold text-[#985810] transition hover:bg-[#985810]/5 disabled:opacity-50"
                    >
                      {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                      Charger plus de commentaires
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        {replyTo && (
          <p className="mb-1 text-[11px] text-[#65676B]">
            Réponse à <span className="font-semibold">{replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="ml-2 text-[#985810] hover:underline">
              annuler
            </button>
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={replyTo ? `Répondre à ${replyTo.name}...` : "Ajouter un commentaire..."}
            aria-label="Votre commentaire"
            maxLength={1000}
            className="flex-1 rounded-full bg-[#F0F2F5] px-4 py-2 text-[13px] text-[#2D2D2D] outline-none focus:ring-2 focus:ring-[#985810]/40"
          />
          <Button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Envoyer"
            className="!h-9 !w-9 !rounded-full !bg-[#985810] !p-0 text-white disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Item de commentaire (commentaire ou réponse) ────────────────────────────
// Affiche un commentaire avec son auteur, ses actions (J'aime / Répondre) et
// rend ses réponses via `renderReply`. Réutilisé pour les réponses imbriquées.

interface CapsuleCommentItemProps {
  comment: CapsuleComment
  userId?: string
  onLike: (comment: CapsuleComment) => void
  onReply: (comment: CapsuleComment, isReplyReply?: boolean) => void
  renderReply: (reply: CapsuleComment) => React.ReactNode
}

function CapsuleCommentItem({ comment, userId, onLike, onReply, renderReply }: CapsuleCommentItemProps) {
  return (
    <div className="flex gap-2">
      <Avatar src={comment.author?.avatar || undefined} name={comment.author?.name || "U"} size="sm" className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-[#F0F2F5] px-3 py-1.5">
          <p className="text-[12px] font-semibold text-[#2D2D2D]">{authorDisplayName(comment.author, userId)}</p>
          <p className="whitespace-pre-wrap break-words text-[13px] text-[#2D2D2D]">{comment.content}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-2 text-[11px] text-[#65676B]">
          <span>{timeAgo(comment.createdAt)}</span>
          <button
            type="button"
            onClick={() => onLike(comment)}
            disabled={!userId}
            className={cn("font-medium disabled:opacity-50", comment.isLiked ? "text-[#985810]" : "hover:underline")}
          >
            J&apos;aime{comment.likesCount > 0 ? ` · ${comment.likesCount}` : ""}
          </button>
          <button type="button" onClick={() => onReply(comment)} className="font-medium hover:underline">
            Répondre
          </button>
        </div>
        {comment.replies.length > 0 && (
          <ul className="mt-2 space-y-2 pl-2">
            {comment.replies.map((reply) => (
              <li key={reply.id}>{renderReply(reply)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Met à jour un commentaire (ou une réponse imbriquée) dans la liste. */
function patchComment(
  list: CapsuleComment[],
  commentId: string,
  patch: (c: CapsuleComment) => CapsuleComment
): CapsuleComment[] {
  return list.map((c) => {
    if (c.id === commentId) return patch(c)
    if (c.replies.length > 0) {
      const replies = c.replies.map((r) => (r.id === commentId ? patch(r) : r))
      return { ...c, replies }
    }
    return c
  })
}

