"use client"

import { useDeferredValue, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Heart,
  Loader2,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  ShieldCog,
  Sparkles,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { PostCard } from "@/components/feed/PostCard"
import MainLayout from "@/components/layout/MainLayout"
import { useGroupsFeed } from "@/hooks/groups/use-groups-feed"
import { useUserGroups } from "@/hooks/groups/use-user-groups"
import { useAuth } from "@/hooks/queries/use-auth"
import { userMessage } from "@/lib/api/api-error"
import { REACTION_ID_TO_TYPE } from "@/lib/constants"
import { timeAgo } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { addComment } from "@/services/posts/comments.service"
import {
  addReaction,
  blockUser,
  createPost,
  hidePost,
  rePost,
  storeSave,
} from "@/services/posts/posts.service"
import { GroupCard, type GroupSummary } from "./GroupCard"

type GroupsTab = "news" | "mine" | "managed" | "suggested" | "liked"

const TABS = [
  { id: "news", label: "Actualités", icon: Newspaper },
  { id: "mine", label: "Mes groupes", icon: Users },
  { id: "managed", label: "Groupes administrés", icon: ShieldCog },
  { id: "suggested", label: "Groupes suggérés", icon: Sparkles },
  { id: "liked", label: "Groupes aimés", icon: Heart },
] satisfies { id: GroupsTab; label: string; icon: typeof Newspaper }[]

const SUGGESTED_GROUPS: GroupSummary[] = [
  { id: "jordans-group", name: "Jordan's group", category: "Autre", membersCount: 7, avatar: "/images/group/default-avatar.jpg" },
  { id: "les-varans", name: "Les varans", category: "Divertissement", membersCount: 7 },
  { id: "boy-djinne", name: "Boy djinné", category: "Autre", membersCount: 12, avatar: "/images/avatars/f-avatar.jpg" },
]

const LIKED_GROUPS: GroupSummary[] = [
  { id: "allo", name: "Allo", category: "Éducation", membersCount: 3, cover: "/images/dughu.jpg" },
  { id: "warriors", name: "Warriors", category: "Sport", membersCount: 9, cover: "/images/dughu.jpg" },
  { id: "mon-foyer-en-danger", name: "Mon foyer en danger", category: "Les gens et les Nations", membersCount: 57, cover: "/images/dughu.jpg" },
]

export default function GroupsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: user } = useAuth()
  const [activeTab, setActiveTab] = useState<GroupsTab>(searchParams.get("tab") === "mine" ? "mine" : "news")
  const [search, setSearch] = useState("")
  const deferredSearchTerm = useDeferredValue(search.trim())
  const deferredSearch = deferredSearchTerm.toLocaleLowerCase("fr")
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(() => new Set())
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => new Set())
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<Set<string>>(() => new Set())
  const groupFeed = useGroupsFeed(deferredSearchTerm, activeTab === "news")
  const userGroups = useUserGroups(deferredSearchTerm, activeTab === "mine")

  const groups = activeTab === "suggested" ? SUGGESTED_GROUPS : activeTab === "liked" ? LIKED_GROUPS : []
  const filteredGroups = groups.filter((group) =>
    `${group.name} ${group.category}`.toLocaleLowerCase("fr").includes(deferredSearch)
  )
  const myGroups = Array.from(
    new Map(
      (userGroups.data?.pages.flatMap((page) => page.groups) || []).map((group) => [group.id, group])
    ).values()
  )
  const groupPosts = Array.from(
    new Map(
      (groupFeed.data?.pages.flatMap((page) => page.posts) || []).map((post) => [post.id, post])
    ).values()
  ).filter((post) => !hiddenPostIds.has(post.id) && !blockedAuthorIds.has(post.author.id))

  const userId = String(user?.id || "")
  const dughuUserId = String(user?.dughu?.userId || "")

  const refreshGroupFeed = () => groupFeed.refetch()

  const handleReaction = async (postId: string, reactionId = 1) => {
    if (!userId) {
      toast.error("Connectez-vous pour réagir à cette publication.")
      return
    }
    try {
      const result = await addReaction({
        postId,
        userId,
        dughuUserId,
        type: REACTION_ID_TO_TYPE[reactionId] || "like",
      })
      if (!result.success) throw new Error()
      await refreshGroupFeed()
    } catch (error) {
      toast.error(userMessage(error, "Impossible de réagir à cette publication."))
      throw error
    }
  }

  const handleComment = async (postId: string, content: string, files?: File[]) => {
    if (!userId) {
      toast.error("Connectez-vous pour commenter.")
      return
    }
    const formData = new FormData()
    formData.append("postId", postId)
    formData.append("userId", userId)
    formData.append("dughuUserId", dughuUserId)
    formData.append("content", content)
    files?.forEach((file) => formData.append("files", file))
    try {
      const result = await addComment(formData)
      if (!result.success) throw new Error()
      toast.success("Commentaire publié.")
      await refreshGroupFeed()
    } catch (error) {
      toast.error(userMessage(error, "Impossible de publier le commentaire."))
      throw error
    }
  }

  const handleRepost = async (postId: string, commentary?: string) => {
    if (!userId) {
      toast.error("Connectez-vous pour republier.")
      return
    }
    const formData = new FormData()
    formData.append("parentId", postId)
    formData.append("userId", userId)
    formData.append("dughuUserId", dughuUserId)
    if (commentary?.trim()) formData.append("postText", commentary.trim())
    try {
      const result = commentary?.trim() ? await rePost(formData) : await createPost(formData)
      if (!result.success) throw new Error()
      toast.success("Publication repartagée.")
      await refreshGroupFeed()
    } catch (error) {
      toast.error(userMessage(error, "Impossible de republier."))
    }
  }

  const handleSave = async (postId: string) => {
    try {
      const result = await storeSave({ postId, userId, dughuUserId })
      if (!result.success) throw new Error()
      toast.success(result.saved ? "Publication enregistrée." : "Enregistrement annulé.")
      await refreshGroupFeed()
    } catch (error) {
      toast.error(userMessage(error, "Impossible de modifier l’enregistrement."))
    }
  }

  const handleHide = async (postId: string) => {
    const previous = new Set(hiddenPostIds)
    setHiddenPostIds((current) => new Set(current).add(postId))
    const success = await hidePost({ postId, userId, dughuUserId })
    if (success) {
      toast.success("Publication masquée.")
    } else {
      setHiddenPostIds(previous)
      toast.error("Impossible de masquer cette publication.")
    }
  }

  const handleBlock = async (authorId: string) => {
    try {
      const result = await blockUser({ authorId, userId, dughuUserId })
      if (!result.success) throw new Error()
      setBlockedAuthorIds((current) => new Set(current).add(authorId))
      toast.success("Utilisateur bloqué.")
    } catch (error) {
      toast.error(userMessage(error, "Impossible de bloquer cet utilisateur."))
    }
  }

  const handleJoin = (group: GroupSummary) => {
    setJoinedGroupIds((current) => {
      const next = new Set(current)
      next.add(group.id)
      return next
    })
    toast.success(`Vous avez adhéré à ${group.name}.`, {
      description: "Cette adhésion est conservée uniquement dans cette démonstration.",
    })
  }

  return (
    <MainLayout user={user} active="groups" wide noRightSidebar>
      <section className="mx-auto w-full max-w-[1100px] py-2 sm:py-4" aria-labelledby="groups-title">
        <div className="flex items-center justify-between gap-3 px-1">
          <h1 id="groups-title" className="text-xl font-bold text-[#2D2D2D] sm:text-2xl">Groupes</h1>
          <button
            type="button"
            onClick={() => router.push("/groups/create")}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#6B3F1D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4E2A14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C47830]"
          >
            <Plus size={18} aria-hidden="true" />
            <span>Créer un groupe</span>
          </button>
        </div>

        <div className="mt-4 border-b border-[#E4E6EB]" role="tablist" aria-label="Sections des groupes">
          {/* flex-nowrap + overflow-x-auto : les onglets restent sur une ligne et
              sont scrollables horizontalement au doigt sur mobile. */}
          <div className="flex flex-nowrap snap-x snap-mandatory overflow-x-auto scrollbar-hide touch-pan-x">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={`groups-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="groups-tabpanel"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex min-h-16 shrink-0 min-w-[72px] snap-start sm:flex-1 flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#65676B] transition hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#6B3F1D] sm:min-w-34",
                    isActive && "text-[#8A4D23] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#C47830]"
                  )}
                >
                  <Icon size={21} aria-hidden="true" />
                  <span className={cn("max-w-30 text-center leading-tight", !isActive && "sr-only sm:not-sr-only")}>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Rechercher un groupe</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C47830]" size={19} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un groupe..."
            className="min-h-12 w-full rounded-full border border-transparent bg-[#ECEDEF] py-3 pl-12 pr-4 text-sm text-[#2D2D2D] outline-none transition placeholder:text-[#777B80] focus:border-[#C47830] focus:bg-white focus:ring-2 focus:ring-[#C47830]/20"
          />
        </label>

        <div
          id="groups-tabpanel"
          role="tabpanel"
          aria-labelledby={`groups-tab-${activeTab}`}
          className="mt-5"
        >
          {activeTab === "news" && (
            <div className="mx-auto max-w-[820px] space-y-3 sm:space-y-4">
              {groupFeed.isPending ? (
                <GroupFeedSkeleton />
              ) : groupFeed.isError ? (
                <div className="rounded-xl bg-white px-6 py-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]" role="alert">
                  <p className="text-sm text-[#65676B]">Impossible de charger les actualités des groupes.</p>
                  <button
                    type="button"
                    onClick={() => void groupFeed.refetch()}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#6B3F1D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4E2A14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C47830]"
                  >
                    <RefreshCw size={17} aria-hidden="true" />
                    Réessayer
                  </button>
                </div>
              ) : groupPosts.length > 0 ? (
                <>
                  {groupPosts.map((post) => {
                    const images = post.media.filter((media) => media.type === "image")
                    const video = post.media.find((media) => media.type === "video")
                    const audio = post.media.find((media) => media.type === "audio")
                    const color = post.color ? JSON.stringify({
                      color_1: post.color.background,
                      color_2: post.color.backgroundSecondary,
                      text_color: post.color.text,
                    }) : null

                    return (
                      <PostCard
                        key={post.id}
                        postId={post.id}
                        author={post.author}
                        group={post.group}
                        currentUser={user}
                        timeAgo={timeAgo(post.createdAt)}
                        content={post.content}
                        image={images[0]?.url || video?.thumbnail || undefined}
                        images={images.map((media) => ({ id: media.id, url: media.url }))}
                        video={video?.url}
                        audio={audio?.url}
                        color={color}
                        likesCount={post.likesCount}
                        commentsCount={post.commentsCount}
                        sharesCount={post.sharesCount + post.repostsCount}
                        viewsCount={post.viewsCount ?? (post as any).views_count ?? 0}
                        reacted={post.reactionType}
                        reactions={post.reactions}
                        users={(post as any).reactionUsers}
                        postPrivacy={Number(post.privacy) as 0 | 1 | 2 | 3}
                        shareUrl={post.shareUrl}
                        isFollowing={post.author.isFollowing}
                        isSaved={post.isSaved}
                        canDelete={userId === post.author.id}
                        onLike={(reactionId) => handleReaction(post.id, reactionId)}
                        onComment={(content, files) => handleComment(post.id, content, files)}
                        onRepost={() => handleRepost(post.id)}
                        onRepostWithText={(content) => handleRepost(post.id, content)}
                        onSave={() => handleSave(post.id)}
                        onHide={() => handleHide(post.id)}
                        onBlock={() => handleBlock(post.author.id)}
                        className="rounded-xl"
                      />
                    )
                  })}
                  {groupFeed.hasNextPage && (
                    <div className="flex justify-center py-3">
                      <button
                        type="button"
                        onClick={() => void groupFeed.fetchNextPage()}
                        disabled={groupFeed.isFetchingNextPage}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#C47830]/30 bg-white px-5 py-2 text-sm font-semibold text-[#8A4D23] transition hover:bg-[#C47830]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3F1D] disabled:cursor-wait disabled:opacity-60"
                      >
                        {groupFeed.isFetchingNextPage && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
                        {groupFeed.isFetchingNextPage ? "Chargement..." : "Afficher plus"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <GroupsEmptyState icon={Search} message={deferredSearchTerm ? "Aucune actualité ne correspond à votre recherche." : "Aucune actualité de groupe public pour le moment."} />
              )}
            </div>
          )}

          {activeTab === "managed" && <GroupsEmptyState icon={ShieldCog} message="Aucun groupe trouvé." />}

          {activeTab === "mine" && (
            userGroups.isPending ? (
              <GroupGridSkeleton />
            ) : userGroups.isError ? (
              <GroupsErrorState message="Impossible de charger vos groupes." onRetry={() => void userGroups.refetch()} />
            ) : myGroups.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {myGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={{
                        id: group.id,
                        name: group.name,
                        category: group.category,
                        membersCount: group.membersCount,
                        cover: group.cover,
                        avatar: group.avatar,
                        privacy: group.privacy,
                      }}
                    />
                  ))}
                </div>
                {userGroups.hasNextPage && (
                  <GroupsLoadMore
                    loading={userGroups.isFetchingNextPage}
                    onClick={() => void userGroups.fetchNextPage()}
                  />
                )}
              </>
            ) : (
              <GroupsEmptyState icon={Users} message={deferredSearchTerm ? "Aucun groupe ne correspond à votre recherche." : "Vous n’avez rejoint aucun groupe."} />
            )
          )}

          {activeTab === "liked" && (
            filteredGroups.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredGroups.map((group) => <GroupCard key={group.id} group={group} />)}
              </div>
            ) : <GroupsEmptyState icon={Search} message="Aucun groupe ne correspond à votre recherche." />
          )}

          {activeTab === "suggested" && (
            filteredGroups.length > 0 ? (
              <div className="mx-auto max-w-[820px] space-y-4">
                {filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    variant="suggested"
                    onJoin={joinedGroupIds.has(group.id) ? undefined : handleJoin}
                    joined={joinedGroupIds.has(group.id)}
                  />
                ))}
              </div>
            ) : <GroupsEmptyState icon={Search} message="Aucun groupe ne correspond à votre recherche." />
          )}
        </div>
      </section>
    </MainLayout>
  )
}

function GroupFeedSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement des actualités des groupes">
      {[1, 2].map((item) => (
        <div key={item} className="overflow-hidden rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-7 w-36 rounded-full" />
          <Skeleton className="mt-4 h-64 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function GroupGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Chargement de vos groupes">
      {[1, 2, 3].map((item) => (
        <div key={item} className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <Skeleton className="h-30 w-full rounded-none" />
          <div className="flex items-center gap-3 p-4">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl bg-white px-6 py-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]" role="alert">
      <p className="text-sm text-[#65676B]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#6B3F1D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4E2A14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C47830]"
      >
        <RefreshCw size={17} aria-hidden="true" />
        Réessayer
      </button>
    </div>
  )
}

function GroupsLoadMore({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center py-5">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#C47830]/30 bg-white px-5 py-2 text-sm font-semibold text-[#8A4D23] transition hover:bg-[#C47830]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3F1D] disabled:cursor-wait disabled:opacity-60"
      >
        {loading && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
        {loading ? "Chargement..." : "Afficher plus"}
      </button>
    </div>
  )
}

function GroupsEmptyState({ icon: Icon, message }: { icon: typeof Search; message: string }) {
  return (
    <div className="flex min-h-100 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[#ECEDEF] text-[#65676B]">
        <Icon size={32} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm text-[#65676B]">{message}</p>
    </div>
  )
}
