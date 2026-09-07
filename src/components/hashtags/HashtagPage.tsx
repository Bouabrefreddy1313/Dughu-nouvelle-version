"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Hash, StickyNote } from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { PostCard } from "@/components/feed/PostCard"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import FlashViewer from "@/components/flash/FlashViewer"
import { useAuth } from "@/hooks/queries/use-auth"
import { logout } from "@/services/auth/auth.service"
import {
  fetchHashtagPosts,
  addReaction,
  createPost,
  rePost,
  deletePost,
  storeSave,
  hidePost,
  blockUser,
} from "@/services/posts/posts.service"
import { addComment } from "@/services/posts/comments.service"
import { useFlashFeed } from "@/hooks/queries/use-flash"
import { readMyReactions, writeMyReactions } from "@/lib/reactionCache"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import { timeAgo } from "@/lib/helpers"

interface HashtagPageProps {
  tag: string
}

export function HashtagPage({ tag }: HashtagPageProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()

  const user = rawUser
    ? {
        ...rawUser,
        avatar: rawUser.avatar || "/images/avatar.png",
        image: rawUser.image || "/images/avatar.png",
        cover: rawUser.cover || "/images/group/default-cover.jpg",
      }
    : null

  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)
  const feedReqRef = useRef(0)
  // Utilisateurs bloqués (état local de session : le libellé « Bloquer » / « Débloquer »
  // du menu 3 points bascule selon cette liste et l'endpoint Dughu fait office de toggle).
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set())
  // Publication en attente de confirmation de suppression (modale au lieu du confirm natif).
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  // Flash à ouvrir (clic sur la photo de profil d'un auteur ayant un Flash).
  const [flashTarget, setFlashTarget] = useState<{ userId: string; userName?: string | null; userAvatar?: string | null } | null>(null)

  // Flash des amis / contacts : détection des auteurs de posts ayant un Flash actif.
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

  const cleanTag = tag.replace(/^#/, "").trim()

  const loadPosts = useCallback(
    async (page: number, reset = false) => {
      if (!cleanTag) return
      const reqId = ++feedReqRef.current
      setLoading(true)
      try {
        const data = await fetchHashtagPosts(cleanTag, page)
        if (reqId !== feedReqRef.current) return
        if (data.success) {
          const reactionsCache = readMyReactions()
          const mapped = (data.posts || []).map((p: any) => ({
            ...p,
            timeLabel: timeAgo(p.createdAt),
            reacted: reactionsCache[p.id] || p.reacted || null,
            color: p.color || null,
            _count: p._count || { comments: 0, likes: 0, reposts: 0, views: 0 },
            parentPost: p.parentPost
              ? { ...p.parentPost, timeAgo: timeAgo(p.parentPost?.createdAt) }
              : null,
          }))
          if (reset || page === 1) setPosts(mapped)
          else setPosts((prev) => [...prev, ...mapped])
          setHasMore(data.hasMore !== false)
          if ((data.posts || []).length === 0) setHasMore(false)
          if (typeof data.total === "number") setTotal(data.total)
        } else {
          if (page > 1) setHasMore(false)
          toast.error(data.message || "Erreur lors du chargement du hashtag")
        }
      } catch (error) {
        if (page > 1) setHasMore(false)
        console.error("hashtag loadPosts error:", error)
        toast.error("Erreur chargement. Reessayez.")
      } finally {
        loadingMoreRef.current = false
        if (reqId === feedReqRef.current) setLoading(false)
      }
    },
    [cleanTag]
  )

  // Chargement initial / changement de hashtag
  useEffect(() => {
    if (!cleanTag) return
    setPageNum(1)
    loadPosts(1, true)
  }, [cleanTag, loadPosts])

  // Chargement automatique au scroll (infinite scroll)
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

  const handleLogout = () => {
    void logout().finally(() => {
      router.push("/login")
    })
  }

  const handleSearch = (q: string) => {
    if (!q.trim()) return
    router.push(`/searchPosts?searchTerm=${encodeURIComponent(q)}`)
  }

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

    const applyToPost = (fn: (p: any) => any) =>
      setPosts((prev) => prev.map((p) => (p.id !== postId ? p : fn(p))))

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
      const data = await addReaction({ postId, userId: user.id, type: reactionType, dughuUserId: user?.dughu?.userId })
      if (data.success) {
        if (typeof data.count === "number") {
          applyToPost((p) => ({
            ...p,
            reacted: newReacted,
            _count: { ...p._count, likes: data.count },
          }))
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

  const addRepostToFeed = (postId: string, post: any, commentary?: string) => {
    setPosts((prev) => {
      const original = prev.find((p) => p.id === postId)
      return [
        {
          ...post,
          content: commentary || post?.content || "",
          timeLabel: timeAgo(post.createdAt),
          _count: post._count || { comments: 0, likes: 0, reposts: 0, views: 0 },
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
        } as any,
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
      if (data.success) {
        addRepostToFeed(postId, data.post)
        toast.success("Repost effectué !")
      } else {
        toast.error(data.message || "Erreur repost")
      }
    } catch { toast.error("Erreur repost") }
  }

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
      if (data.success) {
        addRepostToFeed(postId, data.post, commentary)
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

  const handleSave = async (postId: string) => {
    try {
      const data = await storeSave({ postId, userId: user?.id, dughuUserId: user?.dughu?.userId })
      if (data.success) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p)))
        toast.success(data.saved ? "Post enregistré !" : "Enregistrement annulé")
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
          setPosts((prev) => prev.filter((p) => String(p.author?.id) !== targetId))
        }
      } else {
        toast.error(data.message || "Erreur lors du blocage")
      }
    } catch {
      toast.error("Erreur lors du blocage")
    }
  }

return (
    <MainLayout user={user} onLogout={handleLogout} onSearch={handleSearch}>
      {/* En-tête du hashtag */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F2F5] text-[#050505] transition hover:bg-gray-200"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#A35A2B]/10">
            <Hash size={26} className="text-[#A35A2B]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold text-[#050505]">
              #{cleanTag}
            </h1>
            <p className="text-[13px] text-[#65676B]">
              {typeof total === "number" ? (
                <>
                  <StickyNote size={13} className="mr-0.5 inline" />
                  {total} publication{total > 1 ? "s" : ""}
                </>
              ) : (
                "Publications avec ce hashtag"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          postId={post.id}
          author={post.author}
          currentUser={user}
          timeAgo={timeAgo(post.createdAt)}
          content={post.content}
          image={post.image || post.images?.[0]?.url}
          images={(post.images || []).map((img: any) => ({ url: img.url }))}
          video={(post as any).video}
          shareUrl={post.shareUrl || null}
          color={(post.color as any) ? (typeof post.color === "string" ? post.color : JSON.stringify(post.color)) : null}
          likesCount={post._count.likes}
          commentsCount={post._count.comments}
          sharesCount={post._count.reposts}
          viewsCount={post.viewsCount ?? post.views_count ?? post._count?.views ?? 0}
          reacted={post.reacted}
          reactions={post.reactions}
          users={(post as any).reactionUsers}
          parentPost={post.parentPost}
          onLike={(reactionId) => handleReaction(post.id, reactionId)}
          onComment={(text, files) => handleComment(post.id, text, files)}
          onRepost={() => handleRepost(post.id)}
          onRepostWithText={(text) => handleRepostWithText(post.id, text)}
          onDelete={() => setDeleteTarget(post.id)}
          canDelete={!!user && String(post.author?.id) === String(user?.dughu?.userId)}
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

      {/* Skeleton premier chargement */}
      {loading && posts.length === 0 && (
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

      {/* Chargement auto au scroll */}
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

      {/* Aucun post */}
      {posts.length === 0 && !loading && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
          <Hash size={36} className="mx-auto mb-3 text-[#A35A2B]" />
          <p className="text-[15px] font-medium text-[#050505]">
            Aucun post avec #{cleanTag} pour l&apos;instant.
          </p>
          <p className="mt-1 text-[13px] text-[#65676B]">
            Soyez le premier à publier avec ce hashtag !
          </p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="mt-4 rounded-full bg-[#A35A2A] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#8B4A1F]"
          >
            Créer une publication
          </button>
        </div>
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

      {/* Visualiseur Flash — ouvert au clic sur la photo de profil d'un auteur ayant un Flash */}
      {flashTarget && (
        <FlashViewer
          key={flashTarget.userId}
          targetUserId={flashTarget.userId}
          userId={user?.id}
          userName={flashTarget.userName}
          userAvatar={flashTarget.userAvatar}
          onClose={() => setFlashTarget(null)}
        />
      )}
    </MainLayout>
  )
}
