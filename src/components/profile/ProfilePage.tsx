"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Sparkles, Images, UserRound, Loader2, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { PostComposer } from "@/components/composer/PostComposer"
import { PostCard } from "@/components/feed/PostCard"
import { ProfileHeader } from "./ProfileHeader"
import { ProfileAbout, type ProfileInfo } from "./ProfileAbout"
import { ProfilePhotos } from "./ProfilePhotos"
import { ProfileFriends } from "./ProfileFriends"
import { ProfileGroupsPages, type ProfileGroup, type ProfilePage as ProfilePageType } from "./ProfileGroupsPages"
import { EditProfileModal } from "./EditProfileModal"
import { ImageEditModal } from "./ImageEditModal"

const REACTION_ID_TO_TYPE: Record<number, string> = {
  1: "like",
  2: "love",
  3: "haha",
  4: "wow",
  5: "sad",
  6: "angry",
}

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

interface Post {
  id: string
  content: string
  image?: string | null
  video?: string | null
  images?: { url: string }[]
  createdAt: string
  author: { id: string; name: string | null; username: string | null; avatar: string | null }
  color?: string | null
  reacted?: string | null
  _count: { comments: number; likes: number; reposts: number }
}

type Tab = "publications" | "photos" | "apropos"

export function ProfilePage({ target }: { target: { userId?: string; slug?: string } }) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [tab, setTab] = useState<Tab>("publications")
  const [editOpen, setEditOpen] = useState(false)
  const [imageEdit, setImageEdit] = useState<null | "avatar" | "cover">(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [profileId, setProfileId] = useState("")

  // Utilisateur connecté depuis localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dughu_user")
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored))
        } catch {
          setCurrentUser(null)
        }
      }
    }
  }, [])

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (target.userId) params.userId = target.userId
      else if (target.slug) params.slug = target.slug
      if (currentUser?.id) params.currentUserId = currentUser.id
      const qs = new URLSearchParams(params).toString()
      const res = await fetch(`/api/profile?${qs}`)
      const data = await res.json()
      if (data.success) {
        setProfile(data)
        setIsFollowing(!!data.isFollowing)
        setNotFound(false)
        setProfileId(data.user.id)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [target.userId, target.slug, currentUser?.id])

  const loadPosts = useCallback(async (page: number, reset = false) => {
    if (!profileId) return
    setPostsLoading(true)
    try {
      const res = await fetch(
        `/api/posts?authorId=${profileId}&userId=${currentUser?.id || ""}&page=${page}`
      )
      const data = await res.json()
      if (data.success) {
        const mapped: Post[] = (data.posts || []).map((p: any) => ({
          ...p,
          timeLabel: timeAgo(p.createdAt),
          _count: p._count || { comments: 0, likes: 0, reposts: 0 },
        }))
        if (reset || page === 1) setPosts(mapped)
        else setPosts((prev) => [...prev, ...mapped])
        setHasMore(!!data.hasMore)
      }
    } catch {
      toast.error("Erreur chargement des publications")
    } finally {
      setPostsLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (currentUser) {
      loadProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, target.userId, target.slug])

  useEffect(() => {
    if (profileId) loadPosts(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, currentUser?.id])

  const isOwn = useMemo(() => {
    return !!(currentUser?.id && profile?.user?.id && currentUser.id === profile.user.id)
  }, [currentUser?.id, profile?.user?.id])

  const handleCreatePost = async (data: { content: string; color?: any; images?: File[]; videos?: File[] }) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour publier")
      return
    }
    try {
      const formData = new FormData()
      formData.append("content", data.content)
      formData.append("userId", currentUser.id)
      if (data.color) formData.append("color", JSON.stringify(data.color))
      if (data.images) data.images.forEach((img) => formData.append("images", img))
      if (data.videos) data.videos.forEach((vid) => formData.append("videos", vid))
      const res = await fetch("/api/posts", { method: "POST", body: formData })
      const resp = await res.json()
      if (resp.success) {
        toast.success("Publication créée !")
        loadPosts(1, true)
        loadProfile()
      } else {
        toast.error(resp.message || "Erreur création")
      }
    } catch {
      toast.error("Erreur réseau")
    }
  }

  const handleReaction = async (postId: string, reactionId?: number) => {
    if (!currentUser) return
    const type = REACTION_ID_TO_TYPE[reactionId || 1] || "like"
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: currentUser.id, type }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, reacted: data.reacted ? type : null, _count: { ...p._count, likes: data.count ?? p._count.likes } }
              : p
          )
        )
      }
    } catch { /* silent */ }
  }

  const handleComment = async (postId: string, text: string) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour commenter")
      return
    }
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: currentUser.id, content: text }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, _count: { ...p._count, comments: (p._count.comments || 0) + 1 } } : p
          )
        )
        toast.success("Commentaire publié !")
      }
    } catch {
      toast.error("Erreur commentaire")
    }
  }

  const handleRepost = async (postId: string) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour republier")
      return
    }
    try {
      const formData = new FormData()
      formData.append("parentId", postId)
      formData.append("userId", currentUser.id)
      const res = await fetch("/api/posts", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        toast.success("Repost effectué !")
        loadPosts(1, true)
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur repost")
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm("Supprimer cette publication ?")) return
    try {
      const res = await fetch(`/api/deletePost/${postId}`, { method: "DELETE" })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Publication supprimée")
        loadProfile()
      }
    } catch {
      toast.error("Erreur suppression")
    }
  }

  const handleToggleFollow = async () => {
    if (!currentUser || !profile) return
    if (currentUser.id === profile.user.id) return
    try {
      const res = await fetch("/api/profile/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, targetId: profile.user.id }),
      })
      const data = await res.json()
      if (data.success) {
        setIsFollowing(data.following)
        setProfile((prev: any) => ({
          ...prev,
          isFollowing: data.following,
          stats: { ...prev.stats, followers: data.followers },
        }))
        toast.success(data.following ? "Vous suivez maintenant ce profil" : "Vous ne suivez plus ce profil")
      }
    } catch {
      toast.error("Erreur réseau")
    }
  }

  const handleProfileUpdated = (updated: any) => {
    setProfile((prev: any) => ({
      ...prev,
      user: { ...prev.user, ...updated },
    }))
    // Mettre à jour localStorage si c'est son propre profil
    if (currentUser) {
      const stored = { ...currentUser, ...updated }
      void stored
      localStorage.setItem("dughu_user", JSON.stringify(stored))
      setCurrentUser(stored)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 size={36} className="text-[#A35A2A] animate-spin" />
        <p className="mt-3 text-[14px] text-[#65676B]">Chargement du profil...</p>
      </div>
    )
  }

  if (notFound || !profile || !profile.user) {
    return (
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center my-8">
        <img src="/images/avatar.png" alt="" className="w-20 h-20 rounded-full mx-auto opacity-40" />
        <p className="mt-4 text-lg font-semibold text-[#050505]">Profil introuvable</p>
        <p className="text-[13px] text-[#65676B] mt-1">Cet utilisateur n'existe pas ou a quitté Dughu.</p>
        <a
          href="/home"
          className="inline-flex mt-5 px-5 py-2 rounded-full bg-[#A35A2A] text-white text-[14px] font-semibold hover:bg-[#8B4A1F] transition"
        >
          Retour à l'accueil
        </a>
      </div>
    )
  }

  const user = profile.user
  const stats = profile.stats || { posts: 0, followers: 0, following: 0, friends: 0 }
  const photos = profile.photos || []
  const groups: ProfileGroup[] = profile.groups || []
  const friends = profile.friends || []

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: "publications",
      label: "Publications",
      icon: <Sparkles size={16} />,
      count: stats.posts,
    },
    { key: "photos", label: "Photos", icon: <Images size={16} />, count: photos.length },
    { key: "apropos", label: "À propos", icon: <UserRound size={16} /> },
  ]

  return (
    <div className="space-y-4">
      <ProfileHeader
        user={user}
        stats={stats}
        isOwn={isOwn}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onMessage={() =>
          currentUser
            ? toast.info("Messagerie — bientôt disponible")
            : toast.error("Connectez-vous pour envoyer un message")
        }
        onEditCover={() => setImageEdit("cover")}
        onEditAvatar={() => setImageEdit("avatar")}
      />

      {/* Onglets façon Facebook */}
      <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] px-2 sm:px-4 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex items-center gap-2 px-3 sm:px-4 py-3 text-[13px] sm:text-[15px] font-medium whitespace-nowrap transition",
              tab === t.key ? "text-[#A35A2A] font-semibold" : "text-[#65676B] hover:bg-[#F0F2F5] rounded-lg"
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="text-[12px] text-[#65676B] font-medium">({t.count})</span>
            )}
            {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#A35A2A] rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
        {/* ═════ COUCHE GAUCHE ═════ */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-4">
          <ProfileAbout
            user={user}
            info={profile.info as ProfileInfo}
            isOwn={isOwn}
            onEdit={isOwn ? () => setEditOpen(true) : undefined}
          />
          <ProfilePhotos photos={photos} onSeeAll={() => setTab("photos")} />
          <ProfileFriends friends={friends} total={stats.friends} userId={user.id} />
          <ProfileGroupsPages groups={groups} pages={profile.pages} isOwn={isOwn} />
        </div>

        {/* ═════ CONTENU PRINCIPAL ═════ */}
        <div className="flex-1 min-w-0 space-y-4">
          {tab === "publications" && (
            <>
              {isOwn && <PostComposer user={currentUser} onSubmit={handleCreatePost} className="mb-0" />}
              {!isOwn && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#A35A2A]">
                    <Sparkles size={18} />
                  </div>
                  <p className="text-[14px] text-[#65676B]">
                    Vous pouvez suivre <span className="font-semibold text-[#050505]">{user.name}</span> pour voir ses publications dans votre fil.
                  </p>
                </div>
              )}

              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  postId={post.id}
                  author={post.author}
                  currentUser={currentUser}
                  timeAgo={timeAgo(post.createdAt)}
                  content={post.content}
                  image={post.image || post.images?.[0]?.url}
                  video={(post as any).video}
                  color={post.color && typeof post.color === "string" ? post.color : post.color ? JSON.stringify(post.color) : null}
                  likesCount={post._count.likes}
                  commentsCount={post._count.comments}
                  sharesCount={post._count.reposts}
                  reacted={post.reacted}
                  onLike={(r) => handleReaction(post.id, r)}
                  onComment={(text) => handleComment(post.id, text)}
                  onRepost={() => handleRepost(post.id)}
                  onShare={() => toast.info("Partage")}
                  onMenuClick={() => toast.info("Menu du post")}
                  className="mb-4"
                />
              ))}

              {postsLoading && (
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
                      <div className="h-28 bg-gray-200 rounded-2xl" />
                    </div>
                  ))}
                </div>
              )}

              {posts.length === 0 && !postsLoading && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                  <p className="text-[15px] text-[#65676B]">Aucune publication.</p>
                  {isOwn && (
                    <p className="text-[13px] text-[#65676B] mt-1">Partagez votre premier message avec votre communauté !</p>
                  )}
                </div>
              )}

              {hasMore && !postsLoading && (
                <button
                  onClick={() => {
                    const p = pageNum + 1
                    setPageNum(p)
                    loadPosts(p)
                  }}
                  className="w-full py-3 text-[#A35A2A] font-medium hover:underline bg-white rounded-3xl shadow-sm border border-gray-100"
                >
                  Charger plus de publications
                </button>
              )}
            </>
          )}

          {tab === "photos" && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Images size={18} className="text-[#A35A2A]" />
                <h3 className="text-[16px] font-bold text-[#2D2D2D]">Toutes les photos</h3>
              </div>
              {photos.length === 0 ? (
                <p className="text-center text-[13px] text-[#65676B] py-8">Aucune photo pour le moment.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((p: any) => (
                    <a key={p.id} href={`/post/${p.id}`} className="aspect-square overflow-hidden rounded-xl hover:opacity-90 transition">
                      <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "apropos" && (
            <div className="space-y-4">
              <ProfileAbout user={user} info={profile.info as ProfileInfo} isOwn={isOwn} onEdit={isOwn ? () => setEditOpen(true) : undefined} />
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-[16px] font-bold text-[#2D2D2D] mb-3">Résumé</h3>
                <ul className="space-y-3 text-[14px] text-[#4A4A4A]">
                  <li className="flex items-center gap-3">
                    <RefreshCcw size={16} className="text-[#65676B]" />
                    {stats.posts} publication{stats.posts > 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-3">
                    <UserRound size={16} className="text-[#65676B]" />
                    {stats.followers} abonné{stats.followers > 1 ? "s" : ""} · {stats.following} abonnement{stats.following > 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-3">
                    <UserRound size={16} className="text-[#65676B]" />
                    {stats.friends} ami{stats.friends > 1 ? "s" : ""}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modaux */}
      <EditProfileModal
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={(u) => handleProfileUpdated(u)}
      />
      <ImageEditModal
        open={imageEdit === "avatar"}
        type="avatar"
        userId={user.id}
        currentUrl={user.avatar}
        onClose={() => setImageEdit(null)}
        onSaved={(url) => {
          setProfile((prev: any) => ({ ...prev, user: { ...prev.user, avatar: url } }))
          if (currentUser) {
            const stored = { ...currentUser, avatar: url }
            localStorage.setItem("dughu_user", JSON.stringify(stored))
            setCurrentUser(stored)
          }
        }}
      />
      <ImageEditModal
        open={imageEdit === "cover"}
        type="cover"
        userId={user.id}
        currentUrl={user.cover}
        onClose={() => setImageEdit(null)}
        onSaved={(url) => {
          setProfile((prev: any) => ({ ...prev, user: { ...prev.user, cover: url } }))
          if (currentUser) {
            const stored = { ...currentUser, cover: url }
            localStorage.setItem("dughu_user", JSON.stringify(stored))
            setCurrentUser(stored)
          }
        }}
      />
    </div>
  )
}