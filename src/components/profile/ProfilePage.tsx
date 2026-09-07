"use client"

import { SquarePen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Sparkles, Images, Film, Play, UserRound, RefreshCcw, Clapperboard } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { resolveMediaUrl } from "@/lib/dughu"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import { readPostColors, writePostColor } from "@/lib/postColorCache"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import { timeAgo } from "@/lib/helpers"
import { useAuth } from "@/hooks/auth/use-auth"
import { useProfile } from "@/hooks/profile/use-profile"
import { toggleFollow } from "@/services/profile/profile.service"
import { fetchPosts, createPost, addReaction, deletePost, storeSave, hidePost, blockUser } from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { getUserVideos } from "@/services/akwaplay/akwaplayVideo.service"
import type { AkwaVideo } from "@/types/akwaplay/akwaplay.types"
import { useRelation } from "@/hooks/relations/useRelation"
import { ProfileHeader } from "./ProfileHeader"
import { ProfileAbout, type ProfileInfo } from "./ProfileAbout"
import { ProfilePhotos } from "./ProfilePhotos"
import { ProfileVideos } from "./ProfileVideos"
import { ProfileCapsules } from "./ProfileCapsules"
import { ProfileFriends } from "./ProfileFriends"
import { ProfileGroupsPages, type ProfileGroup, type ProfilePage as ProfilePageType } from "./ProfileGroupsPages"
import type { ProfilePhoto } from "./ProfilePhotos"
import type { ProfileVideo } from "./ProfileVideos"
import type { ProfileFriend } from "./ProfileFriends"
import { ImageEditModal } from "./ImageEditModal"
import { PostComposer } from "@/components/composer/PostComposer"
import { EMPTY_PROFILE_RELATIONS, type RelationAction, type RelationType } from "@/types/relations/relation.types"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import FlashViewer from "@/components/flash/FlashViewer"
import { useFlashFeed } from "@/hooks/queries/use-flash"
import { useUserCapsules } from "@/hooks/queries/use-capsules"
// import { EMPTY_PROFILE_RELATIONS, type RelationType } from "@/lib/profile-relations"

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

function PhotoImage({ src, width, height }: { src: string; width: number; height: number }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="w-full h-full bg-[#F0F0F0] flex items-center justify-center">
        <Images size={20} className="text-[#B0B0B0]" />
      </div>
    )
  }
  return (
    <Image src={src} alt="" width={width} height={height} className="w-full h-full object-cover" onError={() => setFailed(true)} />
  )
}

interface Post {
  id: string
  content: string
  image?: string | null
  video?: string | null
  images?: { url: string }[]
  shareUrl?: string | null
  createdAt: string
  author: { id: string; name: string | null; username: string | null; avatar: string | null }
  color?: string | null
  reacted?: string | null
  postPrivacy?: 0 | 1 | 2 | 3
  isSaved?: boolean
  reactions?: { type: string; count: number }[]
  parentPost?: {
    id: string
    author: { id: string; name: string | null; username: string | null; avatar: string | null }
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    timeAgo?: string
  } | null
  _count: { comments: number; likes: number; reposts: number }
}

type Tab = "interactions" | "photos" | "videos" | "capsules" | "apropos"

export function ProfilePage({ target, onSubmitVerification, isVerifying }: { target: { userId?: string; slug?: string }; onSubmitVerification?: () => void; isVerifying?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const [tab, setTab] = useState<Tab>("interactions")
  const [imageEdit, setImageEdit] = useState<null | "avatar" | "cover">(null)
  // Utilisateurs bloqués (état local de session : le libellé « Bloquer » / « Débloquer »
  // du menu 3 points bascule selon cette liste et l'endpoint Dughu fait office de toggle).
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set())
  // Publication en attente de confirmation de suppression (modale au lieu du confirm natif).
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Utilisateur connecté via TanStack Query
  const { data: currentUser } = useAuth()

  // Flash des amis / contacts : détection des auteurs de posts ayant un Flash actif.
  const { data: flashData } = useFlashFeed(currentUser?.id)
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
  // Flash à ouvrir (clic sur la photo de profil d'un auteur ayant un Flash).
  const [flashTarget, setFlashTarget] = useState<{ userId: string; userName?: string | null; userAvatar?: string | null } | null>(null)

  // Profil via TanStack Query
  const dughuUserId = currentUser?.dughu?.userId || ""

  // Résoudre les paramètres de profil UNIQUEMENT quand on a un identifiant valide.
  // Évite d'envoyer une requête avec un userId vide qui retourne "Profil introuvable"
  // avant que l'utilisateur connecté ne soit chargé (self === true).
  const profileParams = target.userId
    ? { userId: target.userId, currentUserId: currentUser?.id, dughuUserId: target.userId === currentUser?.id ? dughuUserId : undefined, viewerDughuUserId: dughuUserId }
    : target.slug
      ? { slug: target.slug, currentUserId: currentUser?.id, viewerDughuUserId: dughuUserId }
      : null

  const hasIdentifier = profileParams !== null

  const {
    data: profileData,
    isLoading: loading,
    isError: notFound,
  } = useProfile(profileParams ?? { userId: "" })
  const profile = profileData ?? null
  const profileQueryKey = ["profile", target.userId ?? target.slug ?? "me"] as const
  const profileId = profile?.user?.id || ""
  const profileDughuId = profile?.user?.dughu?.userId || ""
  const myDughuId = currentUser?.dughu?.userId || ""
  // Un profil est "le mien" si l'id local correspond OU si l'ID Dughu de la
  // cible correspond au mien. Le second test couvre le cas où le username
  // local a divergé du username Dughu (renommé côté Dughu) : la page est alors
  // chargée via le username/slug Dughu et /api/profile ne peut pas relier la
  // cible au compte local (id local inconnu) — comparer les ID Dughu évite
  // d'afficher "Suivre" / "Message" sur son propre profil.
  const isOwn =
    (!!profileId && !!currentUser?.id && profileId === currentUser.id) ||
    (!!profileDughuId && !!myDughuId && profileDughuId === myDughuId)

  const loadPosts = useCallback(async (page: number, reset = false) => {
    if (!profileId) return
    setPostsLoading(true)
    loadingMoreRef.current = true
    try {
      // authorId doit être l'ID Dughu de la cible (user_id attendu par l'endpoint
      // Dughu `userPost`). L'ID local (profileId) ne fonctionne que s'il coïncide
      // avec l'ID Dughu — pour les comptes liés à un utilisateur local dont l'ID
      // diffère, l'API ne renvoie alors aucun post. On privilégie donc l'ID Dughu.
      const authorId = profileDughuId || profileId
      const data = await fetchPosts({
        page,
        userId: currentUser?.id || "",
        dughuUserId,
        authorId,
      })
      if (data.success) {
        const reactionsCache = readMyReactions()
        const colorCache = readPostColors()
        const mapped: Post[] = (data.posts || []).map((p: any) => ({
          ...p,
          timeLabel: timeAgo(p.createdAt),
          reacted: reactionsCache[p.id] || p.reacted || null,
          color: p.color || colorCache[p.id] || null,
          _count: p._count || { comments: 0, likes: 0, reposts: 0 },
          parentPost: p.parentPost
            ? { ...p.parentPost, timeAgo: timeAgo(p.parentPost?.createdAt) }
            : null,
        }))
        if (reset || page === 1) setPosts(mapped)
        else setPosts((prev) => [...prev, ...mapped])
        setHasMore(!!data.hasMore)
      }
    } catch {
      toast.error("Erreur chargement des publications")
    } finally {
      setPostsLoading(false)
      loadingMoreRef.current = false
    }
  }, [currentUser?.id, profileId, profileDughuId])

  useEffect(() => {
    if (profileId) loadPosts(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, currentUser?.id, profileDughuId])

  // Chargement automatique au scroll (infinite scroll, sans bouton "Charger plus")
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || postsLoading || loadingMoreRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !postsLoading && !loadingMoreRef.current) {
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
  }, [hasMore, postsLoading, pageNum, loadPosts])

  const isFollowing = !!profile?.isFollowing

  // Capsules de l'utilisateur du profil (endpoint Dughu /shortsUser/{user_id}).
  // L'ID Dughu de la cible est prioritaire (l'API attend user_id Dughu).
  const { data: userCapsulesData, isLoading: capsulesLoading } = useUserCapsules(
    profileDughuId || profileId || undefined,
    myDughuId || undefined
  )
  const userCapsules = useMemo(() => userCapsulesData ?? [], [userCapsulesData])

  // Vidéos Akwaplay de l'utilisateur (endpoint /akwa_userVideos/{user_id}/{viewer_id})
  const [userAkwaVideos, setUserAkwaVideos] = useState<AkwaVideo[]>([])
  const [akwaVideosLoading, setAkwaVideosLoading] = useState(false)

  useEffect(() => {
    const authorId = profileDughuId || profileId
    if (!authorId) return
    const viewerId = myDughuId || currentUser?.id || authorId
    setAkwaVideosLoading(true)
    getUserVideos(authorId, viewerId, 1)
      .then((res) => {
        setUserAkwaVideos(res.videos || [])
      })
      .catch(() => {})
      .finally(() => setAkwaVideosLoading(false))
  }, [profileDughuId, profileId, myDughuId, currentUser?.id])

  const handleCreatePost = async (data: { content: string; color?: any; images?: File[]; videos?: File[]; audios?: File[]; privacy?: number }) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour publier")
      return
    }
    try {
      const formData = new FormData()
      formData.append("content", data.content)
      formData.append("userId", currentUser.id)
      formData.append("dughuUserId", currentUser?.dughu?.userId || "")
      if (data.privacy != null) formData.append("privacy", String(data.privacy))
      const colorRaw = data.color ? JSON.stringify(data.color) : null
      if (colorRaw) {
        formData.append("color", colorRaw)
        if (data.color.id != null) formData.append("color_id", String(data.color.id))
        if (data.color.color_1) formData.append("color_1", data.color.color_1)
        if (data.color.color_2) formData.append("color_2", data.color.color_2)
        if (data.color.text) formData.append("text_color", data.color.text)
      }
      if (data.images) data.images.forEach((img) => formData.append("images", img))
      if (data.videos) data.videos.forEach((vid) => formData.append("videos", vid))
      if (data.audios) data.audios.forEach((aud) => formData.append("audios", aud))
      const resp = await createPost(formData)
      if (resp.success) {
        // L'API Dughu ne persiste pas la couleur → on la mémorise côté client.
        if (colorRaw && resp.post?.id) writePostColor(String(resp.post.id), colorRaw)
        toast.success("Publication créée !")
        loadPosts(1, true)
        queryClient.invalidateQueries({ queryKey: ["profile", profileId] })
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
    const cache = readMyReactions()
    const previousType = cache[postId] || null

    // - aucune réaction → like (+1)
    // - même réaction → unlike (-1)
    // - autre réaction → changement (compte inchangé)
    let newReacted: string | null
    if (!previousType) newReacted = type
    else if (previousType === type) newReacted = null
    else newReacted = type
    const countDelta = newReacted ? (previousType ? 0 : 1) : -1

    const applyToPost = (fn: (p: any) => any) =>
      setPosts((prev) =>
        prev.map((p) => (p.id !== postId ? p : fn(p)))
      )

    // Mise à jour optimiste (compteur en live + emoji sur le bouton)
    applyToPost((p) => ({
      ...p,
      reacted: newReacted,
      _count: { ...p._count, likes: Math.max(0, p._count.likes + countDelta) },
    }))

    // Persiste la réaction immédiatement (cache local) pour qu'elle survive au rechargement
    const newCache = { ...cache }
    if (newReacted) newCache[postId] = newReacted
    else delete newCache[postId]
    writeMyReactions(newCache)

    try {
      const data = await addReaction({ postId, userId: currentUser.id, type, dughuUserId: currentUser?.dughu?.userId })
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

  const handleComment = async (postId: string, text: string) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour commenter")
      return
    }
    try {
      const data = await addComment({ postId, userId: currentUser.id, content: text, dughuUserId: currentUser?.dughu?.userId })
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
      formData.append("dughuUserId", currentUser?.dughu?.userId || "")
      const data = await createPost(formData)
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

  // Republier en ajoutant un texte d'accompagnement (commentaire).
  const handleRepostWithText = async (postId: string, text: string) => {
    if (!currentUser) {
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
      formData.append("userId", currentUser.id)
      formData.append("dughuUserId", currentUser?.dughu?.userId || "")
      formData.append("content", commentary)
      const data = await createPost(formData)
      if (data.success) {
        toast.success("Repost publié !")
        loadPosts(1, true)
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur repost")
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      const ok = await deletePost(postId)
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Publication supprimée")
        queryClient.invalidateQueries({ queryKey: ["profile", profileId] })
      }
    } catch {
      toast.error("Erreur suppression")
    }
    setDeleteTarget(null)
  }

  const handleSave = async (postId: string) => {
    try {
      const data = await storeSave({ postId, userId: currentUser?.id, dughuUserId: currentUser?.dughu?.userId })
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
        )
        toast.success(data.saved ? "Post enregistré !" : "Enregistrement annulé")
      }
    } catch {
      toast.error("Erreur d'enregistrement")
    }
  }

  const handleHide = async (postId: string) => {
    try {
      const ok = await hidePost({ postId, userId: currentUser?.id, dughuUserId: currentUser?.dughu?.userId })
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post masqué")
      } else {
        toast.error("Erreur lors du masquage")
      }
    } catch {
      toast.error("Erreur lors du masquage")
    }
  }

  const handleBlock = async (authorId: string) => {
    if (!currentUser) { toast.error("Connectez-vous pour bloquer"); return }
    const targetId = String(authorId)
    const isBlocked = blockedAuthors.has(targetId)
    try {
      const data = await blockUser({ authorId: targetId, userId: currentUser?.id, dughuUserId: currentUser?.dughu?.userId })
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
          setPosts((prev) => prev.filter((p) => String(p.author?.id) !== targetId))
        }
      } else {
        toast.error(data.message || "Erreur lors du blocage")
      }
    } catch {
      toast.error("Erreur lors du blocage")
    }
  }

  const followMutation = useMutation({
    mutationFn: async () => {
      const data = await toggleFollow({ userId: currentUser?.id, targetId: profile?.user?.id })
      return data
    },
    onMutate: async () => {
      // Optimistic : toggle immédiatement
      await queryClient.cancelQueries({ queryKey: ["profile", profileId] })
      const prev = queryClient.getQueryData(["profile", profileId])
      queryClient.setQueryData(["profile", profileId], (old: any) => {
        if (!old) return old
        const newFollowing = !old.isFollowing
        return { ...old, isFollowing: newFollowing, stats: { ...old.stats, followers: old.stats.followers + (newFollowing ? 1 : -1) } }
      })
      return { prev }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["profile", profileId], context?.prev)
      toast.error("Erreur lors du suivi")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileId] })
    },
  })

  const handleToggleFollow = () => {
    if (!currentUser || !profile?.user?.id) return
    if (currentUser.id === profile.user.id) return
    followMutation.mutate()
  }

  const { triggerRelationAction, isPending: relationLoading, pendingType } = useRelation()

  const handleRelationAction = (type: RelationType, action: RelationAction) => {
    if (!currentUser || !profileDughuId || isOwn || relationLoading) return
    const currentState = profile?.relations?.[type] ?? "none"
    triggerRelationAction({
      type,
      currentState,
      action,
      targetId: profileDughuId,
      profileQueryKey,
    })
  }

  const profileVideos = profile?.videos
  const videos = useMemo(() => {
    const fromProfile = (profileVideos || []) as ProfileVideo[]
    if (fromProfile.length > 0) return fromProfile
    return (userAkwaVideos || []).map((v) => ({
      id: String(v.id),
      url: v.videoUrl,
      thumb: v.thumbnail,
      views: v.viewsCount,
      createdAt: v.createdAt,
    }))
  }, [profileVideos, userAkwaVideos])

  // Tant qu'aucun identifiant n'est connu (par ex. profil "moi" en attente du
  // chargement de l'utilisateur connecté), on affiche le skeleton au lieu de
  // l'erreur "Profil introuvable".
  if (!hasIdentifier || loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton couverture */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-48 sm:h-64 lg:h-80 w-full animate-pulse bg-gray-200" />
          <div className="relative px-4 pb-6">
            <div className="absolute -top-12 left-4 sm:left-6 w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-lg animate-pulse bg-gray-200" />
            <div className="pt-16 flex-1 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-56 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Skeleton posts */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (notFound || !profile || !profile.user) {
    return (
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center my-8">
        <Image src="/images/avatar.png" alt="" width={80} height={80} className="w-20 h-20 rounded-full mx-auto opacity-40" />
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
  const photos = (profile.photos || []) as ProfilePhoto[]
  const groups = (profile.groups || []) as ProfileGroup[]
  const friends = (profile.friends || []) as ProfileFriend[]

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: "interactions",
      label: "Mes posts",
      icon: <SquarePen size={16} />,
      
    },
    { key: "photos", label: "Photos", icon: <Images size={16} />, count: photos.length },
    { key: "videos", label: "Vidéos", icon: <Film size={16} />, count: videos.length },
    { key: "capsules", label: "Capsules", icon: <Clapperboard size={16} />, count: userCapsules.length },
    { key: "apropos", label: "À propos", icon: <UserRound size={16} /> },
  ]

  return (
    <div className="space-y-4">
      {/* Couverture plein écran mobile/tablette : les marges négatives font
          sortir la carte du padding du conteneur (px-2 / sm:px-4), elle touche
          donc les bords de l'écran ; sur desktop (lg+) elle redevient une carte
          classique. */}
      <div className="-mx-2 sm:-mx-4 lg:mx-0">
        <ProfileHeader
          user={user}
          stats={stats}
          isOwn={isOwn}
          isFollowing={isFollowing}
          relations={profile.relations ?? EMPTY_PROFILE_RELATIONS}
          relationLoadingType={pendingType}
          onToggleFollow={handleToggleFollow}
          onRelationAction={handleRelationAction}
          onMessage={() => {
            if (!currentUser) {
              toast.error("Connectez-vous pour envoyer un message")
              return
            }
            const targetDughuId = profile.user?.dughu?.userId || profile.user?.dughuUserId
            if (!targetDughuId) {
              toast.error("Identifiant Dughu du contact introuvable")
              return
            }
            router.push(`/messages?target=${encodeURIComponent(String(targetDughuId))}`)
          }}
          onEditCover={() => setImageEdit("cover")}
          onEditAvatar={() => setImageEdit("avatar")}
          onEditProfile={() => router.push("/profile/settings")}
          onSubmitVerification={onSubmitVerification}
          isVerifying={isVerifying}
        />
      </div>

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
        <div className="hidden lg:block lg:w-[260px] shrink-0 space-y-4">
          <ProfileAbout
            user={user}
            info={profile.info as ProfileInfo}
            isOwn={isOwn}
            onEdit={isOwn ? () => router.push("/profile/settings") : undefined}
          />
          <ProfilePhotos photos={photos} onSeeAll={() => setTab("photos")} />
          <ProfileVideos videos={videos} onSeeAll={() => setTab("videos")} />
          <ProfileCapsules
            capsules={userCapsules}
            loading={capsulesLoading}
            currentUserId={myDughuId}
            onSeeAll={() => setTab("capsules")}
          />
          <ProfileFriends friends={friends} total={stats.friends} userId={user.id} />
          <ProfileGroupsPages groups={groups} pages={profile.pages as { owned: ProfilePageType[]; liked: ProfilePageType[] } | null | undefined} isOwn={isOwn} />
        </div>

        {/* ═════ CONTENU PRINCIPAL ═════ */}
        <div className="flex-1 min-w-0 space-y-4">
          {tab === "interactions" && (
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
                  images={(post.images || []).map((img) => ({ url: img.url }))}
                  video={(post as any).video}
                  audio={(post as any).audio || null}
                  color={post.color && typeof post.color === "string" ? post.color : post.color ? JSON.stringify(post.color) : null}
                  likesCount={post._count.likes}
                  commentsCount={post._count.comments}
                  sharesCount={post._count.reposts}
                  reacted={post.reacted}
                  reactions={post.reactions}
                  users={(post as any).reactionUsers}
                  parentPost={post.parentPost}
                  onLike={(r) => handleReaction(post.id, r)}
                  postPrivacy={post.postPrivacy}
                  onComment={(text) => handleComment(post.id, text)}
                                    onRepost={() => handleRepost(post.id)}
                  onRepostWithText={(text) => handleRepostWithText(post.id, text)}
                  shareUrl={post.shareUrl || null}
                  onDelete={() => setDeleteTarget(post.id)}
                  canDelete={!!currentUser && String(post.author?.id) === String(currentUser?.dughu?.userId)}
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

              {hasMore && (
                <div ref={loadMoreRef} className="w-full py-3 text-center text-[13px] text-[#65676B]">
                  {postsLoading ? "Chargement..." : "Faites défiler pour voir plus"}
                </div>
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
                  {photos.map((p: any) => {
                    const photoUrl = p.url ? resolveMediaUrl(p.url) : ""
                    return (
                      <a key={p.id} href={`/post/${p.id}`} className="aspect-square overflow-hidden rounded-xl hover:opacity-90 transition">
                        <PhotoImage src={photoUrl || ""} width={300} height={300} />
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "videos" && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Film size={18} className="text-[#A35A2A]" />
                <h3 className="text-[16px] font-bold text-[#2D2D2D]">Toutes les vidéos</h3>
              </div>
              {videos.length === 0 ? (
                <p className="text-center text-[13px] text-[#65676B] py-8">Aucune vidéo pour le moment.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {videos.map((v: any) => {
                    const videoUrl = v.url ? resolveMediaUrl(v.url) : ""
                    const thumbUrl = v.thumb ? resolveMediaUrl(v.thumb) : null
                    return (
                      <div
                        key={v.id}
                        onClick={() => router.push(`/akwaplay/watch?v=${v.id}`)}
                        className="relative aspect-video overflow-hidden rounded-xl bg-black group cursor-pointer"
                      >
                        {thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <video
                            src={videoUrl || ""}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                          <div className="w-12 h-12 rounded-full bg-[#985810] flex items-center justify-center shadow-lg">
                            <Play size={22} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "capsules" && (
            <ProfileCapsules
              capsules={userCapsules}
              loading={capsulesLoading}
              currentUserId={myDughuId}
            />
          )}

          {tab === "apropos" && (
            <div className="space-y-4">
              <ProfileAbout user={user} info={profile.info as ProfileInfo} isOwn={isOwn} onEdit={isOwn ? () => router.push("/profile/settings") : undefined} />
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
              <ProfilePhotos photos={photos} onSeeAll={() => setTab("photos")} />
              <ProfileVideos videos={videos} onSeeAll={() => setTab("videos")} />
              <ProfileCapsules
                capsules={userCapsules}
                loading={capsulesLoading}
                currentUserId={myDughuId}
                onSeeAll={() => setTab("capsules")}
              />
              <ProfileFriends friends={friends} total={stats.friends} userId={user.id} />
              <ProfileGroupsPages groups={groups} pages={profile.pages as { owned: ProfilePageType[]; liked: ProfilePageType[] } | null | undefined} isOwn={isOwn} />
            </div>
          )}
        </div>
      </div>

      {/* Modaux */}
      {/* <EditProfileModal
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={(u) => handleProfileUpdated(u)}
      /> */}
      {/* Confirmation de suppression (vrai popup, pas de confirm() natif) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Supprimer la publication ?"
        description="Cette action est irréversible. Voulez-vous vraiment supprimer cette publication ?"
        confirmLabel="Supprimer"
        onConfirm={() => (deleteTarget ? handleDelete(deleteTarget) : undefined)}
      />

      {/* Visualiseur Flash — ouvert au clic sur la photo de profil d'un auteur ayant un Flash */}
      {flashTarget && (
        <FlashViewer
          key={flashTarget.userId}
          targetUserId={flashTarget.userId}
          userId={currentUser?.id}
          userName={flashTarget.userName}
          userAvatar={flashTarget.userAvatar}
          onClose={() => setFlashTarget(null)}
        />
      )}
      <ImageEditModal
        open={imageEdit === "avatar"}
        type="avatar"
        userId={user.id}
        currentUrl={user.avatar}
        onClose={() => setImageEdit(null)}
        onSaved={(url) => {
          // Mise à jour du cache React Query (= source du useAuth), plus de localStorage.
          const newUser = { avatar: url }
          queryClient.setQueryData(["auth", "me"], newUser)
          // Rafraichir le profil et l'auth
          queryClient.invalidateQueries({ queryKey: ["profile", profileId] })
          queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
        }}
      />
      <ImageEditModal
        open={imageEdit === "cover"}
        type="cover"
        userId={user.id}
        currentUrl={user.cover}
        onClose={() => setImageEdit(null)}
        onSaved={(url) => {
          const newUser = { cover: url }
          queryClient.setQueryData(["auth", "me"], newUser)
          queryClient.invalidateQueries({ queryKey: ["profile", profileId] })
          queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
        }}
      />
    </div>
  )
}
