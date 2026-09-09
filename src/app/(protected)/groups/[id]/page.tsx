"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Globe, Lock, Plus, Share2, Users, Check, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useGroupsFeed } from "@/hooks/groups/use-groups-feed"
import { PostCard } from "@/components/feed/PostCard"
import { timeAgo } from "@/lib/helpers"
import { Skeleton } from "@/components/ui/skeleton"

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = String(params?.id || "")
  const { data: user } = useAuth()
  const [joined, setJoined] = useState(false)

  // Charge le feed des groupes
  const groupFeed = useGroupsFeed("", true)

  const groupPosts = (groupFeed.data?.pages.flatMap((page) => page.posts) || [])
    .filter((post) => post.group?.id === groupId || !groupId || post.group?.name?.toLowerCase().includes(groupId.toLowerCase()))

  const handleToggleJoin = () => {
    setJoined((prev) => !prev)
    toast.success(joined ? "Vous avez quitté le groupe." : "Vous avez rejoint le groupe !")
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Groupe sur Dughu`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Lien du groupe copié dans le presse-papier !")
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <MainLayout user={user} active="groups" wide noRightSidebar>
      <div className="mx-auto w-full max-w-[900px] py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Bouton retour */}
        <button
          type="button"
          onClick={() => router.push("/groups")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#65676B] hover:text-[#8B5E34] transition active:scale-95"
        >
          <ArrowLeft size={18} />
          Retour aux groupes
        </button>

        {/* Bannière et En-tête du Groupe */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E1E1E] shadow-sm border border-[#E5E5E5] dark:border-white/10">
          {/* Couverture */}
          <div className="relative h-44 sm:h-64 w-full bg-[#F0F2F5] dark:bg-[#2A2A2A]">
            <Image
              src="/images/group/default-cover.jpg"
              alt="Couverture du groupe"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Profil du groupe sous la couverture */}
          <div className="p-4 sm:p-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              <div className="flex items-end gap-3.5">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border-4 border-white dark:border-[#1E1E1E] shadow-md bg-white">
                  <Image
                    src="/images/group/default-avatar.jpg"
                    alt="Avatar du groupe"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1C1E21] dark:text-[#F3F4F6] truncate">
                    {groupId ? decodeURIComponent(groupId).replace(/[-_]/g, " ") : "Groupe Dughu"}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#65676B] dark:text-[#A1A1AA]">
                    <span className="flex items-center gap-1">
                      <Globe size={13} />
                      Groupe public
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      Communauté active
                    </span>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleJoin}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition active:scale-95 shadow-sm ${
                    joined
                      ? "bg-[#F0F2F5] dark:bg-[#2A2A2A] text-[#1C1E21] dark:text-[#F3F4F6] hover:bg-[#E4E6EB]"
                      : "bg-[#8B5E34] text-white hover:bg-[#734A26]"
                  }`}
                >
                  {joined ? (
                    <>
                      <Check size={16} />
                      Membre
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Rejoindre
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2.5 rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] text-[#1C1E21] dark:text-[#F3F4F6] hover:bg-[#E4E6EB] transition active:scale-95"
                  title="Partager le groupe"
                  aria-label="Partager le groupe"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <p className="text-sm text-[#65676B] dark:text-[#A1A1AA] max-w-2xl leading-relaxed">
              Bienvenue sur la communauté officielle de ce groupe sur Dughu. Échangez, partagez des actualités et découvrez les publications de tous les membres.
            </p>
          </div>
        </div>

        {/* Publications du Groupe */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-[#1C1E21] dark:text-[#F3F4F6] flex items-center gap-2">
              <MessageSquare size={18} className="text-[#8B5E34]" />
              Discussions & Publications
            </h2>
          </div>

          {groupFeed.isPending ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-[#1E1E1E] p-4 border border-[#E5E5E5] dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : groupPosts.length > 0 ? (
            <div className="space-y-4">
              {groupPosts.map((post) => {
                const images = post.media.filter((m) => m.type === "image")
                const video = post.media.find((m) => m.type === "video")
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
                    likesCount={post.likesCount}
                    commentsCount={post.commentsCount}
                  />
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] p-8 text-center border border-[#E5E5E5] dark:border-white/10 space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5E34]/10 text-[#8B5E34]">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-sm font-semibold text-[#1C1E21] dark:text-[#F3F4F6]">Aucune publication pour le moment</h3>
              <p className="text-xs text-[#65676B] dark:text-[#A1A1AA] max-w-sm mx-auto">
                Soyez le premier à partager une publication dans ce groupe !
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
