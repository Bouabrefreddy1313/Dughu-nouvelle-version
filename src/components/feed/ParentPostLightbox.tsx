"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  PostMediaLightbox,
  type LightboxImageItem,
  type LightboxCommentItem,
} from "@/components/feed/PostMediaLightbox"
import { fetchComments, addComment, likeComment, reportComment } from "@/services/posts/comments.service"
import { addReaction } from "@/services/posts/posts.service"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  username?: string | null
  verified?: boolean
  pageId?: string | null
}

interface ParentPostLightboxProps {
  open: boolean
  onClose: () => void
  parentPost: {
    id: string
    author: Author
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    timeAgo?: string
  }
  currentUser?: {
    id?: string
    name?: string | null
    avatar?: string | null
    dughu?: { userId?: string | number }
  }
}

export function ParentPostLightbox({
  open,
  onClose,
  parentPost,
  currentUser,
}: ParentPostLightboxProps) {
  const [comments, setComments] = React.useState<LightboxCommentItem[]>([])
  const [loadingComments, setLoadingComments] = React.useState(true)
  const [localLikesCount, setLocalLikesCount] = React.useState(0)
  const [localSelectedReaction, setLocalSelectedReaction] = React.useState<number | null>(null)

  // Le post d'origine est figé pendant que la lightbox est ouverte : on garde une
  // référence stable (ref, mise à jour uniquement dans un effet, jamais pendant le
  // rendu) afin que l'effet de chargement dépende de `parentPost.id` et non de
  // l'objet `parentPost` — recréé à chaque rendu du parent du fil — ce qui évite
  // un re-fetch des commentaires et un push d'historique redondant à chaque rendu.
  const parentPostRef = React.useRef(parentPost)
  React.useEffect(() => {
    parentPostRef.current = parentPost
  }, [parentPost])

  // Chargement des commentaires du post d'origine à l'ouverture
  React.useEffect(() => {
    const { id } = parentPostRef.current || {}
    if (!open || !id) return
    let active = true

    // Met à jour l'URL de manière transparente pour simuler la page du post
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`dughu_post_${id}`, JSON.stringify(parentPostRef.current))
      } catch {
        // quota dépassé ou privé
      }
      window.history.pushState({ postId: id }, "", `/post/${encodeURIComponent(id)}`)
    }

    fetchComments({
      postId: id,
      userId: currentUser?.id,
      dughuUserId: currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : undefined,
    })
      .then((data) => {
        if (!active) return
        const loaded = (data.comments || []) as LightboxCommentItem[]
        setComments(loaded)
      })
      .catch(() => {
        if (active) setComments([])
      })
      .finally(() => {
        if (active) setLoadingComments(false)
      })

    return () => {
      active = false
    }
  }, [open, parentPost.id, currentUser?.id, currentUser?.dughu?.userId])

  const handleClose = () => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/post/")) {
      window.history.back()
    }
    onClose()
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
      formData.append("postId", parentPost.id)
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
        postId: parentPost.id,
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
        postId: parentPost.id,
        userId: currentUser.id,
        type: nextReaction ? (REACTION_ID_TO_TYPE[nextReaction] || "like") : "unlike",
        // Le fil (/home) transmet explicitement l'ID Dughu : sans lui, la route
        // /api/reactions peut échouer sur 404 « ID Dughu requis. » →
        // like silencieusement inopérant. On aligne le même contrat fiable.
        dughuUserId: currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : undefined,
      })
    } catch {
      // rollback
      setLocalSelectedReaction(localSelectedReaction)
      setLocalLikesCount((prev) => prev + (nextReaction ? -1 : 1))
      toast.error("Impossible de réagir à cette publication.")
    }
  }

  const images: LightboxImageItem[] = parentPost.image
    ? [{ url: parentPost.image, id: parentPost.id }]
    : []

  return (
    <PostMediaLightbox
      open={open}
      onClose={handleClose}
      images={images}
      video={parentPost.video}
      color={parentPost.color}
      author={parentPost.author}
      timeAgo={parentPost.timeAgo}
      content={parentPost.content || ""}
      postId={parentPost.id}
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
