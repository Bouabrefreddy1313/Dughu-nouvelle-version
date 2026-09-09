"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  Video,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import {
  fetchPosts,
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
import { hasVideoContent } from "@/lib/dughu"
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
        <div className="h-56 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
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

export default function VideosPage() {
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

  const loadVideoPosts = useCallback(
    async (page: number, reset = false) => {
      const reqId = ++feedReqRef.current
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)

      try {
        const data = await fetchPosts(
          {
            page,
            filter: "videos",
            userId: user?.id || "",
            dughuUserId: user?.dughu?.userId || "",
          },
          { signal: controller.signal }
        )

        if (reqId !== feedReqRef.current) return

        if (data.success) {
          const reactionsCache = readMyReactions()
          const rawPosts = data.posts || []

          // Filtrage défensif : seuls les posts contenant une vidéo sont conservés
          const videoPostsOnly = rawPosts.filter(hasVideoContent)

          const mapped: Post[] = videoPostsOnly.map((p: any) => ({
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

          setHasMore(data.hasMore !== false)

          // Si cette page contenait peu de vidéos mais qu'il y a plus de pages,
          // on incrémente pour charger la suite automatiquement
          if (mapped.length < 3 && data.hasMore !== false && page < 4) {
            setPageNum(page + 1)
          }
        } else {
          if (page > 1) setHasMore(false)
          toast.error(data.message || "Erreur lors du chargement des vidéos.")
        }
      } catch (error) {
        if (page > 1) setHasMore(false)
        console.error("loadVideoPosts error:", error)
        toast.error(
          isAbortError(error)
            ? "Chargement trop long, réessayez."
            : "Erreur lors du chargement des vidéos."
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
    void loadVideoPosts(1, true)
  }, [loadVideoPosts])

  // Défilement infini
  useEffect(() => {
    if (loading || !hasMore) return
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMoreRef.current && hasMore) {
          loadingMoreRef.current = true
          setPageNum((prev) => {
            const next = prev + 1
            void loadVideoPosts(next, false)
            return next
          })
        }
      },
      { rootMargin: "300px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, hasMore, loadVideoPosts])

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
      } catch {
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
        toast.error("Impossible de modifier le suivi.")
      } finally {
        setFollowingAuthorIds((prev) => {
          const next = new Set(prev)
          next.delete(authorId)
          return next
        })
      }
    },
    [user]
  )

  const handleTogglePageLike = async (targetPageId: string, initialLiked: boolean) => {
    if (!targetPageId || pageLikeLoadingMap[targetPageId]) return
    const currentLiked =
      pageLikedMap[targetPageId] !== undefined ? pageLikedMap[targetPageId] : initialLiked
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

  const handleReaction = async (postId: string, reactionId: number) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const targetType = REACTION_ID_TO_TYPE[reactionId] || "like"
    const currentType = post.reacted
    const isRemoving = currentType === targetType
    const nextReacted = isRemoving ? null : targetType

    // Mise à jour optimiste
    const cache = readMyReactions()
    if (nextReacted) cache[postId] = nextReacted
    else delete cache[postId]
    writeMyReactions(cache)

    const prevCount = post._count.likes
    const nextCount = isRemoving ? Math.max(0, prevCount - 1) : currentType ? prevCount : prevCount + 1

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              reacted: nextReacted,
              _count: { ...p._count, likes: nextCount },
            }
          : p
      )
    )

    try {
      const dughuUserId = user?.dughu?.userId || ""
      const data = await addReaction({
        postId,
        userId: user?.id || "",
        type: nextReacted || "unlike",
        dughuUserId,
      })
      if (!data.success) {
        toast.error(data.message || "Erreur lors de la réaction.")
      } else if (post.author?.id && !isRemoving) {
        void notifyPostReaction({
          authorUserId: post.author.id,
          senderName: user?.name || "Un utilisateur",
          postId,
        })
      }
    } catch {
      toast.error("Erreur réseau pour la réaction.")
    }
  }

  const handleComment = async (postId: string, text: string, files?: File[]) => {
    if (!user) {
      toast.error("Connectez-vous pour commenter")
      return
    }
    const post = posts.find((p) => p.id === postId)
    if (!post) return

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
              ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
              : p
          )
        )
        if (post.author?.id && String(post.author.id) !== String(user.id)) {
          void notifyPostComment({
            authorUserId: post.author.id,
            senderName: user.name || "Un utilisateur",
            postId,
          })
        }
      } else {
        toast.error(data.message || "Erreur lors de l'ajout du commentaire.")
      }
    } catch {
      toast.error("Impossible d'ajouter le commentaire.")
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
      formData.append("dughuUserId", user?.dughu?.userId || "")
      const data = await createPost(formData)
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, reposts: p._count.reposts + 1 } }
              : p
          )
        )
        toast.success("Publication republiée avec succès !")
      } else {
        toast.error(data.message || "Erreur lors de la republication.")
      }
    } catch {
      toast.error("Impossible de republier.")
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
      const dughuUserId = user?.dughu?.userId || ""
      const data = await storeSave({ postId, userId: user?.id, dughuUserId })
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
        )
        toast.success(data.message || "Sauvegardé avec succès !")
      } else {
        toast.error(data.message || "Erreur lors de la sauvegarde.")
      }
    } catch {
      toast.error("Impossible d'enregistrer.")
    }
  }

  const handleHide = async (postId: string) => {
    try {
      const dughuUserId = user?.dughu?.userId || ""
      const ok = await hidePost({ postId, userId: user?.id, dughuUserId })
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Publication masquée.")
      } else {
        toast.error("Erreur lors du masquage.")
      }
    } catch {
      toast.error("Impossible de masquer.")
    }
  }

  const handleBlock = async (authorId?: string | number) => {
    if (!authorId) return
    const targetId = String(authorId)
    const isCurrentlyBlocked = blockedAuthors.has(targetId)

    try {
      const dughuUserId = user?.dughu?.userId || ""
      const data = await blockUser({ authorId: targetId, userId: user?.id, dughuUserId })
      if (data.success) {
        if (isCurrentlyBlocked) {
          setBlockedAuthors((prev) => {
            const next = new Set(prev)
            next.delete(targetId)
            return next
          })
          toast.success("Utilisateur débloqué.")
        } else {
          setBlockedAuthors((prev) => new Set(prev).add(targetId))
          setPosts((prev) => prev.filter((p) => String(p.author?.id) !== targetId))
          toast.success("Utilisateur bloqué.")
        }
      } else {
        toast.error(data.message || "Erreur lors du blocage.")
      }
    } catch {
      toast.error("Impossible de bloquer l'utilisateur.")
    }
  }

  const handleBoost = async (postId: string) => {
    try {
      const dughuUserId = user?.dughu?.userId || ""
      const data = await boostPost({ postId, userId: dughuUserId, boostDays: 7 })
      if (data.success) {
        toast.success("Publication boostée avec succès !")
      } else {
        toast.error(data.message || "Erreur lors du boost.")
      }
    } catch {
      toast.error("Impossible de booster la publication.")
    }
  }

  const handlePostSubmit = async (data: {
    content: string
    color?: any
    images?: File[]
    videos?: File[]
    audios?: File[]
    post_privacy?: number
    page_id?: string
  }) => {
    if (!user) return
    const formData = new FormData()
    formData.append("userId", user.id)
    if (user.dughu?.userId) formData.append("dughuUserId", user.dughu.userId)
    formData.append("content", data.content)
    if (data.post_privacy !== undefined) formData.append("post_privacy", String(data.post_privacy))
    if (data.page_id) formData.append("page_id", String(data.page_id))

    if (data.videos) {
      data.videos.forEach((vid) => formData.append("videos", vid))
    }
    if (data.images) {
      data.images.forEach((img) => formData.append("images", img))
    }

    try {
      const res = await createPost(formData)
      if (res.success && res.post) {
        // Si le post créé a une vidéo, on l'ajoute au début du fil vidéo
        if (hasVideoContent(res.post)) {
          setPosts((prev) => [
            {
              ...res.post,
              timeLabel: "À l'instant",
              reacted: null,
              _count: { likes: 0, comments: 0, reposts: 0, views: 0 },
            } as Post,
            ...prev,
          ])
        }
        toast.success("Publication vidéo créée avec succès !")
      } else {
        toast.error(res.message || "Erreur lors de la publication.")
      }
    } catch {
      toast.error("Impossible de publier votre vidéo.")
    }
  }

  return (
    <MainLayout user={rawUser} active="videos">
      {/* Create Post — compositeur de publication */}
      <div className="px-3 sm:px-0 mb-4">
        <PostComposer
          user={user}
          spaces={composerSpaces}
          onSubmit={handlePostSubmit}
          className="mb-4"
        />
      </div>

      {/* ═════ LISTE DES POSTS VIDÉO ═════ */}
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
              <div className="h-60 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-white/10 sm:rounded-3xl sm:border sm:shadow-sm p-8 text-center my-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A35A2A]/10 text-[#A35A2A] dark:bg-[#B46D1C]/20 dark:text-[#B46D1C] mb-4">
            <Video size={32} />
          </div>
          <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#F3F4F6] mb-1">
            Aucune publication vidéo pour le moment
          </h2>
          <p className="text-sm text-[#65676B] dark:text-[#9CA3AF] max-w-md mx-auto mb-5">
            Soyez le premier à partager une vidéo avec vos amis et abonnés sur Dughu !
          </p>
          <Button
            onClick={() => void loadVideoPosts(1, true)}
            className="rounded-full bg-[#A35A2A] hover:bg-[#8B5A2B] text-white font-semibold px-5"
          >
            <RefreshCw size={16} className="mr-2" />
            Actualiser le fil
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, postIndex) => (
            <Fragment key={`video-feed-frag-${post.id}-${postIndex}`}>
              {post.isAkwaplayVideo && post.akwaplayData ? (
                <AkwaplayPostCard
                  key={`video-card-${post.id}-${postIndex}`}
                  id={post.id}
                  videoId={post.akwaplayData.videoId}
                  title={post.akwaplayData.title}
                  description={post.akwaplayData.description}
                  thumbnail={post.akwaplayData.thumbnail}
                  duration={post.akwaplayData.duration}
                  likesCount={post.akwaplayData.likesCount}
                  viewsCount={post.akwaplayData.viewsCount}
                  avatar={post.author?.avatar}
                  headerText="Akwaplay · Vidéo"
                  onDismiss={() => {
                    setPosts((prev) => prev.filter((p) => p.id !== post.id))
                    toast.info("Publication masquée")
                  }}
                  className="mb-4"
                />
              ) : (() => {
                const pageAuthor = (post as any).page as Author | null | undefined
                const isPageAuthor =
                  !!pageAuthor?.id || !!post.author?.pageId || !!(post as any).page_id
                const targetPageId = String(
                  post.author?.pageId ||
                    pageAuthor?.id ||
                    (post as any)?.page_id ||
                    (post as any)?.page?.page_id ||
                    ""
                )
                const initialPageLiked = Boolean(
                  (pageAuthor as any)?.isLiked ??
                    (post.author as any)?.isLiked ??
                    (post as any)?.page?.is_like ??
                    (post as any)?.page_is_liked ??
                    false
                )
                const isPageLiked = targetPageId
                  ? pageLikedMap[targetPageId] !== undefined
                    ? pageLikedMap[targetPageId]
                    : initialPageLiked
                  : false
                const isPageLikeLoading = targetPageId
                  ? Boolean(pageLikeLoadingMap[targetPageId])
                  : false

                const videoUrl =
                  typeof post.video === "string"
                    ? post.video
                    : (post.video as any)?.url || (post as any).video || undefined

                return (
                  <PostCard
                    key={`video-card-${post.id}-${postIndex}`}
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
            <span>Chargement des vidéos suivantes...</span>
          </div>
        )}
      </div>

      {/* Modale de confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Supprimer cette vidéo ?"
        description="Cette action est irréversible. La publication sera définitivement supprimée de votre profil et du fil d'actualité."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (deleteTarget) void handleDeletePost(deleteTarget)
        }}
      />
    </MainLayout>
  )
}
