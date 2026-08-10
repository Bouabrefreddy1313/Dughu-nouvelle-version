"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { PostComposer } from "@/components/composer/PostComposer"
import { PostCard } from "@/components/feed/PostCard"
import MiniStories from "@/components/stories/MiniStories"
import MainLayout from "@/components/layout/MainLayout"

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

interface ReactionTypeDef {
  id: number
  name: string
  icon: string
  color: string
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
  _count: { comments: number; likes: number; reposts: number; views: number }
  timeLabel?: string
  isBoosted?: boolean
  isPinned?: boolean
  isHidden?: boolean
  commentsDisabled?: boolean
  sensitive?: boolean
  parentPost?: Post | null
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
   HELPERS
   ============================================================ */

  const REACTIONS: ReactionTypeDef[] = [
    { id: 1, name: "J'aime", icon: "👍", color: "#1877F2" },
    { id: 2, name: "J'adore", icon: "❤️", color: "#E4405F" },
    { id: 3, name: "Haha", icon: "😂", color: "#F5C33B" },
    { id: 4, name: "Wow", icon: "😮", color: "#F5A33B" },
    { id: 5, name: "Triste", icon: "😢", color: "#F5A33B" },
    { id: 6, name: "Grrr", icon: "😡", color: "#E4405F" },
  ]

  // Mapping entre les IDs de réaction du composant et les types de l'API
  const REACTION_ID_TO_TYPE: Record<number, string> = {
    1: "like",
    2: "love",
    3: "haha",
    4: "wow",
    5: "sad",
    6: "angry",
  }

const COLORS = [
  { bg: "linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #a18cd1 0%, #fbc2eb 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #84fab0 0%, #8fd3f4 100%)", text: "#fff" },
  { bg: "#B87333", text: "#fff" },
  { bg: "linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)", text: "#333" },
  { bg: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)", text: "#fff" },
  { bg: "#F5C33B", text: "#333" },
  { bg: "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)", text: "#fff" },
  { bg: "#333", text: "#fff" },
  { bg: "linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)", text: "#333" },
  { bg: "linear-gradient(45deg, #fa709a 0%, #fee140 100%)", text: "#fff" },
]

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d}j`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `il y a ${mo} mois`
  return `il y a ${Math.floor(mo / 12)} an(s)`
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

function classNames(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ")
}

/* ============================================================
   PAGE PRINCIPALE
   ============================================================ */

export default function HomePage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<"all" | "following">("all")
  const [user, setUser] = useState<any>(null)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [coloredPosts, setColoredPosts] = useState<any[]>(COLORS)
  const [chatOpen, setChatOpen] = useState(false)

  // Récupérer user depuis localStorage (en attendant NextAuth session complète)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dughu_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        // S'assurer que les champs avatar et cover ont des valeurs par défaut
        const updatedUser = {
          ...parsed,
          avatar: parsed.avatar || '/images/avatar.png',
          image: parsed.image || '/images/avatar.png',
          cover: parsed.cover || '/images/group/default-cover.jpg',
          _count: parsed._count || { posts: 0, followers: 0, following: 0 },
        }
        setUser(updatedUser)
        // Mettre à jour le localStorage avec les valeurs par défaut
        localStorage.setItem("dughu_user", JSON.stringify(updatedUser))
      }
    }
  }, [])

  // Charger posts
  const loadPosts = useCallback(async (page: number, reset = false) => {
    setLoading(true)
    try {
      const userId = user?.id || ""
      console.log("Loading posts with userId:", userId, "user:", user?.name)
      const res = await fetch(`/api/posts?page=${page}&filter=${filter}&userId=${userId}`)
      const data = await res.json()
      if (data.success) {
        const mapped = (data.posts || []).map((p: any) => ({
          ...p,
          timeLabel: timeAgo(p.createdAt),
          _count: p._count || { comments: 0, likes: 0, reposts: 0, views: 0 },
        }))
        if (reset || page === 1) setPosts(mapped)
        else setPosts((prev) => [...prev, ...mapped])
        if ((data.posts || []).length < 10) setHasMore(false)
      }
    } catch {
      toast.error("Erreur chargement posts")
    } finally {
      setLoading(false)
    }
  }, [filter, user])

  // Charger stories
  const loadStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories")
      const data = await res.json()
      if (data.success) setStories(data.stories || [])
    } catch { /* silent */ }
  }, [])

  // Recharger les posts quand l'utilisateur est chargé depuis localStorage
  useEffect(() => { loadPosts(1, true) }, [loadPosts])
  useEffect(() => { loadStories() }, [loadStories])

  const handleCreatePost = async (formData: FormData) => {
    if (!user) { toast.error("Connectez-vous pour publier"); return }
    try {
      const res = await fetch("/api/posts", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) => [{ ...data.post, timeLabel: timeAgo(data.post.createdAt), _count: { comments: 0, likes: 0, reposts: 0, views: 0 } }, ...prev])
        toast.success("Publication créée !")
      }
    } catch {
      toast.error("Erreur création post")
    }
  }

  const handleReaction = async (postId: string, reactionId?: number) => {
    if (!user) return
    const reactionType = REACTION_ID_TO_TYPE[reactionId || 1] || "like"
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: user.id, type: reactionType }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) => prev.map((p) => {
          if (p.id !== postId) return p
          const newReacted = data.reacted ? reactionType : null
          const newCount = data.count ?? p._count.likes
          return { ...p, reacted: newReacted, likes: p.likes, _count: { ...p._count, likes: newCount } }
        }))
      }
    } catch { }
  }

  const handleComment = async (postId: string, text: string) => {
    if (!user) { toast.error("Connectez-vous pour commenter"); return }
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: user.id, content: text }),
      })
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

  const handleRepost = async (postId: string) => {
    if (!user) { toast.error("Connectez-vous pour republier"); return }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", user.id)
      const res = await fetch("/api/posts", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, _count: { ...p._count, reposts: (p._count.reposts || 0) + 1 } }
            : p
        ))
        toast.success("Repost effectué !")
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
      const res = await fetch(`/api/togglePinStatus/${postId}`, { method: "POST" })
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
        body: JSON.stringify({ postId, userId: user?.id }),
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
        body: JSON.stringify({ postId, userId: user?.id }),
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

  const handlePostSubmit = async (data: { content: string; color?: any; images?: File[]; videos?: File[] }) => {
    const formData = new FormData()
    formData.append("content", data.content)
    formData.append("userId", user?.id)
    if (data.color) formData.append("color", JSON.stringify(data.color))
    if (data.images) data.images.forEach((img) => formData.append("images", img))
    if (data.videos) data.videos.forEach((vid) => formData.append("videos", vid))
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
          video={post.video?.url || (post as any).video}
          color={(post.color as any) ? (typeof post.color === "string" ? post.color : JSON.stringify(post.color)) : null}
          likesCount={post._count.likes}
          commentsCount={post._count.comments}
          sharesCount={post._count.reposts}
          reacted={post.reacted}
          onLike={(reactionId) => handleReaction(post.id, reactionId)}
          onComment={(text) => handleComment(post.id, text)}
          onRepost={() => handleRepost(post.id)}
          onShare={() => toast.info("Partage")}
          onMenuClick={() => toast.info("Menu du post")}
          className="mb-4"
        />
      ))}

      {/* Skeleton Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
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

      {/* Load More */}
      {hasMore && !loading && (
        <button
          onClick={() => { const p = pageNum + 1; setPageNum(p); loadPosts(p) }}
          className="w-full py-3 text-[#A35A2A] font-medium hover:underline bg-white rounded-3xl shadow-sm border border-gray-100"
        >
          Charger plus de posts
        </button>
      )}

      

      {posts.length === 0 && !loading && (
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
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div className={classNames("h-full bg-white transition-all duration-300", i < activeStoryIndex ? "w-full" : i === activeStoryIndex ? "w-1/2" : "w-0")} />
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
              <div className="w-full h-full flex items-center justify-center rounded-xl p-8 text-center" style={{ background: stories[activeStoryIndex].bg || COLORS[0].bg }}>
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