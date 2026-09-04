"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PostMediaLightbox, type LightboxCommentItem, type LightboxImageItem } from "@/components/feed/PostMediaLightbox"
import { fetchComments, addComment, likeComment, reportComment } from "@/services/posts/comments.service"
import { fetchPosts, addReaction } from "@/services/posts/posts.service"
import { useAuth } from "@/hooks/queries/use-auth"
import { toast } from "sonner"

import { REACTION_ID_TO_TYPE } from "@/lib/constants"

interface SinglePostData {
  id: string
  content?: string | null
  image?: string | null
  images?: LightboxImageItem[]
  video?: { url?: string } | string | null
  color?: string | null
  timeAgo?: string
  timeLabel?: string
  likesCount?: number
  _count?: { likes?: number }
  author?: {
    id: string
    name: string | null
    avatar: string | null
    username?: string | null
    verified?: boolean
    pageId?: string | null
  }
}

export default function SinglePostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = String(params?.id || "")
  const { data: currentUser } = useAuth()

  const [post, setPost] = React.useState<SinglePostData | null>(null)
  const [loadingPost, setLoadingPost] = React.useState(true)
  const [comments, setComments] = React.useState<LightboxCommentItem[]>([])
  const [loadingComments, setLoadingComments] = React.useState(true)
  const [localLikesCount, setLocalLikesCount] = React.useState(0)
  const [localSelectedReaction, setLocalSelectedReaction] = React.useState<number | null>(null)

  // Chargement du post et de ses commentaires
  React.useEffect(() => {
    if (!postId) return
    let active = true

    const load = async () => {
      if (typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem(`dughu_post_${postId}`)
          if (cached) {
            const parsed = JSON.parse(cached) as SinglePostData
            setPost(parsed)
            setLocalLikesCount(parsed._count?.likes || parsed.likesCount || 0)
            setLoadingPost(false)
          }
        } catch {}
      }

      try {
        // Charge le feed pour retrouver le post
        const [postsRes, commentsRes] = await Promise.allSettled([
          fetchPosts({ page: 1 }),
          fetchComments({
            postId,
            userId: currentUser?.id,
            dughuUserId: currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : undefined,
          }),
        ])

        if (!active) return

        if (postsRes.status === "fulfilled" && postsRes.value.posts) {
          const found = (postsRes.value.posts as unknown as SinglePostData[]).find((p) => String(p.id) === postId)
          if (found) {
            setPost(found)
            setLocalLikesCount(found._count?.likes || found.likesCount || 0)
          }
        }

        if (commentsRes.status === "fulfilled" && commentsRes.value.comments) {
          setComments(commentsRes.value.comments as LightboxCommentItem[])
        }
      } finally {
        if (active) {
          setLoadingPost(false)
          setLoadingComments(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [postId, currentUser?.id, currentUser?.dughu?.userId])

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/home")
    }
  }

  const handleAddComment = async (text: string, files?: File[]) => {
    if (!text.trim() && (!files || files.length === 0)) return
    if (!currentUser?.id) {
      toast.error("Connectez-vous pour commenter")
      return
    }

    try {
      const formData = new FormData()
      formData.append("content", text)
      formData.append("postId", postId)
      formData.append("userId", currentUser.id)
      if (currentUser?.dughu?.userId) {
        formData.append("dughuUserId", String(currentUser.dughu.userId))
      }
      if (files?.length) {
        files.forEach((file) => formData.append("files", file))
      }

      await addComment(formData)
      toast.success("Commentaire ajouté !")
      const res = await fetchComments({
        postId,
        userId: currentUser.id,
        dughuUserId: currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : undefined,
      })
      setComments((res.comments || []) as LightboxCommentItem[])
    } catch {
      toast.error("Erreur lors de l'ajout du commentaire")
    }
  }

  const handleLike = async (reactionId?: number) => {
    if (!currentUser?.id) {
      toast.error("Connectez-vous pour réagir")
      return
    }
    const nextReaction = localSelectedReaction === reactionId ? null : (reactionId || 1)
    setLocalSelectedReaction(nextReaction)
    setLocalLikesCount((prev) => prev + (nextReaction ? 1 : -1))

    try {
      await addReaction({
        postId,
        userId: currentUser.id,
        type: nextReaction ? (REACTION_ID_TO_TYPE[nextReaction] || "like") : "unlike",
        // Même contrat fiable que le fil (/home) : sans l'ID Dughu explicite,
        // la route /api/reactions pouvait échouer sur 404 « ID Dughu requis. »
        // et le catch silencieux rendait le like inopérant.

        dughuUserId: currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : undefined,
      })
    } catch {
      // rollback
      setLocalSelectedReaction(localSelectedReaction)
      setLocalLikesCount((prev) => prev + (nextReaction ? -1 : 1))
      toast.error("Impossible de réagir à cette publication.")
    }
  }

  if (loadingPost && !post) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-[#C47830]" />
          <p className="text-sm font-medium text-gray-300">Chargement de la publication...</p>
        </div>
      </div>
    )
  }

  const images: LightboxImageItem[] = post?.image
    ? [{ url: post.image, id: post.id }]
    : post?.images?.length
    ? post.images
    : []

  return (
    <PostMediaLightbox
      open={true}
      onClose={handleClose}
      images={images}
      video={typeof post?.video === "object" && post?.video !== null ? post.video.url : (typeof post?.video === "string" ? post.video : undefined)}
      color={post?.color}
      author={post?.author || { id: "", name: "Utilisateur", avatar: null }}
      timeAgo={post?.timeAgo || post?.timeLabel}
      content={post?.content || ""}
      postId={postId}
      likesCount={localLikesCount}
      selectedReaction={localSelectedReaction}
      onLike={handleLike}
      comments={comments}
      loadingComments={loadingComments}
      currentUser={currentUser ? {
        id: currentUser.id || "",
        name: currentUser.name || null,
        avatar: currentUser.avatar || null,
        dughu: currentUser.dughu,
      } : null}
      onAddComment={handleAddComment}
      onLikeComment={async (commentId, reactionId) => {
        if (!currentUser?.id) return
        try {
          await likeComment(commentId, {
            userId: currentUser.id,
            type: reactionId ? (REACTION_ID_TO_TYPE[reactionId] || "like") : "like",
            isReply: false,
          })
        } catch {
          // ignorer
        }
      }}
      onReportComment={async (commentId) => {
        if (!currentUser?.id) return
        try {
          await reportComment(commentId, {
            userId: currentUser.id,
            reason: "Signalé",
          })
          toast.success("Commentaire signalé")
        } catch {
          toast.error("Erreur lors du signalement")
        }
      }}
    />
  )
}
