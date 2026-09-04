"use client"

import { useState } from "react"
import {
  ThumbsUp,
  MessageSquare,
  CornerDownRight,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import type { AkwaComment } from "@/types/akwaplay/akwaplay.types"

interface AkwaCommentsSectionProps {
  comments: AkwaComment[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  submitting: boolean
  currentUserId?: string | number
  currentUserAvatar?: string | null
  onLoadMore: () => void
  onAddComment: (content: string) => Promise<any>
  onLoadReplies: (commentId: string | number) => Promise<void>
  onReply: (commentId: string | number, content: string) => Promise<any>
  onToggleLikeComment: (commentId: string | number) => Promise<any> | void
  onToggleLikeReply: (commentId: string | number, replyId: string | number) => Promise<any> | void
  onDeleteComment: (commentId: string | number) => Promise<void>
  onDeleteReply: (replyId: string | number, commentId: string | number) => Promise<void>
}

export default function AkwaCommentsSection({
  comments,
  loading,
  loadingMore,
  hasMore,
  submitting,
  currentUserId,
  currentUserAvatar,
  onLoadMore,
  onAddComment,
  onLoadReplies,
  onReply,
  onToggleLikeComment,
  onToggleLikeReply,
  onDeleteComment,
  onDeleteReply,
}: AkwaCommentsSectionProps) {
  const [commentInput, setCommentInput] = useState("")
  const [activeReplyId, setActiveReplyId] = useState<string | number | null>(null)
  const [replyInput, setReplyInput] = useState("")
  const [expandedReplies, setExpandedReplies] = useState<Record<string | number, boolean>>({})

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || submitting) return
    try {
      await onAddComment(commentInput.trim())
      setCommentInput("")
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi du commentaire.")
    }
  }

  const handleReplySubmit = async (commentId: string | number) => {
    if (!replyInput.trim()) return
    try {
      await onReply(commentId, replyInput.trim())
      setReplyInput("")
      setActiveReplyId(null)
      setExpandedReplies((prev) => ({ ...prev, [commentId]: true }))
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi de la réponse.")
    }
  }

  const toggleShowReplies = async (commentId: string | number) => {
    const isExpanded = expandedReplies[commentId]
    if (!isExpanded) {
      await onLoadReplies(commentId)
    }
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !isExpanded }))
  }

  return (
    <section className="mt-8 pt-6 border-t border-[#2a2a2a]">
      {/* En-tête commentaires */}
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Commentaires</span>
          <span className="text-sm font-semibold text-[#888888]">({comments.length})</span>
        </h3>
      </div>

      {/* Zone de saisie nouveau commentaire */}
      <form onSubmit={handleCommentSubmit} className="flex gap-3.5 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentUserAvatar || "/images/avatar.png"}
          alt="Votre avatar"
          className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-[#3a3a3a]"
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Ajoutez un commentaire public..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-[#777777] bg-[#1a1a1a] border border-[#2e2e2e] focus:border-[#f5821f] outline-none transition resize-none"
          />
          {commentInput.trim().length > 0 && (
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setCommentInput("")}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#9a9a9a] hover:text-white transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white transition disabled:opacity-50 flex items-center gap-1.5"
                style={{ backgroundColor: "#f5821f" }}
              >
                <Send size={13} />
                <span>{submitting ? "Publication..." : "Commenter"}</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Liste des commentaires */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3.5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[#252525] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-[#252525] rounded" />
                <div className="h-3 w-full bg-[#202020] rounded" />
                <div className="h-3 w-2/3 bg-[#202020] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center text-[#777777] text-sm">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
          <p>Aucun commentaire pour le moment.</p>
          <p className="text-xs text-[#555555] mt-1">Soyez le premier à donner votre avis !</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            const isAuthor =
              currentUserId &&
              String(comment.userId || comment.user?.id) === String(currentUserId)
            const repliesOpen = Boolean(expandedReplies[comment.id])
            const totalReplies = Math.max(comment.repliesCount || 0, comment.replies?.length || 0)

            return (
              <div key={comment.id} className="flex gap-3.5 group/comment">
                {/* Avatar */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comment.user?.avatar || "/images/avatar.png"}
                  alt={comment.user?.name || "Auteur"}
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-[#3a3a3a]"
                />

                <div className="flex-1 min-w-0">
                  {/* Nom & date */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{comment.user?.name}</span>
                    <span className="text-[11px] text-[#777777]">{comment.timeAgo}</span>
                  </div>

                  {/* Contenu */}
                  <p className="text-sm text-[#e0e0e0] mt-1 whitespace-pre-line leading-relaxed">
                    {comment.content}
                  </p>

                  {/* Barre d'action commentaire */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#9a9a9a]">
                    <button
                      onClick={() => onToggleLikeComment(comment.id)}
                      className={`flex items-center gap-1.5 hover:text-white transition ${
                        comment.isLiked ? "text-[#f5821f] font-semibold" : ""
                      }`}
                    >
                      <ThumbsUp size={14} className={comment.isLiked ? "fill-[#f5821f]" : ""} />
                      <span>{comment.likesCount || 0}</span>
                    </button>

                    <button
                      onClick={() =>
                        setActiveReplyId((curr) => (curr === comment.id ? null : comment.id))
                      }
                      className="hover:text-white transition font-medium"
                    >
                      Répondre
                    </button>

                    {isAuthor && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="opacity-0 group-hover/comment:opacity-100 text-red-400/80 hover:text-red-400 transition"
                        title="Supprimer ce commentaire"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Formulaire de réponse imbriqué */}
                  {activeReplyId === comment.id && (
                    <div className="flex gap-2.5 mt-3 pt-2">
                      <input
                        type="text"
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder={`Répondre à ${comment.user?.name}...`}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs text-white placeholder-[#777777] bg-[#1e1e1e] border border-[#333333] focus:border-[#f5821f] outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleReplySubmit(comment.id)
                        }}
                      />
                      <button
                        onClick={() => handleReplySubmit(comment.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white"
                        style={{ backgroundColor: "#f5821f" }}
                      >
                        Répondre
                      </button>
                      <button
                        onClick={() => {
                          setActiveReplyId(null)
                          setReplyInput("")
                        }}
                        className="px-2.5 py-1.5 text-xs text-[#888888] hover:text-white"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {/* Bouton pour afficher les réponses */}
                  {totalReplies > 0 && (
                    <button
                      onClick={() => toggleShowReplies(comment.id)}
                      className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-[#f5821f] hover:underline cursor-pointer"
                    >
                      <CornerDownRight size={13} />
                      <span>
                        {repliesOpen ? "Masquer les réponses" : `Afficher ${totalReplies} réponse${totalReplies > 1 ? "s" : ""}`}
                      </span>
                      {repliesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}

                  {/* Réponses imbriquées */}
                  {repliesOpen && comment.replies && comment.replies.length > 0 && (
                    <div className="space-y-3.5 mt-3 pl-4 border-l-2 border-[#2a2a2a]">
                      {comment.replies.map((reply) => {
                        const isReplyAuthor =
                          currentUserId &&
                          String(reply.userId || reply.user?.id) === String(currentUserId)
                        return (
                          <div key={reply.id} className="flex gap-2.5 group/reply">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={reply.user?.avatar || "/images/avatar.png"}
                              alt={reply.user?.name || "Auteur"}
                              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-[#3a3a3a]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {reply.user?.name}
                                </span>
                                <span className="text-[10px] text-[#777777]">{reply.timeAgo}</span>
                              </div>
                              <p className="text-xs text-[#d0d0d0] mt-0.5 whitespace-pre-line leading-relaxed">
                                {reply.content}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#888888]">
                                <button
                                  onClick={() => onToggleLikeReply(comment.id, reply.id)}
                                  className={`flex items-center gap-1 hover:text-white transition ${
                                    reply.isLiked ? "text-[#f5821f] font-semibold" : ""
                                  }`}
                                >
                                  <ThumbsUp size={12} className={reply.isLiked ? "fill-[#f5821f]" : ""} />
                                  <span>{reply.likesCount || 0}</span>
                                </button>
                                {isReplyAuthor && (
                                  <button
                                    onClick={() => onDeleteReply(reply.id, comment.id)}
                                    className="opacity-0 group-hover/reply:opacity-100 text-red-400/80 hover:text-red-400 transition"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Bouton Charger plus de commentaires */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-[#222222] hover:bg-[#2a2a2a] transition disabled:opacity-50"
              >
                {loadingMore ? "Chargement..." : "Afficher plus de commentaires"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
