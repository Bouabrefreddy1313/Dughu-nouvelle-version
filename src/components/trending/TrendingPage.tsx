"use client"

/**
 * Page « Tendances » — Publications les plus populaires sur Dughu,
 * classées par score d'interaction (J'aime, commentaires et partages).
 *
 * - Réutilise le composant PostCard pour une fidélité visuelle et fonctionnelle totale ;
 * - Calcule le score global d'engagement : likes + commentaires + partages ;
 * - Filtres rapides : "Toutes les interactions", "Plus aimées", "Plus commentées", "Plus partagées" ;
 * - Badges de classement élégants (Top 1, 2, 3...) avec détail des interactions ;
 * - Interactions complètes : likes / multi-réactions, commentaires, republications, favoris ;
 * - Chargement avec squelettes et gestion d'état vide.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  Flame,
  TrendingUp,
  Heart,
  MessageSquare,
  Share2,
  RefreshCcw,
  Sparkles,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import MainLayout from "@/components/layout/MainLayout"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  fetchPosts,
  addReaction,
  createPost,
  rePost,
  deletePost,
  hidePost,
  blockUser,
  storeSave,
  boostPost,
  followAuthor,
} from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { notifyPostReaction, notifyPostComment } from "@/services/notifications/notifications.service"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import { timeAgo } from "@/lib/helpers"
import type { ReactionUserItem } from "@/types/posts/post.types"

const PostCard = dynamic(
  () => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })),
  {
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
  }
)

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
  viewsCount?: number
  views_count?: number
  postPrivacy?: 0 | 1 | 2 | 3
  isSaved?: boolean
  isFollowing?: boolean
  reactions?: { type: string; count: number }[]
  reactionUsers?: ReactionUserItem[]
  parentPost?: {
    id: string
    author: Author
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    createdAt?: string
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

type TrendingFilter = "all" | "likes" | "comments" | "shares"

export default function TrendingPage() {
  const router = useRouter()
  const { data: rawUser } = useAuth()

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

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<TrendingFilter>("all")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set())
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(new Set())

  // Charger et agréger les posts pour extraire les tendances
  const loadTrendingPosts = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const userId = user?.id || ""
        const dughuUserId = user?.dughu?.userId || ""

        // On charge les premières pages du fil pour disposer d'un échantillon significatif
        const [page1, page2] = await Promise.allSettled([
          fetchPosts({ page: 1, filter: "all", userId, dughuUserId }),
          fetchPosts({ page: 2, filter: "all", userId, dughuUserId }),
        ])

        const collected: any[] = []

        if (page1.status === "fulfilled" && page1.value?.success && Array.isArray(page1.value.posts)) {
          collected.push(...page1.value.posts)
        }
        if (page2.status === "fulfilled" && page2.value?.success && Array.isArray(page2.value.posts)) {
          collected.push(...page2.value.posts)
        }

        const reactionsCache = readMyReactions()

        // Déduplication et normalisation
        const seen = new Set<string>()
        const normalized: Post[] = []

        for (const p of collected) {
          const id = String(p.id)
          if (seen.has(id)) continue
          seen.add(id)

          normalized.push({
            ...p,
            id,
            timeLabel: timeAgo(p.createdAt || new Date().toISOString()),
            reacted: reactionsCache[id] || p.reacted || null,
            _count: {
              likes: Number(p._count?.likes) || 0,
              comments: Number(p._count?.comments) || 0,
              reposts: Number(p._count?.reposts) || 0,
              views: Number(p.views_count ?? p.viewsCount ?? p._count?.views ?? 0),
            },
            views_count: Number(p.views_count ?? p.viewsCount ?? p._count?.views ?? 0),
            viewsCount: Number(p.views_count ?? p.viewsCount ?? p._count?.views ?? 0),
            parentPost: p.parentPost
              ? {
                  ...p.parentPost,
                  timeAgo: timeAgo(p.parentPost?.createdAt || new Date().toISOString()),
                }
              : null,
          })
        }

        setPosts(normalized)
      } catch (err) {
        console.error("Erreur chargement tendances:", err)
        toast.error("Impossible de charger les tendances pour le moment.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user?.id, user?.dughu?.userId]
  )

  useEffect(() => {
    loadTrendingPosts()
  }, [loadTrendingPosts])

  // Tri selon le filtre d'interaction sélectionné
  const sortedPosts = useMemo(() => {
    const list = [...posts]

    return list.sort((a, b) => {
      const aLikes = a._count?.likes || 0
      const bLikes = b._count?.likes || 0
      const aComments = a._count?.comments || 0
      const bComments = b._count?.comments || 0
      const aShares = a._count?.reposts || 0
      const bShares = b._count?.reposts || 0

      if (activeFilter === "likes") {
        return bLikes - aLikes
      }
      if (activeFilter === "comments") {
        return bComments - aComments
      }
      if (activeFilter === "shares") {
        return bShares - aShares
      }

      // Par défaut : total des interactions
      const aTotal = aLikes + aComments + aShares
      const bTotal = bLikes + bComments + bShares
      return bTotal - aTotal
    })
  }, [posts, activeFilter])

  // Calcul du total des interactions pour une publication
  const getInteractionScore = (post: Post) => {
    const likes = post._count?.likes || 0
    const comments = post._count?.comments || 0
    const shares = post._count?.reposts || 0
    return {
      total: likes + comments + shares,
      likes,
      comments,
      shares,
    }
  }

  // ── Like / Réactions ────────────────────────────────────────────────────────
  const handleReaction = async (postId: string, reactionId?: number) => {
    if (!user) {
      toast.error("Connectez-vous pour réagir")
      return
    }

    const reactionType = REACTION_ID_TO_TYPE[reactionId || 1] || "like"
    const cache = readMyReactions()
    const previousType = cache[postId] || null

    let newReacted: string | null
    if (!previousType) newReacted = reactionType
    else if (previousType === reactionType) newReacted = null
    else newReacted = reactionType

    const countDelta = newReacted ? (previousType ? 0 : 1) : -1

    const updateReactionsList = (
      existing: { type: string; count: number }[] | undefined,
      prev: string | null,
      next: string | null
    ) => {
      const map: Record<string, number> = {}
      for (const item of existing || []) {
        if (item?.type) map[item.type] = Number(item.count) || 0
      }
      if (prev && map[prev]) {
        map[prev] = Math.max(0, map[prev] - 1)
        if (map[prev] === 0) delete map[prev]
      }
      if (next) {
        map[next] = (map[next] || 0) + 1
      }
      return Object.entries(map).map(([type, count]) => ({ type, count }))
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        return {
          ...p,
          reacted: newReacted,
          reactions: updateReactionsList(p.reactions, previousType, newReacted),
          _count: {
            ...p._count,
            likes: Math.max(0, p._count.likes + countDelta),
          },
        }
      })
    )

    const newCache = { ...cache }
    if (newReacted) newCache[postId] = newReacted
    else delete newCache[postId]
    writeMyReactions(newCache)

    try {
      const data = await addReaction({
        postId,
        userId: String(user.id),
        type: reactionType,
        dughuUserId: user?.dughu?.userId,
      })
      if (data.success) {
        if (typeof data.count === "number") {
          const finalCount = data.count
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    _count: { ...p._count, likes: finalCount },
                  }
                : p
            )
          )
        }
        if (newReacted) {
          toast.success(`Réaction ${newReacted} ajoutée`)
          const targetPost = posts.find((p) => p.id === postId)
          if (targetPost?.author?.id && String(targetPost.author.id) !== String(user.id)) {
            void notifyPostReaction({
              authorUserId: targetPost.author.id,
              senderName: user.name || "Un utilisateur",
              postId,
            })
          }
        }
      } else {
        toast.error(data.message || "Impossible de réagir")
        // Rollback
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  reacted: previousType,
                  _count: { ...p._count, likes: Math.max(0, p._count.likes - countDelta) },
                }
              : p
          )
        )
        writeMyReactions(cache)
      }
    } catch {
      toast.error("Erreur réseau lors de la réaction")
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reacted: previousType,
                _count: { ...p._count, likes: Math.max(0, p._count.likes - countDelta) },
              }
            : p
        )
      )
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
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, comments: (p._count.comments || 0) + 1 } }
              : p
          )
        )
        toast.success("Commentaire publié !")
        const targetPost = posts.find((p) => p.id === postId)
        if (targetPost?.author?.id && String(targetPost.author.id) !== String(user.id)) {
          void notifyPostComment({
            authorUserId: targetPost.author.id,
            senderName: user.name || "Un utilisateur",
            postId,
          })
        }
      } else {
        toast.error(data.message || "Erreur commentaire")
      }
    } catch {
      toast.error("Erreur réseau commentaire")
    }
  }

  // ── Repost direct ──────────────────────────────────────────────────────────
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
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
              : p
          )
        )
        toast.success("Publication republiée avec succès !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur réseau lors de la republication")
    }
  }

  // ── Repost avec texte ──────────────────────────────────────────────────────
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
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
              : p
          )
        )
        toast.success("Repost publié avec votre commentaire !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur réseau lors de la republication")
    }
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  const handleSave = async (postId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour sauvegarder")
      return
    }
    const target = posts.find((p) => p.id === postId)
    const nextSaved = !target?.isSaved

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved: nextSaved } : p))
    )

    try {
      const res = await storeSave({
        postId,
        userId: String(user.id),
        dughuUserId: user?.dughu?.userId,
      })
      if (res.success) {
        toast.success(nextSaved ? "Ajouté à vos sauvegardes" : "Retiré de vos sauvegardes")
      } else {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isSaved: !nextSaved } : p))
        )
        toast.error("Impossible de modifier la sauvegarde")
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: !nextSaved } : p))
      )
      toast.error("Erreur réseau")
    }
  }

  // ── Suppression ────────────────────────────────────────────────────────────
  const handleDelete = async (postId: string) => {
    try {
      const ok = await deletePost(postId)
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Publication supprimée")
      } else {
        toast.error("Impossible de supprimer cette publication")
      }
    } catch {
      toast.error("Erreur lors de la suppression")
    }
    setDeleteTarget(null)
  }

  // ── Masquer ────────────────────────────────────────────────────────────────
  const handleHide = async (postId: string) => {
    try {
      const ok = await hidePost({
        postId,
        userId: user?.id,
        dughuUserId: user?.dughu?.userId,
      })
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Publication masquée de vos tendances")
      }
    } catch {
      toast.error("Erreur lors du masquage")
    }
  }

  // ── Bloquer ────────────────────────────────────────────────────────────────
  const handleBlock = async (authorId?: string) => {
    if (!authorId || !user) return
    const isCurrentlyBlocked = blockedAuthors.has(String(authorId))
    try {
      const res = await blockUser({
        authorId: String(authorId),
        userId: user.id,
        dughuUserId: user?.dughu?.userId,
      })
      if (res.success) {
        setBlockedAuthors((prev) => {
          const next = new Set(prev)
          if (isCurrentlyBlocked) next.delete(String(authorId))
          else next.add(String(authorId))
          return next
        })
        toast.success(isCurrentlyBlocked ? "Utilisateur débloqué" : "Utilisateur bloqué")
      }
    } catch {
      toast.error("Erreur lors de l'opération de blocage")
    }
  }

  // ── Booster ────────────────────────────────────────────────────────────────
  const handleBoost = async (postId: string) => {
    if (!user) return
    try {
      const res = await boostPost({ postId, userId: user.id })
      if (res.success) toast.success("Publication boostée !")
      else toast.error("Impossible de booster cette publication")
    } catch {
      toast.error("Erreur réseau boost")
    }
  }

  // ── Suivre / Ne plus suivre ────────────────────────────────────────────────
  const handleToggleFollow = async (author: Author) => {
    if (!user) {
      toast.error("Connectez-vous pour vous abonner")
      return
    }
    const authorId = String(author.id)
    const isCurrentlyFollowing = !!author.isFollowing
    const nextState = !isCurrentlyFollowing

    setFollowingAuthorIds((prev) => {
      const next = new Set(prev)
      next.add(authorId)
      return next
    })

    setPosts((prev) =>
      prev.map((p) =>
        String(p.author.id) === authorId
          ? { ...p, author: { ...p.author, isFollowing: nextState } }
          : p
      )
    )

    try {
      const res = await followAuthor({
        userId: user.id,
        targetId: authorId,
        following: nextState,
      })
      if (res.success) {
        toast.success(nextState ? `Vous suivez désormais ${author.name}` : `Désabonné de ${author.name}`)
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            String(p.author.id) === authorId
              ? { ...p, author: { ...p.author, isFollowing: isCurrentlyFollowing } }
              : p
          )
        )
        toast.error("Action impossible pour le moment")
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          String(p.author.id) === authorId
            ? { ...p, author: { ...p.author, isFollowing: isCurrentlyFollowing } }
            : p
        )
      )
      toast.error("Erreur réseau")
    } finally {
      setFollowingAuthorIds((prev) => {
        const next = new Set(prev)
        next.delete(authorId)
        return next
      })
    }
  }

  return (
    <MainLayout user={user} active="tendances">
      <div className="w-full max-w-[680px] mx-auto pb-16">
        {/* ── EN-TÊTE DE LA PAGE TENDANCES ── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 mb-4 shadow-sm border border-gray-100/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5C33B] via-[#E5A817] to-[#D68B0A] flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Flame className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] tracking-tight">
                    Tendances
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    En direct
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#65676B] mt-1">
                  Les publications avec le plus d&apos;interactions (J&apos;aime, commentaires et partages)
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadTrendingPosts(true)}
              disabled={loading || refreshing}
              className="rounded-full hover:bg-amber-50 hover:text-amber-700 transition shrink-0"
              title="Rafraîchir les tendances"
            >
              <RefreshCcw
                size={18}
                className={refreshing ? "animate-spin text-amber-600" : "text-gray-500"}
              />
            </Button>
          </div>

          {/* Filtres de classement */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-gray-100 no-scrollbar">
            <button
              onClick={() => setActiveFilter("all")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-[#1F1F1F] text-white shadow-sm"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              <Flame size={14} className={activeFilter === "all" ? "text-amber-400" : "text-gray-500"} />
              Toutes les interactions
            </button>

            <button
              onClick={() => setActiveFilter("likes")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                activeFilter === "likes"
                  ? "bg-[#1F1F1F] text-white shadow-sm"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              <Heart size={14} className={activeFilter === "likes" ? "text-rose-400" : "text-gray-500"} />
              Plus aimées
            </button>

            <button
              onClick={() => setActiveFilter("comments")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                activeFilter === "comments"
                  ? "bg-[#1F1F1F] text-white shadow-sm"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              <MessageSquare size={14} className={activeFilter === "comments" ? "text-blue-400" : "text-gray-500"} />
              Plus commentées
            </button>

            <button
              onClick={() => setActiveFilter("shares")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                activeFilter === "shares"
                  ? "bg-[#1F1F1F] text-white shadow-sm"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              <Share2 size={14} className={activeFilter === "shares" ? "text-emerald-400" : "text-gray-500"} />
              Plus partagées
            </button>
          </div>
        </div>

        {/* ── LISTE DES POSTS TENDANCES ── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gray-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="w-16 h-6 rounded-full bg-amber-100/60" />
                </div>
                <div className="h-28 bg-gray-100 rounded-2xl mb-3" />
                <div className="h-8 bg-gray-50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4">
              <TrendingUp size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#1F1F1F] mb-1">
              Aucune tendance pour le moment
            </h3>
            <p className="text-sm text-[#65676B] max-w-sm mx-auto mb-5">
              Dès que des publications reçoivent des réactions, des commentaires ou des partages, elles apparaîtront ici.
            </p>
            <Button
              onClick={() => router.push("/home")}
              className="bg-[#F5C33B] hover:bg-[#E5A817] text-[#422900] font-semibold rounded-2xl px-6"
            >
              Explorer le fil d&apos;actualité
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPosts.map((post, index) => {
              const rank = index + 1
              const score = getInteractionScore(post)
              const postVideo =
                typeof post.video === "string"
                  ? post.video
                  : post.video?.url || undefined

              return (
                <div key={`trend-item-${post.id}`} className="relative group">
                  {/* Badge de classement tendance au-dessus du post */}
                  <div className="mb-2 px-3 sm:px-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {rank === 1 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm shadow-amber-500/30 text-[13px]">
                          <Flame size={14} className="animate-bounce" />
                          #1 Tendance Dughu
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-sm text-[12px]">
                          <Trophy size={13} className="text-gray-300" />
                          #2 Tendance
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-gradient-to-r from-amber-700 to-amber-800 text-white shadow-sm text-[12px]">
                          <Trophy size={13} className="text-amber-200" />
                          #3 Tendance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700 text-[11px]">
                          #{rank} en tendance
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[#65676B] font-medium text-[11px] sm:text-xs">
                      <span className="font-semibold text-gray-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/40">
                        {score.total} interaction{score.total > 1 ? "s" : ""}
                      </span>
                      <span className="hidden sm:inline">
                        (❤️ {score.likes} · 💬 {score.comments} · 🔁 {score.shares})
                      </span>
                    </div>
                  </div>

                  {/* Carte standard du Post */}
                  <PostCard
                    postId={post.id}
                    author={post.author}
                    currentUser={user}
                    timeAgo={post.timeLabel || timeAgo(post.createdAt || new Date().toISOString())}
                    content={post.content || undefined}
                    image={post.image || post.images?.[0]?.url || undefined}
                    images={(post.images || []).map((img) => ({ url: img.url }))}
                    video={postVideo}
                    audio={post.audio || undefined}
                    color={post.color || undefined}
                    likesCount={post._count.likes}
                    commentsCount={post._count.comments}
                    sharesCount={post._count.reposts}
                    viewsCount={Number(post.viewsCount ?? post.views_count ?? post._count?.views ?? 0)}
                    reacted={post.reacted}
                    reactions={post.reactions}
                    users={post.reactionUsers}
                    parentPost={post.parentPost}
                    postPrivacy={post.postPrivacy}
                    onLike={(reactionId) => handleReaction(post.id, reactionId)}
                    onComment={(text, files) => handleComment(post.id, text, files)}
                    onRepost={() => handleRepost(post.id)}
                    onRepostWithText={(text) => handleRepostWithText(post.id, text)}
                    onShare={() => toast.info("Lien de partage généré")}
                    isFollowing={!!post.author.isFollowing}
                    isFollowLoading={followingAuthorIds.has(String(post.author.id))}
                    onToggleFollow={() => handleToggleFollow(post.author)}
                    onDelete={() => setDeleteTarget(post.id)}
                    canDelete={!!user && String(post.author?.id) === String(user?.dughu?.userId)}
                    onBoost={() => handleBoost(post.id)}
                    canBoost={!!user && String(post.author?.id) === String(user?.dughu?.userId)}
                    onSave={() => handleSave(post.id)}
                    onHide={() => handleHide(post.id)}
                    onBlock={() => handleBlock(String(post.author?.id || ""))}
                    isBlocked={blockedAuthors.has(String(post.author?.id))}
                    isSaved={post.isSaved}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* ── MODALE DE CONFIRMATION DE SUPPRESSION ── */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="Supprimer la publication ?"
          description="Cette action est irréversible. Votre publication sera retirée de Dughu et de la liste des tendances."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          onConfirm={() => {
            if (deleteTarget) return handleDelete(deleteTarget)
          }}
        />
      </div>
    </MainLayout>
  )
}
