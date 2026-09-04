"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  BadgeCheck,
  Check,
  Globe,
  Lock,
  MessageCircle,
  Plus,
  ThumbsUp,
  Users,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardContent,
} from "@/components/ui/preview-card"
import Avatar from "@/components/common/Avatar"
import FollowButton from "@/components/common/FollowButton"
import { useProfile } from "@/hooks/profile/use-profile"
import { fetchPageDetail, likePage } from "@/services/pages/pages.service"
import { resolveMediaUrl } from "@/lib/dughu"
import { cn } from "@/lib/utils"

export type EntityType = "user" | "page" | "group"

export interface UserEntityData {
  id: string
  name: string | null
  avatar: string | null
  username?: string | null
  verified?: boolean
  cover?: string | null
  isFollowing?: boolean
  isFollowLoading?: boolean
  onToggleFollow?: () => void
}

export interface PageEntityData {
  pageId: string
  name: string | null
  avatar: string | null
  verified?: boolean
  cover?: string | null
  categoryName?: string | null
  likeCount?: number
  isLiked?: boolean
}

export interface GroupEntityData {
  id: string
  name: string
  slug?: string | null
  avatar?: string | null
  cover?: string | null
  membersCount?: number
  privacy?: "public" | "private"
  category?: string
}

interface EntityPreviewCardProps {
  type: EntityType
  userData?: UserEntityData
  pageData?: PageEntityData
  groupData?: GroupEntityData
  currentUser?: {
    id?: string
    name?: string | null
    avatar?: string | null
    dughu?: { userId?: string | number }
  }
  children: React.ReactNode
  /** Classes CSS sur le trigger (wrapper du nom) */
  triggerClassName?: string
}

export function EntityPreviewCard({
  type,
  userData,
  pageData,
  groupData,
  currentUser,
  children,
  triggerClassName,
}: EntityPreviewCardProps) {
  const [open, setOpen] = React.useState(false)

  // Trigger content avec le bon wrapper
  return (
    <PreviewCard open={open} onOpenChange={setOpen}>
      <PreviewCardTrigger
        delay={250}
        closeDelay={200}
        render={(props) => (
          <span
            {...props}
            className={cn("inline-flex items-center align-baseline", triggerClassName)}
          >
            {children}
          </span>
        )}
      />

      <PreviewCardContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-[310px] sm:w-[330px] p-0 overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-xl shadow-black/10"
      >
        {type === "user" && userData && (
          <UserPreviewContent
            userData={userData}
            currentUser={currentUser}
          />
        )}
        {type === "page" && pageData && (
          <PagePreviewContent
            pageData={pageData}
            currentUser={currentUser}
          />
        )}
        {type === "group" && groupData && (
          <GroupPreviewContent groupData={groupData} />
        )}
      </PreviewCardContent>
    </PreviewCard>
  )
}

// ---------------------------------------------------------------------------
// 1. User Preview Content
// ---------------------------------------------------------------------------
function UserPreviewContent({
  userData,
  currentUser,
}: {
  userData: UserEntityData
  currentUser?: EntityPreviewCardProps["currentUser"]
}) {
  // Charge le profil complet pour la couverture, la bio et les abonnés
  const { data: profileRes } = useProfile({
    userId: userData.id,
  })

  const profileUser = profileRes?.user
  const stats = profileRes?.stats
  const isMine =
    currentUser?.dughu?.userId != null &&
    String(currentUser.dughu.userId) === String(userData.id)

  const coverUrl =
    profileUser?.cover ||
    userData.cover ||
    (profileUser?.image && !profileUser.avatar ? profileUser.image : null)

  const resolvedCover = coverUrl ? resolveMediaUrl(coverUrl) : null
  const profileHref = `/profile/${userData.username || profileUser?.username || userData.id}`
  const messageHref = `/messages?userId=${encodeURIComponent(userData.id)}`

  return (
    <div className="flex flex-col">
      {/* Bannière de couverture */}
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-[#6B3F1D] via-[#8B5A2B] to-[#C47830]">
        {resolvedCover ? (
          <Image
            src={resolvedCover}
            alt=""
            fill
            className="object-cover"
            sizes="330px"
            unoptimized={resolvedCover.startsWith("http")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#6B3F1D] to-[#B87333] opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Corps du profil */}
      <div className="relative px-4 pb-4 pt-0">
        {/* Avatar chevauchant la couverture */}
        <div className="-mt-10 mb-2.5 flex items-end justify-between">
          <Link
            href={profileHref}
            className="relative rounded-full ring-4 ring-white shadow-md transition-transform hover:scale-105"
          >
            <Avatar
              src={profileUser?.avatar || userData.avatar}
              name={userData.name}
              size="lg"
              verified={userData.verified || profileUser?.verified}
            />
          </Link>

          {/* Badge abonné en statut direct */}
          {stats?.followers !== undefined && (
            <span className="text-[12px] font-medium text-[#65676B]">
              <strong className="text-[#050505] font-semibold">
                {stats.followers}
              </strong>{" "}
              {stats.followers > 1 ? "abonnés" : "abonné"}
            </span>
          )}
        </div>

        {/* Noms et infos */}
        <div className="min-w-0 mb-2">
          <div className="flex items-center gap-1.5">
            <Link
              href={profileHref}
              className="text-[15px] font-bold text-[#050505] truncate hover:text-[#A35A2A] hover:underline"
            >
              {profileUser?.name || userData.name}
            </Link>
            {(userData.verified || profileUser?.verified) && (
              <BadgeCheck
                size={16}
                className="shrink-0 text-[#06B6D4]"
                aria-label="Profil vérifié"
              />
            )}
          </div>

          {(userData.username || profileUser?.username) && (
            <p className="text-[12px] text-[#65676B] truncate">
              @{userData.username || profileUser?.username}
            </p>
          )}

          {profileUser?.bio && (
            <p className="mt-1.5 text-[12px] text-[#2D2D2D] line-clamp-2 leading-relaxed">
              {profileUser.bio}
            </p>
          )}

          {profileUser?.city && (
            <p className="mt-1 text-[11px] text-[#8A8D91] truncate">
              📍 {profileUser.city}
            </p>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          {!isMine && userData.onToggleFollow && (
            <FollowButton
              isFollowing={!!userData.isFollowing}
              isLoading={userData.isFollowLoading}
              onClick={userData.onToggleFollow}
              className="flex-1 py-1.5 text-[12px]"
            />
          )}

          {!isMine && (
            <Link
              href={messageHref}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#050505] transition-colors hover:bg-gray-50 active:bg-gray-100"
              title="Envoyer un message"
            >
              <MessageCircle size={14} className="text-[#65676B]" />
              <span>Message</span>
            </Link>
          )}

          <Link
            href={profileHref}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              isMine
                ? "w-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                : "border border-gray-200 bg-[#F7F8FA] text-[#050505] hover:bg-[#ECEFF3]"
            )}
          >
            <span>{isMine ? "Mon profil" : "Profil"}</span>
            <ExternalLink size={12} className="opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Page / Espace Preview Content
// ---------------------------------------------------------------------------
function PagePreviewContent({
  pageData,
  currentUser,
}: {
  pageData: PageEntityData
  currentUser?: EntityPreviewCardProps["currentUser"]
}) {
  const queryClient = useQueryClient()

  // Charge les détails frais de la page
  const { data: pageRes } = useQuery({
    queryKey: ["page-preview", pageData.pageId],
    queryFn: ({ signal }) =>
      fetchPageDetail(
        pageData.pageId,
        currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : undefined,
        signal
      ),
    staleTime: 60_000,
  })

  const page = pageRes?.page
  const [localLiked, setLocalLiked] = React.useState<boolean | null>(null)
  const [likeCountDelta, setLikeCountDelta] = React.useState(0)

  const isLiked =
    localLiked !== null
      ? localLiked
      : page?.isLiked !== undefined
      ? !!page.isLiked
      : !!pageData.isLiked

  const likeMutation = useMutation({
    mutationFn: () => likePage(pageData.pageId),
    onMutate: () => {
      const nextLiked = !isLiked
      setLocalLiked(nextLiked)
      setLikeCountDelta((prev) => prev + (nextLiked ? 1 : -1))
    },
    onError: () => {
      // Rollback
      setLocalLiked(isLiked)
      setLikeCountDelta((prev) => prev - (isLiked ? 1 : -1))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["page-preview", pageData.pageId] })
      queryClient.invalidateQueries({ queryKey: ["pages"] })
    },
  })

  const coverUrl = page?.cover || pageData.cover
  const resolvedCover = coverUrl ? resolveMediaUrl(coverUrl) : null
  const avatarUrl = page?.avatar || pageData.avatar
  const resolvedAvatar = avatarUrl ? resolveMediaUrl(avatarUrl) : "/images/avatar.png"
  const spaceHref = `/espaces/${pageData.pageId}`
  const currentLikeCount = Math.max(
    0,
    (page?.likeCount ?? pageData.likeCount ?? 0) + likeCountDelta
  )

  return (
    <div className="flex flex-col">
      {/* Bannière de couverture */}
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-[#8B5A2B] via-[#A35A2A] to-[#C47830]">
        {resolvedCover ? (
          <Image
            src={resolvedCover}
            alt=""
            fill
            className="object-cover"
            sizes="330px"
            unoptimized={resolvedCover.startsWith("http")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B] to-[#C47830] opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>

      {/* Corps */}
      <div className="relative px-4 pb-4 pt-0">
        <div className="-mt-10 mb-2 flex items-end justify-between">
          <Link
            href={spaceHref}
            className="relative size-16 shrink-0 overflow-hidden rounded-2xl ring-4 ring-white shadow-md transition-transform hover:scale-105 bg-[#F0F2F5]"
          >
            <Image
              src={resolvedAvatar}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
              unoptimized={resolvedAvatar.startsWith("http")}
            />
          </Link>

          <span className="text-[12px] font-medium text-[#65676B]">
            <strong className="text-[#050505] font-semibold">{currentLikeCount}</strong>{" "}
            {currentLikeCount > 1 ? "likes" : "like"}
          </span>
        </div>

        <div className="min-w-0 mb-2">
          <div className="flex items-center gap-1.5">
            <Link
              href={spaceHref}
              className="text-[15px] font-bold text-[#050505] truncate hover:text-[#A35A2A] hover:underline"
            >
              {page?.pageTitle || page?.pageName || pageData.name}
            </Link>
            {(page?.verified || pageData.verified) && (
              <BadgeCheck
                size={16}
                className="shrink-0 text-[#06B6D4]"
                aria-label="Espace vérifié"
              />
            )}
          </div>

          <p className="mt-0.5 text-[12px] text-[#A35A2A] font-medium truncate">
            {page?.categoryName || pageData.categoryName || "Espace Dughu"}
          </p>

          {page?.pageDescription && (
            <p className="mt-1.5 text-[12px] text-[#2D2D2D] line-clamp-2 leading-relaxed">
              {page.pageDescription}
            </p>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              isLiked
                ? "bg-[#F0F2F5] text-[#A35A2A] hover:bg-[#E4E6E9]"
                : "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
            )}
          >
            {likeMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isLiked ? (
              <Check size={13} />
            ) : (
              <ThumbsUp size={13} />
            )}
            <span>{isLiked ? "Aimé" : "J'aime"}</span>
          </button>

          <Link
            href={spaceHref}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-gray-200 bg-[#F7F8FA] px-3.5 py-1.5 text-[12px] font-semibold text-[#050505] transition-colors hover:bg-[#ECEFF3]"
          >
            <span>Visiter</span>
            <ExternalLink size={12} className="opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Group Preview Content
// ---------------------------------------------------------------------------
function GroupPreviewContent({
  groupData,
}: {
  groupData: GroupEntityData
}) {
  const [joined, setJoined] = React.useState(false)

  const coverUrl = groupData.cover ? resolveMediaUrl(groupData.cover) : null
  const avatarUrl = groupData.avatar ? resolveMediaUrl(groupData.avatar) : null
  const groupHref = `/groups`

  return (
    <div className="flex flex-col">
      {/* Bannière de couverture */}
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-[#4E2A14] via-[#6B3F1D] to-[#8B5A2B]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="330px"
            unoptimized={coverUrl.startsWith("http")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#4E2A14] to-[#8B5A2B] opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Corps */}
      <div className="relative px-4 pb-4 pt-0">
        <div className="-mt-9 mb-2 flex items-end justify-between">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow-md bg-[#FAD0C4] flex items-center justify-center text-[#E05A3A]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={avatarUrl.startsWith("http")}
              />
            ) : (
              <Users size={24} className="text-[#8A4D23]" />
            )}
          </div>

          {groupData.membersCount !== undefined && (
            <span className="text-[12px] font-medium text-[#65676B]">
              <strong className="text-[#050505] font-semibold">
                {groupData.membersCount}
              </strong>{" "}
              {groupData.membersCount > 1 ? "membres" : "membre"}
            </span>
          )}
        </div>

        <div className="min-w-0 mb-2">
          <Link
            href={groupHref}
            className="block text-[15px] font-bold text-[#050505] truncate hover:text-[#A35A2A] hover:underline"
          >
            {groupData.name}
          </Link>

          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#65676B]">
            {groupData.privacy === "private" ? (
              <span className="inline-flex items-center gap-1">
                <Lock size={12} className="shrink-0" /> Groupe privé
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Globe size={12} className="shrink-0" /> Groupe public
              </span>
            )}
            {groupData.category && (
              <>
                <span aria-hidden>•</span>
                <span className="truncate">{groupData.category}</span>
              </>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setJoined((v) => !v)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              joined
                ? "bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6E9]"
                : "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
            )}
          >
            {joined ? <Check size={13} /> : <Plus size={13} />}
            <span>{joined ? "Adhéré" : "Adhérer"}</span>
          </button>

          <Link
            href={groupHref}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-gray-200 bg-[#F7F8FA] px-3.5 py-1.5 text-[12px] font-semibold text-[#050505] transition-colors hover:bg-[#ECEFF3]"
          >
            <span>Voir le groupe</span>
            <ExternalLink size={12} className="opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  )
}
