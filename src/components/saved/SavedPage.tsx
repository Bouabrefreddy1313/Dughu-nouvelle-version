"use client"

/**
 * Page « Mes sauvegardes » — liste des posts que l'utilisateur a enregistrés
 * sur la plateforme (API GET /get-post-save/{user_id}).
 *
 * - Réutilise le composant PostCard du fil principal (cohérence visuelle) ;
 * - Signet actif sur chaque carte : retrait des sauvegardes via POST /api/store-save
 *   (toggle Dughu) avec mise à jour optimiste de la liste ;
 * - Interactions conservées : like / réactions, commentaires, repost, abonnement ;
 * - États : squelette de chargement, erreur (avec relance), vide (avec
 *   incitation à explorer le fil) et succès.
 */

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Bookmark } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useSavedPosts, useUnsavePost } from "@/hooks/queries/use-saved-posts"
import {
  addReaction,
  createPost,
  followAuthor,
  rePost,
} from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import { timeAgo } from "@/lib/helpers"

const PostCard = dynamic(() => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })), {
  loading: () => (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 animate-pulse mb-4">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="h-40 bg-gray-200 rounded-2xl" />
    </div>
  ),
})

interface Author {
  id: string
  name: string | null
  username: string | null
  avatar: string | null
  verified?: boolean
  isFollowing?: boolean
  [key: string]: unknown
}

interface Post {
  id: string
  author: Author
  content?: string | null
  image?: string | null
  images?: { url: string; id?: string }[]
  video?: string | { url?: string } | null
  audio?: string | null
  color?: string | null
  createdAt?: string
  timeLabel?: string
  reacted?: string | null
  postPrivacy?: 0 | 1 | 2 | 3
  isSaved?: boolean
  isFollowing?: boolean
  reactions?: { type: string; count: number }[]
  parentPost?: {
    id: string
    author: Author
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    timeAgo?: string
  } | null
  _count: {
    likes: number
    comments: number
    reposts: number
    views?: number
  }
  [key: string]: unknown
}

export default function SavedPage() {
  const router = useRouter()

  // Utilisateur connecté (ID Dughu = source de vérité session, même modèle
  // que la page Points et le fil).
  const { data: rawUser, isLoading: authLoading } = useAuth()
  const dughuUserId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || "")

  const user = useMemo(
    () =>
      rawUser
        ? {
            ...rawUser,
            avatar: rawUser.avatar || "/images/avatar.png",
            image: rawUser.image || "/images/avatar.png",
            cover: rawUser.cover || "/images/group/default-cover.jpg",
            _count: rawUser._count || { posts: 0, followers: 0, following: 0 },
          }
        : null,
    [rawUser]
  )

  // Posts sauvegardés (TanStack Query) : source unique de vérité. Les mises à
  // jour optimistes (likes, commentaires, repost, abonnement) écrivent
  // directement dans le cache de la requête via updatePosts.
  const savedQuery = useSavedPosts(dughuUserId || undefined)
  const unsaveMutation = useUnsavePost(dughuUserId || undefined)
  const queryClient = useQueryClient()

  const posts = (savedQuery.data ?? []) as unknown as Post[]

  // Mise à jour du cache « saved-posts » (même clé que le hook useSavedPosts).
  const updatePosts = useCallback(
    (updater: (prev: Post[]) => Post[]) => {
      queryClient.setQueryData<Record<string, unknown>[]>(
        ["saved-posts", dughuUserId || undefined],
        (old) => updater((old ?? []) as unknown as Post[]) as unknown as Record<string, unknown>[]
      )
    },
    [queryClient, dughuUserId]
  )

  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(() => new Set())

  // ── Retrait des sauvegardes (optimiste, géré par le hook) ──────────────────
  const handleUnsave = async (postId: string) => {
    try {
      await unsaveMutation.mutateAsync(postId)
      toast.success("Publication retirée de vos sauvegardes")
    } catch {
      // Rollback déjà effectué par le hook : la carte réapparaît dans la liste.
      toast.error("Impossible de retirer cette publication de vos sauvegardes")
    }
  }

  // ── Like / réactions (même logique que le fil principal) ───────────────────
  const handleReaction = async (postId: string, reactionId?: number) => {
    if (!user) return
    const reactionType = REACTION_ID_TO_TYPE[reactionId || 1] || "like"
    const cache = readMyReactions()
    const previousType = cache[postId] || null

    let newReacted: string | null
    if (!previousType) newReacted = reactionType
    else if (previousType === reactionType) newReacted = null
    else newReacted = reactionType
    const countDelta = newReacted ? (previousType ? 0 : 1) : -1

    const applyToPost = (fn: (p: Post) => Post) =>
      updatePosts((prev) => prev.map((p) => (p.id !== postId ? p : fn(p))))

    // Mise à jour optimiste (compteur en live + emoji sur le bouton)
    applyToPost((p) => ({
      ...p,
      reacted: newReacted,
      _count: { ...p._count, likes: Math.max(0, p._count.likes + countDelta) },
    }))

    const newCache = { ...cache }
    if (newReacted) newCache[postId] = newReacted
    else delete newCache[postId]
    writeMyReactions(newCache)

    try {
      const data = await addReaction({
        postId,
        userId: String(user.id),
        type: reactionType,
        reactionId,
        dughuUserId: user?.dughu?.userId,
      })
      if (data.success) {
        if (typeof data.count === "number") {
          const serverCount = data.count
          applyToPost((p) => ({
            ...p,
            reacted: newReacted,
            _count: { ...p._count, likes: serverCount },
          }))
        }
        if (newReacted) toast.success("Vous avez réagi à ce post")
      } else {
        toast.error(data.message || "Impossible de réagir à cette publication")
        applyToPost((p) => ({
          ...p,
          reacted: previousType,
          _count: { ...p._count, likes: Math.max(0, p._count.likes - countDelta) },
        }))
        writeMyReactions(cache)
      }
    } catch {
      toast.error("Erreur réseau lors de la réaction")
      applyToPost((p) => ({
        ...p,
        reacted: previousType,
        _count: { ...p._count, likes: Math.max(0, p._count.likes - countDelta) },
      }))
      writeMyReactions(cache)
    }
  }

  // ── Commentaires ───────────────────────────────────────────────────────────
  const handleComment = async (postId: string, text: string, files?: File[]) => {
    if (!user) {
      toast.error("Connectez-vous pour commenter")
      return
    }
    try {
      const formData = new FormData()
      formData.append("postId", postId)
      formData.append("userId", String(user.id))
      formData.append("dughuUserId", user?.dughu?.userId || "")
      formData.append("content", text)
      if (files && files.length > 0) files.forEach((f) => formData.append("files", f))
      const data = await addComment(formData)
      if (data.success) {
        updatePosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, comments: (p._count.comments || 0) + 1 } }
              : p
          )
        )
        toast.success("Commentaire publié !")
      } else {
        toast.error(data.message || "Erreur commentaire")
      }
    } catch {
      toast.error("Erreur réseau commentaire")
    }
  }

  // ── Republications ─────────────────────────────────────────────────────────
  const handleRepost = async (postId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour republier")
      return
    }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", String(user.id))
      formData.append("dughuUserId", user?.dughu?.userId || "")
      const data = await createPost(formData)
      if (data.success) {
        updatePosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
              : p
          )
        )
        toast.success("Repost effectué !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur repost")
    }
  }

  const handleRepostWithText = async (postId: string, text: string) => {
    if (!user) {
      toast.error("Connectez-vous pour republier")
      return
    }
    const commentary = text.trim()
    if (!commentary) {
      handleRepost(postId)
      return
    }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", String(user.id))
      formData.append("dughuUserId", user?.dughu?.userId || "")
      formData.append("postText", commentary)
      const data = await rePost(formData)
      if (data.success) {
        updatePosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
              : p
          )
        )
        toast.success("Repost publié !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur repost")
    }
  }

  // ── Abonnement à l'auteur ──────────────────────────────────────────────────
  const handleToggleFollow = useCallback(
    async (author: Author) => {
      if (!user) {
        toast.error("Connectez-vous pour vous abonner")
        return
      }
      const authorId = String(author.id)
      if (!authorId) return
      const previousFollowing = !!author.isFollowing

      setFollowingAuthorIds((previous) => {
        const next = new Set(previous)
        next.add(authorId)
        return next
      })
      // Mise à jour optimiste de l'état d'abonnement
      updatePosts((previous) =>
        previous.map((post) =>
          String(post.author.id) === authorId
            ? {
                ...post,
                isFollowing: !previousFollowing,
                author: { ...post.author, isFollowing: !previousFollowing },
              }
            : post
        )
      )
      try {
        await followAuthor({
          userId: String(user.id),
          targetId: authorId,
          following: !previousFollowing,
        })
        toast.success(!previousFollowing ? "Abonnement effectué" : "Abonnement retiré")
      } catch (error) {
        updatePosts((previous) =>
          previous.map((post) =>
            String(post.author.id) === authorId
              ? {
                  ...post,
                  isFollowing: previousFollowing,
                  author: { ...post.author, isFollowing: previousFollowing },
                }
              : post
          )
        )
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "Impossible de modifier l'abonnement"
        )
      } finally {
        setFollowingAuthorIds((previous) => {
          const next = new Set(previous)
          next.delete(authorId)
          return next
        })
      }
    },
    [user, updatePosts]
  )

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const loading =
    authLoading ||
    !dughuUserId ||
    (dughuUserId ? savedQuery.isLoading || savedQuery.isFetching : false)
  const errorMessage = savedQuery.error
    ? savedQuery.error instanceof Error && savedQuery.error.message
      ? savedQuery.error.message
      : "Une erreur est survenue lors du chargement de vos sauvegardes."
    : null

  return (
    <MainLayout user={rawUser} noRightSidebar active="saves" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-5 flex items-center gap-3 px-1">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F5EFE8] text-[#A35A2A]">
            <Bookmark size={22} aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Mes sauvegardes</h1>
            <p className="mt-0.5 text-sm text-[#65676B]">
              Retrouvez les publications que vous avez enregistrées.
            </p>
          </div>
        </header>

        {/* État de chargement : squelettes de cartes (même forme que le fil) */}
        {loading && posts.length === 0 && (
          <div className="space-y-4" role="status" aria-label="Chargement de vos sauvegardes">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-32 bg-gray-200 rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {/* État d'erreur (avec relance) */}
        {!loading && errorMessage && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-[#65676B]">{errorMessage}</p>
            <Button
              onClick={() => savedQuery.refetch()}
              className="mt-3 bg-[#A35A2A] text-white rounded-full"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* État vide : incitation à explorer le fil */}
        {!loading && !errorMessage && posts.length === 0 && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center">
            <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#E0F7FA] text-[#06B6D4]">
              <Bookmark size={30} aria-hidden />
            </span>
            <h2 className="text-lg font-bold text-[#2D2D2D]">
              Vous n&apos;avez aucun post sauvegardé pour le moment
            </h2>
            <p className="mt-1 text-sm text-[#65676B]">
              Explorez le fil d&apos;actualité et enregistrez les publications qui vous plaisent grâce
              au menu « 3 points » de chaque post.
            </p>
            <Button
              onClick={() => router.push("/home")}
              className="mt-4 bg-[#A35A2A] text-white rounded-full"
            >
              Explorer le fil
            </Button>
          </div>
        )}

        {/* Liste des posts sauvegardés (même carte que le fil principal) */}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            postId={post.id}
            author={post.author}
            currentUser={user}
            timeAgo={post.timeLabel || timeAgo(String(post.createdAt || ""))}
            content={post.content ?? undefined}
            image={post.image || post.images?.[0]?.url || undefined}
            images={(post.images || []).map((img) => ({ url: img.url }))}
            video={(typeof post.video === "string" ? post.video : post.video?.url) || undefined}
            audio={post.audio || undefined}
            color={
              post.color
                ? typeof post.color === "string"
                  ? post.color
                  : JSON.stringify(post.color)
                : null
            }
            likesCount={post._count.likes}
            commentsCount={post._count.comments}
            sharesCount={post._count.reposts}
            viewsCount={Number((post as any).views_count ?? (post as any).viewsCount ?? post._count?.views ?? 0)}
            reacted={post.reacted}
            reactions={post.reactions}
            users={(post as any).reactionUsers}
            parentPost={post.parentPost}
            postPrivacy={post.postPrivacy}
            onLike={(reactionId) => handleReaction(post.id, reactionId)}
            onComment={(text, files) => handleComment(post.id, text, files)}
            onRepost={() => handleRepost(post.id)}
            onRepostWithText={(text) => handleRepostWithText(post.id, text)}
            onShare={() => toast.info("Partage")}
            isFollowing={!!post.author.isFollowing}
            isFollowLoading={followingAuthorIds.has(String(post.author.id))}
            onToggleFollow={() => handleToggleFollow(post.author)}
            onSave={() => handleUnsave(post.id)}
            isSaved={true}
            className="mb-4"
          />
        ))}

        {/* Aucun squelette de pagination : l'API renvoie la liste complète. */}
      </div>
    </MainLayout>
  )
}
