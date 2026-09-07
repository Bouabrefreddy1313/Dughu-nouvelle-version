"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import {
  Home, Video, Zap, Play, Bell, MessageCircle, Search,
  Image as ImageIcon, BarChart3, MoreHorizontal, ThumbsUp,
  MessageSquare, Share2, Send, Users, Calendar, Settings,
  Heart, Bookmark, Eye, ChevronDown, Plus, X, MapPin,
  Smile, Link2, Mic, Palette, Flag, Trash2, Edit3, Pin,
  TrendingUp, Gift, AlertTriangle, Check, Clock, Lock,
  Globe, UserPlus, Volume2, VolumeX, PlayCircle, PauseCircle,
  ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut,
  RefreshCcw, Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import { readPostColors, writePostColor } from "@/lib/postColorCache"
import {
  fetchPosts,
  createPost,
  rePost,
  addReaction,
  deletePost,
  togglePin,
  hidePost,
  blockUser,
  storeSave,
  boostPost,
  followAuthor,
  isAbortError,
} from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { notifyPostReaction, notifyPostComment } from "@/services/notifications/notifications.service"
// Notifications trigger support
import { userMessage } from "@/lib/api/api-error"
import { REACTION_ID_TO_TYPE, POST_COLORS } from "@/lib/constants"
import type { ReactionUserItem } from "@/types/posts/post.types"
import { timeAgo, formatNumber } from "@/lib/helpers"
import { useAuth } from "@/hooks/queries/use-auth"
import { me, logout } from "@/services/auth/auth.service"
import { useFeed } from "@/hooks/queries/use-feed"
import { useStories } from "@/hooks/queries/use-stories"
import FlashFeed from "@/components/flash/FlashFeed"
import FlashViewer from "@/components/flash/FlashViewer"
import FlashCreator from "@/components/flash/FlashCreator"
import { type FlashFeedData } from "@/hooks/queries/use-flash"
import CapsuleRail from "@/components/capsule/CapsuleRail"
import CapsuleViewer from "@/components/capsule/CapsuleViewer"
import { useCapsulesFeed } from "@/hooks/queries/use-capsules"
import type { Capsule } from "@/lib/capsule-service"
import MainLayout from "@/components/layout/MainLayout"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { isDefaultDughuMedia } from "@/lib/dughu"

import { useFlashFeed } from "@/hooks/queries/use-flash"
import { usePagesList } from "@/hooks/pages/use-pages"
import { likePage } from "@/services/pages/pages.service"

const PostComposer = dynamic(() => import("@/components/composer/PostComposer").then((mod) => ({ default: mod.PostComposer })), {
  loading: () => null,
})

const PostCard = dynamic(() => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })), {
  loading: () => (
    <div className="bg-white border-b border-gray-100 sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 animate-pulse p-4">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="h-40 bg-gray-200 rounded-2xl" />
    </div>
  ),
})

const AkwaplayPostCard = dynamic(
  () => import("@/components/feed/AkwaplayPostCard").then((mod) => ({ default: mod.AkwaplayPostCard })),
  { loading: () => null }
)

/* ============================================================
   TYPES
   ============================================================ */

interface Author {
  id: string
  name: string | null
  username: string | null
  avatar: string | null
  cover?: string | null
  verified?: boolean
  isAdmin?: boolean
  isModerator?: boolean
  isFollowing?: boolean
  pageId?: string | null
}

interface Reaction {
  userId: string
  reactionId: number
}

interface CommentItem {
  id: string
  content: string
  createdAt: string
  user: Author
  replies?: CommentItem[]
  likesCount?: number
}

interface PostMedia {
  id: string
  url: string
  type: "image" | "video" | "audio"
  thumb?: string
}

interface PollOption {
  id: string
  text: string
  votes: number
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  totalVotes: number
  hasVoted?: boolean
  userChoice?: string
}

interface Post {
  id: string
  content: string
  image?: string | null
  images?: PostMedia[]
  video?: PostMedia
  audio?: PostMedia
  shareUrl?: string | null
  color?: { bg: string; textColor: string } | null
  createdAt: string
  author: Author
  page?: Author | null
  group?: { id: string; name: string } | null
  event?: { id: string; name: string; date: string } | null
  product?: any | null
  location?: string | null
  poll?: Poll | null
  comments: CommentItem[]
  likes: Reaction[]
  reactionsCount: number
  reactions?: { type: string; count: number }[]
  _count: { comments: number; likes: number; reposts: number; views: number }
  timeLabel?: string
  viewsCount?: number
  views_count?: number
  isBoosted?: boolean
  isPinned?: boolean
  isHidden?: boolean
  commentsDisabled?: boolean
  sensitive?: boolean
  parentPost?: {
    id: string
    author: Author
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    timeAgo?: string
  } | null
  akwaplay?: any | null
  postType?: string
  isAkwaplayVideo?: boolean
  akwaplayData?: {
    videoId: string | number
    title: string
    description?: string | null
    thumbnail: string
    duration?: string | null
    likesCount: number
    viewsCount: number
  } | null
  isLiked?: boolean
  reacted?: string | null
  reactionUsers?: ReactionUserItem[]
  postPrivacy?: 0 | 1 | 2 | 3
  isSaved?: boolean
  isFollowing?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canPin?: boolean
  canBoost?: boolean
}

interface Story {
  id: string
  userId: string
  user: Author
  image?: string
  video?: string
  text?: string
  textColor?: string
  bg?: string
  createdAt: string
  viewed?: boolean
}

function deduplicatePosts(postsList: Post[]): Post[] {
  const seen = new Set<string>()
  return postsList.filter((p) => {
    const id = String(p.id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/* ============================================================
   PAGE PRINCIPALE
   ============================================================ */

export default function HomePage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<"all" | "following">("all")
  const [flashTarget, setFlashTarget] = useState<{ userId: string; userName?: string | null; userAvatar?: string | null } | null>(null)
  const [flashCreatorOpen, setFlashCreatorOpen] = useState(false)
  // Publication en attente de confirmation de suppression (modale au lieu du confirm natif).
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  // Capsules : index d'ouverture de la visionneuse plein écran (null = fermée).
  const [capsuleViewerStart, setCapsuleViewerStart] = useState<number | null>(null)
  // Utilisateurs bloqués (état local de session : le libellé « Bloquer » / « Débloquer »
  // du menu 3 points bascule selon cette liste et l'endpoint Dughu fait office de toggle).
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const [coloredPosts, setColoredPosts] = useState<any[]>([...POST_COLORS])
  const [chatOpen, setChatOpen] = useState(false)
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(
    () => new Set()
  )
  const [pageLikedMap, setPageLikedMap] = useState<Record<string, boolean>>({})
  const [pageLikeLoadingMap, setPageLikeLoadingMap] = useState<Record<string, boolean>>({})

  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)
  const feedReqRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const guardProfileCompletion = async () => {
      try {
        const data = await me()
        if (!cancelled && data?.success && data?.user) {
          const avatar = data.user.avatar || data.user.image || ""
          const cover = data.user.cover || ""
          const incomplete = isDefaultDughuMedia(avatar) || isDefaultDughuMedia(cover)
          if (incomplete) {
            router.replace("/onboarding/profile")
          }
        }
      } catch {
        // pas de blocage du feed si la vérification échoue temporairement
      }
    }
    void guardProfileCompletion()
    return () => {
      cancelled = true
    }
  }, [router])

  // Utilisateur via TanStack Query (cache automatique)
  const { data: rawUser, isLoading: authLoading } = useAuth()
  // useMemo : reference stable pour ne pas recréer l'objet a chaque rendu
  // (evite de re-declencher loadPosts en boucle via la dependance de l'effet)
  const user = useMemo(() => rawUser ? {
    ...rawUser,
    avatar: rawUser.avatar || '/images/avatar.png',
    image: rawUser.image || '/images/avatar.png',
    cover: rawUser.cover || '/images/group/default-cover.jpg',
    _count: rawUser._count || { posts: 0, followers: 0, following: 0 },
  } : null, [rawUser])

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

  // Flash des amis / contacts : permet de détecter les auteurs de posts ayant un
  // Flash actif (anneau marron sur l'avatar) et d'ouvrir leur Flash au clic.
  // Placé après la définition de `user` (utilisé comme identifiant du viewer).
  const { data: flashData } = useFlashFeed(user?.id)
  const activeFlashIds = useMemo(
    () => new Set((flashData?.users || []).map((u) => String(u.userId))),
    [flashData]
  )
  // Auteurs dont tous les Flash ont déjà été vus : l'anneau de leur avatar passe en gris.
  const viewedFlashIds = useMemo(
    () =>
      new Set(
        (flashData?.users || [])
          .filter((u) => u.allViewed === true)
          .map((u) => String(u.userId))
      ),
    [flashData]
  )

  // ── Capsules ────────────────────────────────────────────────────────────────
  // Rail de 3 capsules aléatoires inséré après les 4 premiers posts + visionneuse
  // plein écran. Réutilise le cache React Query de la page /capsules.
  const { data: capsulesData, isLoading: capsulesLoading } = useCapsulesFeed({
    userId: String(user?.dughu?.userId || ""),
  })
  const capsules = useMemo(() => capsulesData?.capsules || [], [capsulesData])

  const openCapsuleViewer = useCallback(
    (capsule: Capsule) => {
      const index = capsules.findIndex((c) => c.id === capsule.id)
      setCapsuleViewerStart(index >= 0 ? index : 0)
    },
    [capsules]
  )

  // Charger posts
  const loadPosts = useCallback(async (page: number, reset = false) => {
    const reqId = ++feedReqRef.current
    setLoading(true)
    const controller = new AbortController()
    // Timeout cote client : evite que le spinner tourne indefiniment si l'API tarde
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const data = await fetchPosts(
        { page, filter, userId: user?.id || "", dughuUserId: user?.dughu?.userId || "" },
        { signal: controller.signal }
      )
      if (reqId !== feedReqRef.current) return
      if (data.success) {
        const reactionsCache = readMyReactions()
        const colorCache = readPostColors()
        const mapped = (data.posts || []).map((p: any) => ({
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
        if (reset || page === 1) setPosts(deduplicatePosts(mapped))
        else setPosts((prev) => deduplicatePosts([...prev, ...mapped]))
        setHasMore(data.hasMore !== false)
        if ((data.posts || []).length === 0) setHasMore(false)
      } else {
        if (page > 1) setHasMore(false) // arrete l'infinite scroll pour ne pas re-essayer en boucle
        toast.error(data.message || "Erreur lors du chargement du fil")
      }
    } catch (error) {
      if (page > 1) setHasMore(false)
      console.error("loadPosts error:", error)
      toast.error(isAbortError(error)
        ? "Chargement trop long, reessayez."
        : "Erreur chargement posts. Reessayez.")
    } finally {
      clearTimeout(timer)
      if (reqId === feedReqRef.current) {
        setLoading(false)
        loadingMoreRef.current = false
      }
    }
  }, [filter, user])

  const handleToggleFollow = useCallback(async (author: Author) => {
    if (!user?.id || !author.id) return

    const authorId = String(author.id)
    const previousFollowing = !!author.isFollowing
    const nextFollowing = !previousFollowing

    setFollowingAuthorIds((previous) => new Set(previous).add(authorId))
    setPosts((previous) =>
      previous.map((post) =>
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
      setPosts((previous) =>
        previous.map((post) =>
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
      setPosts((previous) =>
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
        error instanceof Error
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
  }, [user?.id])

  // Stories via TanStack Query
  const { data: stories = [] } = useStories(!!user?.id)

  // Charger le fil uniquement quand l'utilisateur est chargé
  // (évite le fetch au userId vide qui retomberait sur Prisma, et les écrasements de réponses)
  useEffect(() => {
    if (!user?.id) return
    setPageNum(1)
    loadPosts(1, true)
  }, [loadPosts, user])

  // Chargement automatique au scroll (infinite scroll, sans bouton "Charger plus")
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || loading || loadingMoreRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !loading && !loadingMoreRef.current) {
            loadingMoreRef.current = true
            const next = pageNum + 1
            setPageNum(next)
            loadPosts(next)
          }
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, pageNum, loadPosts])

  // Défilement automatique vers le post ciblé (ex: après un clic sur un post repartagé)
  useEffect(() => {
    if (loading || posts.length === 0) return

    const checkAndScroll = () => {
      let targetPostId = ""
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        targetPostId = params.get("post") || ""
        if (!targetPostId && window.location.hash.startsWith("#post-")) {
          targetPostId = window.location.hash.replace("#post-", "")
        }
      }

      if (!targetPostId) return

      const el = document.getElementById(`post-${targetPostId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ring-4", "ring-[#C47830]/60", "transition-all", "duration-700")
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-[#C47830]/60")
        }, 3000)
      }
    }

    const t = setTimeout(checkAndScroll, 400)
    return () => clearTimeout(t)
  }, [loading, posts.length])

  const handleCreatePost = async (formData: FormData) => {
    if (!user) { toast.error("Connectez-vous pour publier"); return }
    const colorRaw = (formData.get("color") as string) || null
    try {
      const data = await createPost(formData)
      if (data.success) {
        // L'API Dughu ne persiste pas la couleur → on la mémorise côté client.
        const postColor = colorRaw || data.post?.color || null
        if (postColor && data.post?.id) writePostColor(String(data.post.id), postColor)
        if (!data.post) return
        const createdPost = data.post
        setPosts((prev) => deduplicatePosts([
          {
            ...createdPost,
            timeLabel: timeAgo(String(createdPost.createdAt || "")),
            _count: { comments: 0, likes: 0, reposts: 0, views: 0 },
            color: postColor,
          } as unknown as Post,
          ...prev,
        ]))
        toast.success("Publication créée !")
      }
    } catch {
      toast.error("Erreur création post")
    }
  }

  const handleReaction = async (postId: string, reactionId?: number) => {
    if (!user) return
    const reactionType = REACTION_ID_TO_TYPE[reactionId || 1] || "like"
    const cache = readMyReactions()
    const previousType = cache[postId] || null

    // Détermine le nouvel état à partir de la réaction actuelle :
    // - aucune réaction → like avec la réaction choisie (+1)
    // - même réaction → unlike (-1)
    // - autre réaction → changement de réaction (compte inchangé)
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

    // Met à jour la liste des personnes ayant réagi de façon optimiste :
    // on retire l'entrée de l'utilisateur courant (si présente) puis on la
    // ré-ajoute avec le nouveau type quand il réagit. Aucune donnée factice.
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

    const applyToPost = (fn: (p: any) => any) =>
      setPosts((prev) =>
        prev.map((p) => (p.id !== postId ? p : fn(p)))
      )

    // Mise à jour optimiste (compteur en live + emoji sur le bouton + liste des réactions)
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

    // Persiste la réaction immédiatement (cache local) pour qu'elle survive au rechargement,
    // même si la réponse de l'API Dughu ne renvoie pas un champ fiable.
    const newCache = { ...cache }
    if (newReacted) newCache[postId] = newReacted
    else delete newCache[postId]
    writeMyReactions(newCache)

    try {
      const data = await addReaction({ postId, userId: user.id, type: reactionType, dughuUserId: user?.dughu?.userId })
      if (data.success) {
        if (typeof data.count === "number") {
          applyToPost((p) => ({
            ...p,
            _count: { ...p._count, likes: data.count },
          }))
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
    if (!user) { toast.error("Connectez-vous pour commenter"); return }
    try {
      const formData = new FormData()
      formData.append("postId", postId)
      formData.append("userId", user.id)
      formData.append("dughuUserId", user?.dughu?.userId || "")
      formData.append("content", text)
      if (files && files.length > 0) files.forEach((f) => formData.append("files", f))
      const data = await addComment(formData)
      if (data.success) {
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, _count: { ...p._count, comments: (p._count.comments || 0) + 1 } }
            : p
        ))
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
        console.error("COMMENT API ERROR:", data)
      }
    } catch (err) {
      toast.error("Erreur réseau commentaire")
      console.error("COMMENT NETWORK ERROR:", err)
    }
  }

    // Insère une carte de republication en tête du fil, avec le post d'origine
  // embarqué (lookup local). Partagé entre repost direct et repost avec texte.
    const addRepostToFeed = (postId: string, post: Post, commentary?: string) => {
    setPosts((prev) => {
      const original = prev.find((p) => p.id === postId)
      return [
        {
          ...post,
          // Le texte d'accompagnement devient le contenu du repost.
          content: commentary || post?.content || "",
          timeLabel: timeAgo(post?.createdAt),
          _count: post?._count || { comments: 0, likes: 0, reposts: 0, views: 0 },
          parentPost: original
            ? {
                id: original.id,
                author: original.author,
                content: original.content,
                image: original.image || original.images?.[0]?.url,
                video:
                  typeof original.video === "string"
                    ? original.video
                    : (original.video as any)?.url || null,
                color:
                  original.color && typeof original.color === "string"
                    ? original.color
                    : original.color
                      ? JSON.stringify(original.color)
                      : null,
                timeAgo: original.timeLabel,
              }
            : null,
        },
        ...prev.map((p) =>
          p.id === postId
            ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
            : p
        ),
      ]
    })
  }

  const handleRepost = async (postId: string) => {
    if (!user) { toast.error("Connectez-vous pour republier"); return }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", user.id)
      formData.append("dughuUserId", user?.dughu?.userId || "")
      const data = await createPost(formData)
      if (data.success && data.post) {
        addRepostToFeed(postId, data.post as unknown as Post)
        toast.success("Repost effectué !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch { toast.error("Erreur repost") }
  }

  // Republier en ajoutant un texte d'accompagnement (commentaire).
  const handleRepostWithText = async (postId: string, text: string) => {
    if (!user) { toast.error("Connectez-vous pour republier"); return }
    const commentary = text.trim()
    if (!commentary) { handleRepost(postId); return }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", user.id)
      formData.append("dughuUserId", user?.dughu?.userId || "")
      formData.append("postText", commentary)
      const data = await rePost(formData)
      if (data.success && data.post) {
        addRepostToFeed(postId, data.post as unknown as Post, commentary)
        toast.success("Repost publié !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch { toast.error("Erreur repost") }
  }

  const handleDelete = async (postId: string) => {
    try {
      const ok = await deletePost(postId)
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post supprimé")
      }
    } catch { toast.error("Erreur suppression") }
    setDeleteTarget(null)
  }

  const handlePin = async (postId: string) => {
    try {
      const ok = await togglePin(postId, { userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (ok) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
        toast.success("Statut épinglé mis à jour")
      }
    } catch { }
  }

  const handleHide = async (postId: string) => {
    try {
      const ok = await hidePost({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post masqué")
      }
    } catch { }
  }

  const handleBlock = async (authorId: string) => {
    if (!user) { toast.error("Connectez-vous pour bloquer"); return }
    const targetId = String(authorId)
    const isBlocked = blockedAuthors.has(targetId)
    try {
      const data = await blockUser({ authorId: targetId, userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (data.success) {
        setBlockedAuthors((prev) => {
          const next = new Set(prev)
          if (isBlocked) next.delete(targetId)
          else next.add(targetId)
          return next
        })
        if (isBlocked) {
          toast.success("Utilisateur débloqué")
        } else {
          toast.success("Utilisateur bloqué")
          // Retire immédiatement les publications de cet utilisateur du fil.
          setPosts((prev) => prev.filter((p) => String(p.author?.id) !== targetId))
        }
      } else {
        toast.error(data.message || "Erreur lors du blocage")
      }
    } catch (error) {
      toast.error(userMessage(error, "Erreur lors du blocage"))
    }
  }

  const handleSave = async (postId: string) => {
    try {
      const data = await storeSave({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (data.success) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
        toast.success(data.saved ? "Post enregistré !" : "Enregistrement annulé")
      }
    } catch { }
  }

  const handleBoost = async (postId: string) => {
    try {
      const data = await boostPost({ postId, userId: user?.id, boostDays: 1 })
      if (data?.success === false) {
        toast.error(data?.message || "Impossible de booster cette publication.")
        return
      }
      toast.success("Publication boostée !")
      loadPosts(1, true)
    } catch (error) {
      toast.error(userMessage(error, "Impossible de booster cette publication."))
    }
  }

  const handleReport = async (postId: string) => {
    toast.info("Signalement — modal à implémenter")
  }

  const handleEdit = (post: Post) => {
    toast.info("Édition — modal à implémenter")
  }

  const handleLogout = () => {
    void logout().finally(() => {
      router.push("/login")
    })
  }

  const handleSearch = (q: string) => {
    if (!q.trim()) return
    router.push(`/searchPosts?searchTerm=${encodeURIComponent(q)}`)
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
    formData.append("userId", user?.id)
    formData.append("dughuUserId", user?.dughu?.userId || "")
    if (data.pageId) {
      formData.append("page_id", data.pageId)
      formData.append("pageId", data.pageId)
    }
    if (data.privacy != null) formData.append("privacy", String(data.privacy))
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
    await handleCreatePost(formData)
  }

  return (
    <MainLayout
      user={user}
      onLogout={handleLogout}
      onSearch={handleSearch}
      filter={filter}
      onFilterChange={setFilter}
    >
      {/* Flash feed (stories amis via /getFriendsStories) */}
      <FlashFeed
        userId={user?.id}
        currentUser={user}
        onAddStory={() => setFlashCreatorOpen(true)}
        onOpenFlash={(targetUserId: string, user?: { name?: string | null; avatar?: string | null }) =>
          setFlashTarget({ userId: targetUserId, userName: user?.name, userAvatar: user?.avatar })
        }
      />
      <FlashCreator
        user={user}
        open={flashCreatorOpen}
        onClose={() => setFlashCreatorOpen(false)}
        onCreated={(story) => {
          if (!story) return
          queryClient.invalidateQueries({ queryKey: ["flash", "feed"] })
          // L'API Dughu ne renvoie pas l'image dans getUserStories : on injecte la
          // story fraîchement créée (avec son blob) dans le cache du feed pour que
          // la mini-carte affiche immédiatement le dernier Flash (image OU texte).
          queryClient.setQueriesData<FlashFeedData>({ queryKey: ["flash", "feed"] }, (old) => {
            if (!old) return old
            const selfId = String(story.userId)
            const selfUser = (old.users || []).find((u) => String(u.userId) === selfId)
            const newStory = {
              id: story.id,
              userId: selfId,
              image: story.image || undefined,
              video: story.video || undefined,
              text: story.text || "",
              bg: story.bg || "",
              viewed: false,
              createdAt: story.createdAt,
              user: selfUser?.user || null,
            }
            const newEntry = {
              userId: selfId,
              user: selfUser?.user || null,
              stories: [newStory, ...(selfUser?.stories || [])],
              allViewed: false,
            }
            const nextUsers = (old.users || []).slice()
            const idx = nextUsers.findIndex((u) => String(u.userId) === selfId)
            if (idx >= 0) nextUsers[idx] = newEntry
            else nextUsers.unshift(newEntry)
            return { ...old, users: nextUsers, stories: [newStory, ...(old.stories || [])] }
          })
        }}
      />

      {/* Flash viewer (stories d'un utilisateur via /getUserStories) */}
      {flashTarget && (
        <FlashViewer
          key={flashTarget.userId}
          targetUserId={flashTarget.userId}
          userId={user?.id}
          userName={flashTarget.userName}
          userAvatar={flashTarget.userAvatar}
          onClose={() => {
            setFlashTarget(null)
            // À la fermeture : rafraîchir le rail pour que les statuts « vu »
            // (logView côté Dughu) soient à jour → l'anneau orange disparaît.
            queryClient.invalidateQueries({ queryKey: ["flash", "feed"] })
            queryClient.invalidateQueries({ queryKey: ["flash", "user"] })
          }}
          onStoryDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["flash", "feed"] })
            queryClient.invalidateQueries({ queryKey: ["flash", "user"] })
          }}
        />
      )}

      {/* Create Post — padding horizontal sur mobile car le main est edge-to-edge */}
      <div className="px-3 sm:px-0">
        <PostComposer user={user} spaces={composerSpaces} onSubmit={handlePostSubmit} className="mb-4" />
      </div>

      {/* Posts Feed */}
      {posts.map((post, postIndex) => (
        <Fragment key={`feed-frag-${post.id}-${postIndex}`}>
        {post.isAkwaplayVideo && post.akwaplayData ? (
          <AkwaplayPostCard
            key={`feed-card-${post.id}-${postIndex}`}
            id={post.id}
            videoId={post.akwaplayData.videoId}
            title={post.akwaplayData.title}
            description={post.akwaplayData.description}
            thumbnail={post.akwaplayData.thumbnail}
            duration={post.akwaplayData.duration}
            likesCount={post.akwaplayData.likesCount}
            viewsCount={post.akwaplayData.viewsCount}
            avatar={post.author?.avatar}
            headerText="Akwaplay · Suggestion pour vous"
            onDismiss={() => {
              setPosts((prev) => prev.filter((p) => p.id !== post.id))
              toast.info("Publication masquée")
            }}
            className="mb-4"
          />
        ) : (() => {
          const pageAuthor = (post as any).page as Author | null | undefined
          const isPageAuthor = !!pageAuthor?.id || !!post.author?.pageId || !!(post as any).page_id
          const targetPageId = String(post.author?.pageId || pageAuthor?.id || (post as any)?.page_id || (post as any)?.page?.page_id || "")
          const initialPageLiked = Boolean(
            (pageAuthor as any)?.isLiked ??
            (post.author as any)?.isLiked ??
            (post as any)?.page?.is_like ??
            (post as any)?.page_is_liked ??
            false
          )
          const isPageLiked = targetPageId ? (pageLikedMap[targetPageId] !== undefined ? pageLikedMap[targetPageId] : initialPageLiked) : false
          const isPageLikeLoading = targetPageId ? Boolean(pageLikeLoadingMap[targetPageId]) : false
          return (
          <PostCard
            key={`feed-card-${post.id}-${postIndex}`}
            postId={post.id}
            author={post.author}
            currentUser={user}
            timeAgo={timeAgo(post.createdAt)}
            content={post.content}
            image={post.image || post.images?.[0]?.url}
            images={(post.images || []).map((img) => ({ url: img.url }))}
            video={post.video?.url || (post as any).video}
            audio={(post as any).audio || null}
            color={(post.color as any) ? (typeof post.color === "string" ? post.color : JSON.stringify(post.color)) : null}
            likesCount={post._count.likes}
            commentsCount={post._count.comments}
            sharesCount={post._count.reposts}
            viewsCount={post.viewsCount ?? post.views_count ?? post._count?.views ?? 0}
            reacted={post.reacted}
            reactions={post.reactions}
            users={post.reactionUsers}
            parentPost={post.parentPost}
            onLike={(reactionId) => handleReaction(post.id, reactionId)}
            postPrivacy={post.postPrivacy}
            onComment={(text, files) => handleComment(post.id, text, files)}
            onRepost={() => handleRepost(post.id)}
            onShare={() => toast.info("Partage")}
            {...(!isPageAuthor
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
                  onTogglePageLike: () => void handleTogglePageLike(targetPageId, initialPageLiked),
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
            hasActiveFlash={activeFlashIds.has(String(post.author?.id))}
            flashViewed={viewedFlashIds.has(String(post.author?.id))}
            onOpenAuthorFlash={(author) =>
              setFlashTarget({
                userId: author.id,
                userName: author.name,
                userAvatar: author.avatar,
              })
            }
            className="mb-4"
          />
        )})()}
        {/* Rail Capsules : 3 capsules aléatoires après les 4 premiers posts */}
        {postIndex === 3 && (
          <CapsuleRail
            capsules={capsules}
            loading={capsulesLoading}
            onOpen={openCapsuleViewer}
          />
        )}
        </Fragment>
      ))}

      {/* Skeleton Loading (premier chargement / auth en cours) */}
      {(loading || authLoading) && posts.length === 0 && (
        <div className="space-y-4">
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

      {/* Chargement automatique au scroll : skeleton de derniere page */}
      {hasMore && (
        <div ref={loadMoreRef} className="min-h-16">
          {loading && posts.length > 0 && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={`more-${i}`} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-28 bg-gray-200 rounded-2xl" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      

      {posts.length === 0 && !loading && !authLoading && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
          <p className="text-[#65676B]">Aucune publication pour l'instant.</p>
          <Button onClick={() => loadPosts(1, true)} className="mt-3 bg-[#A35A2A] text-white rounded-full">Actualiser</Button>
        </div>
      )}

      {/* Visionneuse Capsules (plein écran, type Reels) */}
      {capsuleViewerStart !== null && capsules.length > 0 && (
        <CapsuleViewer
          capsules={capsules}
          startIndex={capsuleViewerStart}
          userId={String(user?.dughu?.userId || "")}
          onClose={() => setCapsuleViewerStart(null)}
        />
      )}

      {/* Confirmation de suppression (vrai popup, pas de confirm() natif) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Supprimer la publication ?"
        description="Cette action est irréversible. Voulez-vous vraiment supprimer cette publication ?"
        confirmLabel="Supprimer"
        onConfirm={() => (deleteTarget ? handleDelete(deleteTarget) : undefined)}
      />
    </MainLayout>
  )
}
