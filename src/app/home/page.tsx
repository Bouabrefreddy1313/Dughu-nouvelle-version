"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { REACTION_ID_TO_TYPE, POST_COLORS } from "@/lib/constants"
import { timeAgo, formatNumber } from "@/lib/helpers"
import { useAuth } from "@/hooks/queries/use-auth"
import { useFeed } from "@/hooks/queries/use-feed"
import { useStories } from "@/hooks/queries/use-stories"
import MiniStories from "@/components/stories/MiniStories"
import MainLayout from "@/components/layout/MainLayout"

const PostComposer = dynamic(() => import("@/components/composer/PostComposer").then((mod) => ({ default: mod.PostComposer })), {
  loading: () => null,
})

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
  isLiked?: boolean
  reacted?: string | null
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
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [coloredPosts, setColoredPosts] = useState<any[]>([...POST_COLORS])
  const [chatOpen, setChatOpen] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)
  const feedReqRef = useRef(0)

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

  // Charger posts
  const loadPosts = useCallback(async (page: number, reset = false) => {
    const reqId = ++feedReqRef.current
    setLoading(true)
    const controller = new AbortController()
    // Timeout cote client : evite que le spinner tourne indefiniment si l'API tarde
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const userId = user?.id || ""
      const dughuUserId = user?.dughu?.userId || ""
      const res = await fetch(`/api/posts?page=${page}&filter=${filter}&userId=${userId}&dughuUserId=${dughuUserId}`, {
        signal: controller.signal,
      })
      let data: any
      try {
        data = await res.json()
      } catch {
        data = { success: false, message: `Reponse invalide du serveur (${res.status}).` }
      }
      if (reqId !== feedReqRef.current) return
      if (data.success) {
        const reactionsCache = readMyReactions()
        const colorCache = readPostColors()
        const mapped = (data.posts || []).map((p: any) => ({
          ...p,
          timeLabel: timeAgo(p.createdAt),
          reacted: reactionsCache[p.id] || p.reacted || null,
          color: p.color || colorCache[p.id] || null,
          _count: p._count || { comments: 0, likes: 0, reposts: 0, views: 0 },
          parentPost: p.parentPost
            ? { ...p.parentPost, timeAgo: timeAgo(p.parentPost?.createdAt) }
            : null,
        }))
        if (reset || page === 1) setPosts(mapped)
        else setPosts((prev) => [...prev, ...mapped])
        setHasMore(data.hasMore !== false)
        if ((data.posts || []).length === 0) setHasMore(false)
      } else {
        if (page > 1) setHasMore(false) // arrete l'infinite scroll pour ne pas re-essayer en boucle
        toast.error(data.message || "Erreur lors du chargement du fil")
      }
    } catch (error) {
      if (page > 1) setHasMore(false)
      console.error("loadPosts error:", error)
      toast.error(error instanceof DOMException && error.name === "AbortError"
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

  const handleCreatePost = async (formData: FormData) => {
    if (!user) { toast.error("Connectez-vous pour publier"); return }
    const colorRaw = (formData.get("color") as string) || null
    try {
      const res = await fetch("/api/posts", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        // L'API Dughu ne persiste pas la couleur → on la mémorise côté client.
        const postColor = colorRaw || data.post?.color || null
        if (postColor && data.post?.id) writePostColor(String(data.post.id), postColor)
        setPosts((prev) => [
          {
            ...data.post,
            timeLabel: timeAgo(data.post.createdAt),
            _count: { comments: 0, likes: 0, reposts: 0, views: 0 },
            color: postColor,
          },
          ...prev,
        ])
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

    const applyToPost = (fn: (p: any) => any) =>
      setPosts((prev) =>
        prev.map((p) => (p.id !== postId ? p : fn(p)))
      )

    // Mise à jour optimiste (compteur en live + emoji sur le bouton)
    applyToPost((p) => ({
      ...p,
      reacted: newReacted,
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
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: user.id, type: reactionType, dughuUserId: user?.dughu?.userId }),
      })
      const data = await res.json()
      if (data.success) {
        if (typeof data.count === "number") {
          applyToPost((p) => ({
            ...p,
            reacted: newReacted,
            _count: { ...p._count, likes: data.count },
          }))
        }
        if (newReacted) {
          toast.success(`Réaction ${newReacted} ajoutée`)
        }
      } else {
        toast.error(data.message || "Impossible de réagir à cette publication")
        applyToPost((p) => ({
          ...p,
          reacted: previousType,
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
      const res = await fetch("/api/comments", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, _count: { ...p._count, comments: (p._count.comments || 0) + 1 } }
            : p
        ))
        toast.success("Commentaire publié !")
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
      const res = await fetch("/api/posts", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        addRepostToFeed(postId, data.post)
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
      const res = await fetch("/api/rePost", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        addRepostToFeed(postId, data.post, commentary)
        toast.success("Repost publié !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch { toast.error("Erreur repost") }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm("Supprimer cette publication ?")) return
    try {
      const res = await fetch(`/api/deletePost/${postId}`, { method: "DELETE" })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post supprimé")
      }
    } catch { toast.error("Erreur suppression") }
  }

  const handlePin = async (postId: string) => {
    try {
      const res = await fetch(`/api/togglePinStatus/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, dughuUserId: user?.dughu?.userId }),
      })
      if (res.ok) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
        toast.success("Statut épinglé mis à jour")
      }
    } catch { }
  }

  const handleHide = async (postId: string) => {
    try {
      const res = await fetch("/api/hidePost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId }),
      })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post masqué")
      }
    } catch { }
  }

  const handleSave = async (postId: string) => {
    try {
      const res = await fetch("/api/store-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
        toast.success(data.saved ? "Post enregistré !" : "Enregistrement annulé")
      }
    } catch { }
  }

  const handleBoost = async (postId: string) => {
    try {
      const res = await fetch("/api/boostPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: user?.id, days: 1 }),
      })
      if (res.ok) { toast.success("Post boosté !"); loadPosts(1, true) }
    } catch { toast.error("Erreur boost") }
  }

  const handleReport = async (postId: string) => {
    toast.info("Signalement — modal à implémenter")
  }

  const handleEdit = (post: Post) => {
    toast.info("Édition — modal à implémenter")
  }

  const handleLogout = () => {
    localStorage.removeItem("dughu_user")
    fetch("/api/logout", { method: "POST" }).finally(() => {
      router.push("/login")
    })
  }

  const handleSearch = (q: string) => {
    if (!q.trim()) return
    router.push(`/searchPosts?searchTerm=${encodeURIComponent(q)}`)
  }

  const handlePostSubmit = async (data: { content: string; color?: any; images?: File[]; videos?: File[]; audios?: File[] }) => {
    const formData = new FormData()
    formData.append("content", data.content)
    formData.append("userId", user?.id)
    formData.append("dughuUserId", user?.dughu?.userId || "")
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
      {/* Mini Stories */}
      <MiniStories
        stories={stories}
        currentUser={user}
        onAddStory={() => toast.info("Créer une story — à implémenter")}
        onOpenStory={(index: number) => { setActiveStoryIndex(index); setShowStoryViewer(true) }}
      />

      {/* Create Post */}
      <PostComposer user={user} onSubmit={handlePostSubmit} className="mb-4" />

      {/* Posts Feed */}
      {posts.map((post) => (
        <PostCard
          key={post.id}
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
          reacted={post.reacted}
          reactions={post.reactions}
          parentPost={post.parentPost}
          onLike={(reactionId) => handleReaction(post.id, reactionId)}
          onComment={(text, files) => handleComment(post.id, text, files)}
                    onRepost={() => handleRepost(post.id)}
          onRepostWithText={(text) => handleRepostWithText(post.id, text)}
          shareUrl={post.shareUrl || null}
          onDelete={() => handleDelete(post.id)}
          canDelete={!!user && String(post.author?.id) === String(user?.dughu?.userId)}
          onSave={() => handleSave(post.id)}
          onHide={() => handleHide(post.id)}
          isSaved={post.isSaved}
          className="mb-4"
        />
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

      {/* Story Viewer Overlay */}
      {showStoryViewer && stories[activeStoryIndex] && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
          {/* Progress bars */}
          <div className="flex gap-1 p-2 pt-4">
            {stories.map((_: any, i: number) => (
              <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div className={cn("h-full bg-white transition-all duration-300", i < activeStoryIndex ? "w-full" : i === activeStoryIndex ? "w-1/2" : "w-0")} />
              </div>
            ))}
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#A35A2A] flex items-center justify-center text-white text-xs font-bold">
                {stories[activeStoryIndex].user.name?.charAt(0)}
              </div>
              <span className="text-white text-sm font-medium">{stories[activeStoryIndex].user.name}</span>
              <span className="text-white/60 text-xs">{timeAgo(stories[activeStoryIndex].createdAt)}</span>
            </div>
            <button onClick={() => setShowStoryViewer(false)} className="text-white p-2"><X size={24} /></button>
          </div>
          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            {stories[activeStoryIndex].image ? (
              <img src={stories[activeStoryIndex].image} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
            ) : stories[activeStoryIndex].video ? (
              <video src={stories[activeStoryIndex].video} className="max-w-full max-h-full rounded-lg" controls autoPlay />
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-xl p-8 text-center" style={{ background: stories[activeStoryIndex].bg || POST_COLORS[0].bg }}>
                <p className="text-2xl font-bold text-white whitespace-pre-wrap">{stories[activeStoryIndex].text}</p>
              </div>
            )}
          </div>
          {/* Navigation */}
          <div className="absolute inset-y-0 left-0 w-16 flex items-center">
            <button onClick={() => setActiveStoryIndex((i) => Math.max(0, i - 1))} className="text-white/50 hover:text-white p-2"><ChevronLeft size={32} /></button>
          </div>
          <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-end">
            <button onClick={() => setActiveStoryIndex((i) => Math.min(stories.length - 1, i + 1))} className="text-white/50 hover:text-white p-2"><ChevronRight size={32} /></button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}