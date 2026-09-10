"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  BriefcaseBusiness,
  RefreshCw,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import {
  fetchNetworkPosts,
  createPost,
  rePost,
  addReaction,
  deletePost,
  hidePost,
  blockUser,
  storeSave,
  boostPost,
  followAuthor,
  isAbortError,
} from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { notifyPostReaction, notifyPostComment } from "@/services/notifications/notifications.service"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import type { ReactionUserItem } from "@/types/posts/post.types"
import { timeAgo } from "@/lib/helpers"
import { useAuth } from "@/hooks/queries/use-auth"
import MainLayout from "@/components/layout/MainLayout"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { usePagesList } from "@/hooks/pages/use-pages"
import { likePage } from "@/services/pages/pages.service"

const PostComposer = dynamic(
  () => import("@/components/composer/PostComposer").then((mod) => ({ default: mod.PostComposer })),
  { loading: () => null }
)

const PostCard = dynamic(
  () => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })),
  {
    loading: () => (
      <div className="bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-white/10 sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 dark:sm:border-white/10 animate-pulse p-4 mb-4">
        <div className="flex gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    ),
  }
)

const AkwaplayPostCard = dynamic(
  () => import("@/components/feed/AkwaplayPostCard").then((mod) => ({ default: mod.AkwaplayPostCard })),
  { loading: () => null }
)

interface Author {
  id: string
  name: string | null
  username: string | null
  avatar: string | null
  cover?: string | null
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
  viewsCount?: number
  views_count?: number
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
  isAkwaplayVideo?: boolean
  akwaplayData?: {
    videoId: string
    title: string
    description: string
    thumbnail: string
    duration: string
    likesCount: number
    viewsCount: number
  }
  _count: {
    likes: number
    comments: number
    reposts: number
    views?: number
  }
  [key: string]: unknown
}

function deduplicatePosts(postsList: Post[]): Post[] {
  const seen = new Set<string>()
  return postsList.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

export default function ReseautesPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set())
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(new Set())
  const [pageLikedMap, setPageLikedMap] = useState<Record<string, boolean>>({})
  const [pageLikeLoadingMap, setPageLikeLoadingMap] = useState<Record<string, boolean>>({})

  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)
  const feedReqRef = useRef(0)

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

  const adminPagesQuery = usePagesList("administered", { userId: user?.dughu?.userId })
  const myPagesQuery = usePagesList("mine", { userId: user?.dughu?.userId })

  const composerSpaces = useMemo(() => {
    const list: Array<{ id: string; name: string; avatar?: string | null }> = []
    const seen = new Set<string>()
    for (const p of [...(adminPagesQuery.data?.pages || []), ...(myPagesQuery.data?.pages || [])]) {
      if (p?.pageId && !seen.has(String(p.pageId))) {
        seen.add(String(p.pageId))
        list.push({
          id: String(p.pageId),
          name: p.pageTitle || p.pageName,
          avatar: p.avatar || null,
        })
      }
    }
    return list
  }, [adminPagesQuery.data?.pages, myPagesQuery.data?.pages])

  const dughuUserId = user?.dughu?.userId || user?.id || "31262"

  const loadReseautesPosts = useCallback(
    async (page: number, reset = false) => {
      const reqId = ++feedReqRef.current
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)

      try {
        // Endpoint dédié /api/getNetworkposts/[userId]?page=X via le service frontend
        const data = await fetchNetworkPosts(dughuUserId, page, { signal: controller.signal })

        if (reqId !== feedReqRef.current) return

        if (data.success) {
          const reactionsCache = readMyReactions()
          const rawItems = (data.posts || []) as any[]
          const mapped: Post[] = rawItems.map((p: any) => ({
            ...p,
            timeLabel: timeAgo(p.createdAt),
            reacted: reactionsCache[p.id] || p.reacted || null,
            views_count: Number(p.views_count ?? p.viewsCount ?? p._count?.views ?? 0),
            viewsCount: Number(p.views_count ?? p.viewsCount ?? p._count?.views ?? 0),
            _count: {
              comments: p._count?.comments || 0,
              likes: p._count?.likes || 0,
              reposts: p._count?.reposts || 0,
              views: Number(p.views_count ?? p.viewsCount ?? p._count?.views ?? 0),
            },
            parentPost: p.parentPost
              ? { ...p.parentPost, timeAgo: timeAgo(p.parentPost?.createdAt) }
              : null,
          }))

          if (reset || page === 1) {
            setPosts(deduplicatePosts(mapped))
          } else {
            setPosts((prev) => deduplicatePosts([...prev, ...mapped]))
          }

          setHasMore(data.hasMore !== false && rawItems.length > 0)
        } else {
          if (page > 1) setHasMore(false)
          toast.error((data as any).message || "Erreur lors du chargement des publications.")
        }
      } catch (err) {
        if (page > 1) setHasMore(false)
        console.error("loadReseautesPosts error:", err)
        toast.error(
          isAbortError(err)
            ? "Le chargement a pris trop de temps. Veuillez réessayer."
            : "Impossible de charger les publications de votre réseau."
        )
      } finally {
        clearTimeout(timer)
        if (reqId === feedReqRef.current) {
          setLoading(false)
          setLoadingMore(false)
          loadingMoreRef.current = false
        }
      }
    },
    [user]
  )

  useEffect(() => {
    setPageNum(1)
    void loadReseautesPosts(1, true)
  }, [loadReseautesPosts])

  // Défilement infini
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || loading || loadingMore || loadingMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !loading && !loadingMoreRef.current) {
            loadingMoreRef.current = true
            const next = pageNum + 1
            setPageNum(next)
            void loadReseautesPosts(next, false)
          }
        }
      },
      { rootMargin: "300px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, pageNum, loadReseautesPosts])

  const handleTogglePageLike = async (targetPageId: string, initialLiked: boolean) => {
    if (!targetPageId || pageLikeLoadingMap[targetPageId]) return
    const currentLiked = pageLikedMap[targetPageId] !== undefined ? pageLikedMap[targetPageId] : initialLiked
    const nextLiked = !currentLiked
    setPageLikeLoadingMap((prev) => ({ ...prev, [targetPageId]: true }))
    setPageLikedMap((prev) => ({ ...prev, [targetPageId]: nextLiked }))

    try {
      const res = await likePage(targetPageId, user?.dughu?.userId)
      if (res.success === false && res.isLike === undefined) {
        toast.error(res.message || "Impossible de liker cet espace.")
        setPageLikedMap((prev) => ({ ...prev, [targetPageId]: currentLiked }))
      } else {
        const confirmedLiked = res.isLike !== undefined ? res.isLike : nextLiked
        setPageLikedMap((prev) => ({ ...prev, [targetPageId]: confirmedLiked }))
        toast.success(confirmedLiked ? "Espace aimé ! ❤️" : "Like retiré.")
      }
    } catch {
      setPageLikedMap((prev) => ({ ...prev, [targetPageId]: currentLiked }))
      toast.error("Impossible de liker cet espace.")
    } finally {
      setPageLikeLoadingMap((prev) => ({ ...prev, [targetPageId]: false }))
    }
  }

  const handleToggleFollow = useCallback(
    async (author: Author) => {
      if (!user?.id || !author.id) return
      const authorId = String(author.id)
      const previousFollowing = !!author.isFollowing
      const nextFollowing = !previousFollowing

      setFollowingAuthorIds((prev) => new Set(prev).add(authorId))
      setPosts((prev) =>
        prev.map((post) =>
          String(post.author.id) === authorId
            ? {
                ...post,
                isFollowing: nextFollowing,
                author: { ...post.author, isFollowing: nextFollowing },
              }
            : post
        )
      )

      try {
        const data = await followAuthor({
          userId: user.id,
          targetId: authorId,
          following: nextFollowing,
        })
        const confirmedFollowing = Boolean(data.following)
        setPosts((prev) =>
          prev.map((post) =>
            String(post.author.id) === authorId
              ? {
                  ...post,
                  isFollowing: confirmedFollowing,
                  author: { ...post.author, isFollowing: confirmedFollowing },
                }
              : post
          )
        )
      } catch (error) {
        setPosts((prev) =>
          prev.map((post) =>
            String(post.author.id) === authorId
              ? {
                  ...post,
                  isFollowing: previousFollowing,
                  author: { ...post.author, isFollowing: previousFollowing },
                }
              : post
          )
        )
        toast.error(error instanceof Error ? error.message : "Impossible de modifier l'abonnement")
      } finally {
        setFollowingAuthorIds((prev) => {
          const next = new Set(prev)
          next.delete(authorId)
          return next
        })
      }
    },
    [user?.id]
  )

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

    const updateReactionsList = (
      existingReactions: { type: string; count: number }[] | undefined,
      prev: string | null,
      next: string | null
    ): { type: string; count: number }[] => {
      const map: Record<string, number> = {}
      ;(existingReactions || []).forEach((r) => {
        if (r.type && r.count > 0) map[r.type] = r.count
      })
      if (prev && map[prev]) {
        map[prev] = Math.max(0, map[prev] - 1)
        if (map[prev] === 0) delete map[prev]
      }
      if (next) {
        map[next] = (map[next] || 0) + 1
      }
      return Object.entries(map).map(([type, count]) => ({ type, count }))
    }

    const updateReactionUsersList = (
      existing: ReactionUserItem[] | undefined,
      prev: string | null,
      next: string | null
    ): ReactionUserItem[] => {
      const myId = String(user.id)
      const list = (existing || []).filter((u) => String(u.id) !== myId)
      if (!next) return list
      list.push({
        id: myId,
        name: user.name || "Vous",
        username: user.username || null,
        avatar: user.avatar || null,
        reactionType: next,
      })
      return list
    }

    const applyToPost = (fn: (p: Post) => Post) =>
      setPosts((prev) => prev.map((p) => (p.id !== postId ? p : fn(p))))

    applyToPost((p) => ({
      ...p,
      reacted: newReacted,
      reactions: updateReactionsList(p.reactions, previousType, newReacted),
      reactionUsers: updateReactionUsersList(p.reactionUsers, previousType, newReacted),
      _count: {
        ...p._count,
        likes: Math.max(0, p._count.likes + countDelta),
      },
    }))

    const newCache = { ...cache }
    if (newReacted) newCache[postId] = newReacted
    else delete newCache[postId]
    writeMyReactions(newCache)

    try {
      const data = await addReaction({
        postId,
        userId: user.id,
        type: reactionType,
        reactionId,
        dughuUserId: user?.dughu?.userId,
      })
      if (data.success) {
        if (typeof data.count === "number") {
          applyToPost((p) => ({
            ...p,
            _count: { ...p._count, likes: data.count ?? p._count?.likes ?? 0 },
          }))
        }
        if (newReacted) {
          toast.success("Vous avez réagi à ce post")
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
        toast.error(data.message || "Impossible de réagir à cette publication")
        applyToPost((p) => ({
          ...p,
          reacted: previousType,
          reactions: updateReactionsList(p.reactions, newReacted, previousType),
          reactionUsers: updateReactionUsersList(p.reactionUsers, newReacted, previousType),
          _count: {
            ...p._count,
            likes: Math.max(0, p._count.likes - countDelta),
          },
        }))
        writeMyReactions(cache)
      }
    } catch {
      toast.error("Erreur réseau lors de la réaction")
      applyToPost((p) => ({
        ...p,
        reacted: previousType,
        reactions: updateReactionsList(p.reactions, newReacted, previousType),
        reactionUsers: updateReactionUsersList(p.reactionUsers, newReacted, previousType),
        _count: {
          ...p._count,
          likes: Math.max(0, p._count.likes - countDelta),
        },
      }))
      writeMyReactions(cache)
    }
  }

  const handleComment = async (postId: string, text: string, files?: File[]) => {
    if (!user) {
      toast.error("Connectez-vous pour commenter")
      return
    }
    try {
      const formData = new FormData()
      formData.append("postId", postId)
      formData.append("userId", user.id)
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
        toast.error(data.message || "Erreur lors de l'ajout du commentaire")
      }
    } catch {
      toast.error("Erreur réseau lors de l'envoi du commentaire")
    }
  }

  const handleRepost = async (postId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour republier")
      return
    }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", user.id)
      formData.append("dughuUserId", dughuUserId)
      const res = await rePost(formData)
      if (res.success) {
        toast.success("Publication republiée avec succès !")
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
              : p
          )
        )
      } else {
        toast.error(res.message || "Impossible de republier")
      }
    } catch {
      toast.error("Erreur lors de la republication")
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const ok = await deletePost(postId)
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Publication supprimée.")
      } else {
        toast.error("Erreur lors de la suppression.")
      }
    } catch {
      toast.error("Impossible de supprimer la publication.")
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSave = async (postId: string) => {
    try {
      const res = await storeSave({ postId, userId: user?.id, dughuUserId })
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
        )
        toast.success(res.isSaved ? "Ajouté à vos favoris !" : "Retiré de vos favoris.")
      } else {
        toast.error(res.message || "Erreur sauvegarde")
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde")
    }
  }

  const handleHide = async (postId: string) => {
    try {
      const ok = await hidePost({ postId, userId: user?.id, dughuUserId })
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.info("Publication masquée de votre fil.")
      } else {
        toast.error("Erreur lors du masquage")
      }
    } catch {
      toast.error("Impossible de masquer la publication")
    }
  }

  const handleBlock = async (authorId?: string) => {
    if (!authorId) return
    const id = String(authorId)
    const isCurrentlyBlocked = blockedAuthors.has(id)
    try {
      const res = await blockUser({ authorId: id, userId: user?.id, dughuUserId })
      if (res.success) {
        setBlockedAuthors((prev) => {
          const next = new Set(prev)
          if (isCurrentlyBlocked) next.delete(id)
          else next.add(id)
          return next
        })
        if (!isCurrentlyBlocked) {
          setPosts((prev) => prev.filter((p) => String(p.author?.id) !== id))
          toast.success("Utilisateur bloqué.")
        } else {
          toast.success("Utilisateur débloqué.")
        }
      } else {
        toast.error(res.message || "Erreur lors du blocage")
      }
    } catch {
      toast.error("Action impossible pour le moment")
    }
  }

  const handleBoost = async (postId: string) => {
    try {
      const res = await boostPost({ postId, userId: user?.id, boostDays: 1 })
      if (res.success) {
        toast.success("Publication boostée avec succès !")
      } else {
        toast.error(res.message || "Impossible de booster cette publication.")
      }
    } catch {
      toast.error("Erreur lors du boost")
    }
  }

  const handlePostSubmit = async (data: {
    content: string
    color?: any
    images?: File[]
    videos?: File[]
    audios?: File[]
    privacy?: number
    pageId?: string
  }) => {
    const formData = new FormData()
    formData.append("content", data.content)
    if (user?.id) formData.append("userId", user.id)
    formData.append("dughuUserId", dughuUserId)
    const privacy = data.privacy ?? 2
    formData.append("privacy", String(privacy))
    if (data.pageId) {
      formData.append("page_id", data.pageId)
      formData.append("pageId", data.pageId)
    }
    if (data.color) {
      formData.append("color", JSON.stringify(data.color))
      if (data.color.id != null) formData.append("color_id", String(data.color.id))
      if (data.color.color_1) formData.append("color_1", data.color.color_1)
      if (data.color.color_2) formData.append("color_2", data.color.color_2)
      if (data.color.text) formData.append("text_color", data.color.text)
    }
    if (data.images) data.images.forEach((img) => formData.append("images", img))
    if (data.videos) data.videos.forEach((vid) => formData.append("videos", vid))
    if (data.audios) data.audios.forEach((aud) => formData.append("audios", aud))

    try {
      const res = await createPost(formData)
      if (res.success && res.post) {
        setPosts((prev) => [
          {
            ...res.post,
            timeLabel: "À l'instant",
            reacted: null,
            _count: { likes: 0, comments: 0, reposts: 0, views: 0 },
          } as Post,
          ...prev,
        ])
        toast.success("Publication créée avec succès !")
      } else {
        toast.error(res.message || "Erreur lors de la publication.")
      }
    } catch {
      toast.error("Impossible de publier votre message.")
    }
  }

  return (
    <MainLayout user={rawUser} active="reseautes">
      {/* Create Post — compositeur de publication */}
      <div className="px-3 sm:px-0 mb-4">
        <PostComposer
          user={user}
          spaces={composerSpaces}
          onSubmit={handlePostSubmit}
          className="mb-4"
        />
      </div>

      {/* ═════ LISTE DES POSTS RÉSEAUTÉS ═════ */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-white/10 sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 dark:sm:border-white/10 animate-pulse p-4"
            >
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-white/10 sm:rounded-3xl sm:border sm:shadow-sm p-8 text-center my-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A35A2A]/10 text-[#A35A2A] dark:bg-[#B46D1C]/20 dark:text-[#B46D1C] mb-4">
            <BriefcaseBusiness size={32} />
          </div>
          <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#F3F4F6] mb-1">
            Aucune publication de votre réseau
          </h2>
          <p className="text-sm text-[#65676B] dark:text-[#9CA3AF] max-w-md mx-auto mb-5">
            Dès que vous développez votre réseau et que vos contacts professionnels publient des actualités, leurs posts apparaîtront ici.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => void loadReseautesPosts(1, true)}
              variant="outline"
              className="rounded-full border-gray-200 dark:border-white/10 text-xs text-[#65676B] dark:text-[#A1A1AA]"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Actualiser
            </Button>
            <Button
              onClick={() => router.push("/retrouvailles?tab=suggestions")}
              className="rounded-full bg-[#A35A2A] hover:bg-[#8B5A2B] text-white font-semibold text-xs px-4"
            >
              <UserPlus size={14} className="mr-1.5" />
              Développer mon réseau
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, postIndex) => (
            <Fragment key={`reseau-feed-frag-${post.id}-${postIndex}`}>
              {post.isAkwaplayVideo && post.akwaplayData ? (
                <AkwaplayPostCard
                  key={`reseau-card-${post.id}-${postIndex}`}
                  id={post.id}
                  videoId={post.akwaplayData.videoId}
                  title={post.akwaplayData.title}
                  description={post.akwaplayData.description}
                  thumbnail={post.akwaplayData.thumbnail}
                  duration={post.akwaplayData.duration}
                  likesCount={post.akwaplayData.likesCount}
                  viewsCount={post.akwaplayData.viewsCount}
                  avatar={post.author?.avatar}
                  headerText="Akwaplay · Réseau"
                  onDismiss={() => {
                    setPosts((prev) => prev.filter((p) => p.id !== post.id))
                    toast.info("Publication masquée")
                  }}
                  author={post.author}
                />
              ) : (() => {
                const targetPageId = (post.page as any)?.id || (post.author as any)?.pageId || ""
                const initialPageLiked = !!(post.page as any)?.isLiked
                const isPageLiked = pageLikedMap[targetPageId] !== undefined ? pageLikedMap[targetPageId] : initialPageLiked
                const isPageLikeLoading = !!pageLikeLoadingMap[targetPageId]

                const videoUrl =
                  typeof post.video === "string"
                    ? post.video
                    : (post.video as any)?.url || undefined

                return (
                  <PostCard
                    key={`reseau-post-${post.id}-${postIndex}`}
                    postId={post.id}
                    author={post.author}
                    currentUser={user}
                    timeAgo={post.createdAt ? timeAgo(post.createdAt) : "Récemment"}
                    content={post.content || undefined}
                    image={post.image || post.images?.[0]?.url || undefined}
                    images={(post.images || []).map((img) => ({ url: img.url }))}
                    video={videoUrl}
                    audio={(post as any).audio || undefined}
                    color={
                      (post.color as any)
                        ? typeof post.color === "string"
                          ? post.color
                          : JSON.stringify(post.color)
                        : undefined
                    }
                    likesCount={post._count.likes ?? 0}
                    commentsCount={post._count.comments ?? 0}
                    sharesCount={post._count.reposts ?? 0}
                    viewsCount={post.viewsCount ?? post.views_count ?? post._count?.views ?? 0}
                    reacted={post.reacted}
                    reactions={post.reactions}
                    users={post.reactionUsers}
                    parentPost={post.parentPost}
                    onLike={(reactionId) => handleReaction(post.id, reactionId ?? 1)}
                    postPrivacy={post.postPrivacy}
                    onComment={(text, files) => handleComment(post.id, text, files)}
                    onShare={() => handleRepost(post.id)}
                    {...(post.author?.id && String(post.author.id) !== String(user?.id)
                      ? {
                          isFollowing: !!post.author.isFollowing,
                          isFollowLoading: followingAuthorIds.has(String(post.author.id)),
                          onToggleFollow: () => handleToggleFollow(post.author),
                        }
                      : {})}
                    {...(targetPageId
                      ? {
                          isPageLiked,
                          isPageLikeLoading,
                          onTogglePageLike: () => {
                            void handleTogglePageLike(targetPageId, initialPageLiked)
                          },
                        }
                      : {})}
                    onDelete={() => setDeleteTarget(post.id)}
                    canDelete={!!user && String(post.author?.id) === String(user?.dughu?.userId)}
                    onBoost={() => handleBoost(post.id)}
                    canBoost={!!user && String(post.author?.id) === String(user?.dughu?.userId)}
                    onSave={() => handleSave(post.id)}
                    onHide={() => handleHide(post.id)}
                    onBlock={() => handleBlock(post.author?.id)}
                    isBlocked={blockedAuthors.has(String(post.author?.id))}
                    isSaved={post.isSaved}
                    className="mb-4"
                  />
                )
              })()}
            </Fragment>
          ))}
        </div>
      )}

      {/* Sentinelle pour infinite scroll */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-sm text-[#65676B] dark:text-[#A1A1AA]">
            <RefreshCw size={16} className="animate-spin text-[#A35A2A]" />
            <span>Chargement des publications suivantes...</span>
          </div>
        )}
      </div>

      {/* Modale de confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Supprimer cette publication ?"
        description="Cette action est irréversible. La publication sera définitivement supprimée."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (deleteTarget) void handleDeletePost(deleteTarget)
        }}
      />
    </MainLayout>
  )
}
