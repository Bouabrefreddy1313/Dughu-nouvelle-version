"use client"

/**
 * Onglet « Actualité » des espaces — fil global des publications des pages.
 *
 * - Source : GET /api/pages/feed (API Dughu `getPostPageUser/{user_id}`), posts
 *   mappés côté serveur avec le même mapper que le fil principal ;
 * - Réutilise la carte `PostCard` du fil : chaque publication affiche la barre
 *   d'actions complète — J'aime (+ palette de réactions), Commenter, Republier
 *   (simple ou avec texte) et Partager — ainsi que le menu « 3 points »
 *   (enregistrer, masquer, bloquer, supprimer) ;
 * - Interactions identiques au fil : mises à jour optimistes (likes,
 *   commentaires, republications, abonnement, enregistrement) avec rollback ;
 * - Pagination : 5 publications par page, chargement automatique au scroll
 *   (même mécanisme que le fil d'accueil) ;
 * - ⚠️ L'API Dughu ne propose pas de « Je n'aime pas » pour les publications
 *   (seules les capsules en ont un) : la palette de réactions (J'aime, J'adore,
 *   Haha, Wouah, Triste, Énervé) couvre l'ensemble des réactions disponibles.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Newspaper } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  addReaction,
  blockUser,
  createPost,
  deletePost,
  followAuthor,
  hidePost,
  isAbortError,
  rePost,
  storeSave,
} from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { fetchPagesPostsFeed, likePage } from "@/services/pages/pages.service"
import { usePagesList } from "@/hooks/pages/use-pages"
import type { DughuPage } from "@/types/pages/pages.types"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import { timeAgo } from "@/lib/helpers"
import { userMessage } from "@/lib/api/api-error"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

const PostComposer = dynamic(
  () => import("@/components/composer/PostComposer").then((mod) => ({ default: mod.PostComposer })),
  {
    ssr: false,
    loading: () => (
      <div className="mb-6 animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="size-10 rounded-full bg-gray-200" />
          <div className="h-10 flex-1 rounded-full bg-gray-200" />
        </div>
      </div>
    ),
  }
)

const PostCard = dynamic(() => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })), {
  loading: () => (
    <div className="mb-4 animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex gap-3">
        <div className="size-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-3 w-1/4 rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-40 rounded-2xl bg-gray-200" />
    </div>
  ),
})

interface Author {
  id: string
  name: string | null
  username?: string | null
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

export default function PagesFeedTab() {
  // Utilisateur connecté (ID Dughu = source de vérité session, même modèle que
  // la page Mes sauvegardes et le fil).
  const { data: rawUser, isLoading: authLoading } = useAuth()
  const dughuUserId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || "")

  const user = useMemo(
    () =>
      rawUser
        ? {
            ...rawUser,
            id: dughuUserId,
            avatar: rawUser.avatar || "/images/avatar.png",
            image: rawUser.image || "/images/avatar.png",
            cover: rawUser.cover || "/images/group/default-cover.jpg",
            _count: rawUser._count || { posts: 0, followers: 0, following: 0 },
          }
        : null,
    [rawUser, dughuUserId]
  )

  // ── État du fil (même pattern que le fil d'accueil) ─────────────────────────
  const [posts, setPosts] = useState<Post[]>([])
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set())
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(() => new Set())
  const [pageLikedMap, setPageLikedMap] = useState<Record<string, boolean>>({})
  const [pageLikeLoadingMap, setPageLikeLoadingMap] = useState<Record<string, boolean>>({})
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)

  // ── Espaces administrés / possédés pour composer un post ───────────────────
  const adminPagesQuery = usePagesList("administered", { userId: dughuUserId })
  const myPagesQuery = usePagesList("mine", { userId: dughuUserId })

  const userSpaces: DughuPage[] = useMemo(() => {
    const list: DughuPage[] = []
    const seen = new Set<string>()
    for (const p of [...(adminPagesQuery.data?.pages || []), ...(myPagesQuery.data?.pages || [])]) {
      if (p?.pageId && !seen.has(String(p.pageId))) {
        seen.add(String(p.pageId))
        list.push(p)
      }
    }
    return list
  }, [adminPagesQuery.data?.pages, myPagesQuery.data?.pages])

  const composerSpaces = useMemo(() => {
    return userSpaces.map((s) => ({
      id: String(s.pageId),
      name: s.pageTitle || s.pageName,
      avatar: s.avatar || null,
    }))
  }, [userSpaces])

  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("")

  useEffect(() => {
    if (!selectedSpaceId && composerSpaces.length > 0) {
      setSelectedSpaceId(composerSpaces[0].id)
    }
  }, [composerSpaces, selectedSpaceId])

  const activeComposerSpace = useMemo(() => {
    return composerSpaces.find((s) => s.id === selectedSpaceId) || composerSpaces[0] || null
  }, [composerSpaces, selectedSpaceId])

  const handleCreatePagePost = async (data: {
    content: string
    color?: any
    images?: File[]
    videos?: File[]
    audios?: File[]
    privacy?: number
    pageId?: string
  }) => {
    const targetPageId = data.pageId || selectedSpaceId || activeComposerSpace?.id
    if (!targetPageId) {
      toast.error("Veuillez sélectionner un espace pour publier.")
      return
    }

    const formData = new FormData()
    formData.append("content", data.content)
    formData.append("userId", String(user?.id || ""))
    formData.append("dughuUserId", String(user?.dughu?.userId || dughuUserId || ""))
    formData.append("page_id", targetPageId)
    formData.append("pageId", targetPageId)

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

    try {
      const res = await createPost(formData)
      if (res?.success) {
        toast.success("Publication de l'espace créée avec succès !")
        void loadPosts(1, true)
      } else {
        toast.error(res?.message || "Impossible de publier.")
      }
    } catch (error) {
      toast.error(userMessage(error, "Erreur lors de la publication."))
    }
  }

  const loadPosts = useCallback(
    async (page: number, reset = false) => {
      if (!dughuUserId) return
      setLoading(true)
      setErrorMessage(null)
      try {
        const data = await fetchPagesPostsFeed(page)
        if (data.success === false) {
          if (reset) setPosts([])
          setErrorMessage(data.message || "Impossible de charger l'actualité des espaces.")
          return
        }
        const incoming = (data.posts || []) as unknown as Post[]
        setPosts((prev) => {
          if (reset) return incoming
          const seen = new Set(prev.map((p) => p.id))
          return [...prev, ...incoming.filter((p) => p.id && !seen.has(p.id))]
        })
        setPageNum(page)
        setHasMore(!!data.hasMore)
      } catch (error) {
        if (isAbortError(error)) return
        if (reset) setPosts([])
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Impossible de charger l'actualité des espaces."
        )
      } finally {
        setLoading(false)
      }
    },
    [dughuUserId]
  )

  // Chargement initial (et rechargement si l'utilisateur de session change).
  useEffect(() => {
    if (!dughuUserId) return
    // Le chargement du fil est intentionnellement déclenché une fois la
    // session connue (même pattern que le fil d'accueil et la messagerie).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPosts(1, true)
  }, [dughuUserId, loadPosts])

  // Chargement automatique au scroll (comme le fil d'accueil).
  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !loading &&
          hasMore &&
          !loadingMoreRef.current &&
          dughuUserId &&
          !errorMessage
        ) {
          loadingMoreRef.current = true
          loadPosts(pageNum + 1).finally(() => {
            loadingMoreRef.current = false
          })
        }
      },
      { rootMargin: "400px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading, hasMore, pageNum, errorMessage, dughuUserId, loadPosts])

  // ── Like / réactions (même logique que le fil principal) ────────────────────
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
      setPosts((prev) => prev.map((p) => (p.id !== postId ? p : fn(p))))

    // Mise à jour optimiste (compteur en direct + emoji sur le bouton).
    applyToPost((p) => ({
      ...p,
      reacted: newReacted,
      _count: { ...p._count, likes: Math.max(0, (p._count.likes || 0) + countDelta) },
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
        if (newReacted) toast.success(`Réaction ${newReacted} ajoutée`)
      } else {
        toast.error(data.message || "Impossible de réagir à cette publication")
        applyToPost((p) => ({
          ...p,
          reacted: previousType,
          _count: { ...p._count, likes: Math.max(0, (p._count.likes || 0) - countDelta) },
        }))
        writeMyReactions(cache)
      }
    } catch {
      toast.error("Erreur réseau lors de la réaction")
      applyToPost((p) => ({
        ...p,
        reacted: previousType,
        _count: { ...p._count, likes: Math.max(0, (p._count.likes || 0) - countDelta) },
      }))
      writeMyReactions(cache)
    }
  }

  // ── Commentaires ────────────────────────────────────────────────────────────
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
      } else {
        toast.error(data.message || "Erreur commentaire")
      }
    } catch {
      toast.error("Erreur réseau commentaire")
    }
  }

  // ── Republications ──────────────────────────────────────────────────────────
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
        toast.success("Repost effectué !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur repost")
    }
  }

  // Republier en ajoutant un texte d'accompagnement (commentaire).
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
        toast.success("Repost publié !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch {
      toast.error("Erreur repost")
    }
  }

  // ── Abonnement à l'auteur (publications personnelles uniquement) ────────────
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
      setPosts((prev) =>
        prev.map((post) =>
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
        toast.error(userMessage(error, "Impossible de modifier l'abonnement"))
      } finally {
        setFollowingAuthorIds((previous) => {
          const next = new Set(previous)
          next.delete(authorId)
          return next
        })
      }
    },
    [user]
  )

  const handleTogglePageLike = async (targetPageId: string, initialLiked: boolean) => {
    if (!targetPageId || pageLikeLoadingMap[targetPageId]) return
    const currentLiked = pageLikedMap[targetPageId] !== undefined ? pageLikedMap[targetPageId] : initialLiked
    const nextLiked = !currentLiked
    setPageLikeLoadingMap((prev) => ({ ...prev, [targetPageId]: true }))
    setPageLikedMap((prev) => ({ ...prev, [targetPageId]: nextLiked }))

    try {
      const res = await likePage(targetPageId, dughuUserId)
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

  // ── Menu « 3 points » : enregistrer / masquer / bloquer / supprimer ─────────
  const handleSave = async (postId: string) => {
    try {
      const data = await storeSave({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (data.success) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p)))
        toast.success(data.saved ? "Post enregistré !" : "Enregistrement annulé")
      }
    } catch {
      toast.error("Impossible d'enregistrer cette publication")
    }
  }

  const handleHide = async (postId: string) => {
    try {
      const ok = await hidePost({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post masqué")
      }
    } catch {
      toast.error("Impossible de masquer cette publication")
    }
  }

  const handleBlock = async (authorId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour bloquer")
      return
    }
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
          // Retire immédiatement les publications de cet auteur du fil.
          setPosts((prev) => prev.filter((p) => String(p.author?.id) !== targetId))
        }
      } else {
        toast.error(data.message || "Erreur lors du blocage")
      }
    } catch (error) {
      toast.error(userMessage(error, "Erreur lors du blocage"))
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      const ok = await deletePost(postId)
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success("Post supprimé")
      } else {
        toast.error("Impossible de supprimer cette publication")
      }
    } catch {
      toast.error("Erreur suppression")
    }
    setDeleteTarget(null)
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────
  const loadingInitial = authLoading || !dughuUserId || (loading && posts.length === 0)

  if (loadingInitial) {
    return (
      <div className="space-y-6" role="status" aria-label="Chargement de l'actualité des espaces">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex gap-3">
              <div className="size-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-1/4 rounded bg-gray-200" />
              </div>
            </div>
            <div className="h-32 rounded-2xl bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  if (errorMessage && posts.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <p className="text-[#65676B]">{errorMessage}</p>
        <Button onClick={() => void loadPosts(1, true)} className="mt-3 rounded-full bg-[#A35A2A] text-white">
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <>
      {composerSpaces.length > 0 && (
        <div className="mb-6">
          <PostComposer
            user={{
              id: activeComposerSpace ? activeComposerSpace.id : String(user?.id || ""),
              name: activeComposerSpace ? activeComposerSpace.name : (user?.name || ""),
              avatar: activeComposerSpace ? (activeComposerSpace.avatar || null) : (user?.avatar || null),
            }}
            spaces={composerSpaces}
            selectedSpaceId={selectedSpaceId}
            onSpaceSelect={(spId) => setSelectedSpaceId(spId || composerSpaces[0]?.id || "")}
            onSubmit={handleCreatePagePost}
            placeholder={`Publier pour ${activeComposerSpace?.name || "votre espace"}...`}
            className="shadow-sm"
          />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#F5EFE8] text-[#A35A2A]">
            <Newspaper size={28} aria-hidden />
          </span>
          <h3 className="text-base font-bold text-[#2D2D2D]">Aucune publication pour l&apos;instant</h3>
          <p className="mt-1 text-sm text-[#65676B]">Les publications des espaces apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {posts.map((post) => {
          const pageAuthor = post.page as Author | null | undefined
          const isPageAuthor = !!pageAuthor?.id && String(pageAuthor.id) === String(post.author?.id)
          const targetPageId = String(pageAuthor?.id || (post.author as any)?.pageId || (post as any)?.page_id || "")
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
            <div key={post.id} className="mb-6 sm:mb-8">
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
                shareUrl={(post.shareUrl as string) || null}
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
                // L'auteur d'une publication d'espace est une Page : bouton J'aime de l'espace
                // à côté des 3 points, et pas d'abonnement « profil ».
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
                onSave={() => handleSave(post.id)}
                isSaved={!!post.isSaved}
                onHide={() => handleHide(post.id)}
                onBlock={() => handleBlock(post.author?.id)}
                isBlocked={blockedAuthors.has(String(post.author?.id))}
                className="shadow-sm"
              />
            </div>
          )
        })}
      </div>
      )}

      {/* Sentinelle du chargement automatique (page suivante) */}
      {hasMore && (
        <div ref={loadMoreRef} className="min-h-16" aria-hidden>
          {loading && posts.length > 0 && (
            <div className="mt-4 animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex gap-3">
                <div className="size-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/4 rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-28 rounded-2xl bg-gray-200" />
            </div>
          )}
        </div>
      )}

      {/* Erreur de pagination : les publications déjà chargées sont conservées */}
      {errorMessage && posts.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-[#65676B]">{errorMessage}</p>
          <Button
            onClick={() => void loadPosts(pageNum + 1)}
            className="mt-2 rounded-full bg-[#A35A2A] px-4 py-1.5 text-sm text-white"
          >
            Charger plus
          </Button>
        </div>
      )}

      {/* Confirmation de suppression (vrai popup, pas de confirm() natif) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Supprimer la publication ?"
        description="Cette action est irréversible. Voulez-vous vraiment supprimer cette publication ?"
        confirmLabel="Supprimer"
        onConfirm={() => (deleteTarget ? handleDelete(deleteTarget) : undefined)}
      />
    </>
  )
}
