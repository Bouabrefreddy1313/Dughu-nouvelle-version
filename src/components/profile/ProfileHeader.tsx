"use client"

import { Camera, MapPin, Pencil, UserPlus, UserCheck, MessageCircle, MoreHorizontal, BadgeCheck } from "lucide-react"

export interface ProfileUser {
  id: string
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  username?: string | null
  email?: string
  avatar?: string | null
  cover?: string | null
  bio?: string | null
  gender?: string | null
  countryCode?: string | null
  location?: string | null
  verified?: boolean
  online?: boolean
}

export interface ProfileStats {
  posts: number
  followers: number
  following: number
  friends: number
}

interface ProfileHeaderProps {
  user: ProfileUser
  stats: ProfileStats
  isOwn: boolean
  isFollowing?: boolean
  onToggleFollow?: () => void
  onMessage?: () => void
  onEditCover?: () => void
  onEditAvatar?: () => void
  onEditProfile?: () => void
  onMore?: () => void
}

function displayName(user: ProfileUser) {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  return user.name || user.username || "Utilisateur"
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
  return String(n)
}

export function ProfileHeader({
  user,
  stats,
  isOwn,
  isFollowing,
  onToggleFollow,
  onMessage,
  onEditCover,
  onEditAvatar,
  onEditProfile,
  onMore,
}: ProfileHeaderProps) {
  const coverSrc = user.cover || "/images/group/default-cover.jpg"
  const avatarSrc = user.avatar || "/images/avatar.png"
  const name = displayName(user)
  const metaLine = [user.username ? `@${user.username}` : null, user.location || user.countryCode]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* ═══════ COUVERTURE ═══════ */}
      <div className="relative h-48 sm:h-64 lg:h-80 w-full bg-gradient-to-br from-[#A35A2A] to-[#B87333]">
        <img src={coverSrc} alt="Photo de couverture" className="w-full h-full object-cover" />

        {isOwn && (
          <button
            onClick={onEditCover}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 bg-white/90 backdrop-blur px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#050505] hover:bg-white transition shadow-md"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Modifier la couverture</span>
            <span className="sm:hidden">Couverture</span>
          </button>
        )}

        {/* Avatar en chevauchement bas-gauche de la couverture */}
        <div className="absolute -bottom-14 sm:-bottom-[72px] left-4 sm:left-6">
          <div className="relative">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#F0F2F5]">
              <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
            </div>
            {user.online && (
              <span className="absolute bottom-1.5 right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#31A24C] border-[3px] border-white" />
            )}
            {isOwn && (
              <button
                onClick={onEditAvatar}
                aria-label="Modifier la photo de profil"
                className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-[#F0F2F5] transition"
              >
                <Camera size={15} className="text-[#050505]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ IDENTITÉ + STATS ═══════ */}
      <div className="px-4 sm:px-6 pt-16 sm:pt-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Colonne identité */}
          <div className="sm:ml-[164px] min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#050505] truncate">{name}</h1>
              {user.verified && <BadgeCheck size={20} className="text-[#A35A2A] shrink-0" />}
            </div>

            {metaLine && <p className="text-[13px] text-[#65676B] mt-0.5">{metaLine}</p>}

            {user.bio && (
              <p className="mt-1.5 text-[14px] text-[#4A4A4A] max-w-[420px] line-clamp-2">{user.bio}</p>
            )}
          </div>

          {/* Colonne stats + actions */}
          <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.friends)}</p>
                <p className="text-[12px] text-[#65676B]">Amis</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.posts)}</p>
                <p className="text-[12px] text-[#65676B]">Publications</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.followers)}</p>
                <p className="text-[12px] text-[#65676B]">Abonnés</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.following)}</p>
                <p className="text-[12px] text-[#65676B]">Abonnements</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwn ? (
                <>
                  <button
                    onClick={onEditProfile}
                    className="flex items-center gap-2 bg-[#A35A2A] hover:bg-[#8B4A1F] text-white px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                  >
                    <UserPlus size={16} />
                    Éditer le profil
                  </button>
                  <button
                    onClick={onMore}
                    aria-label="Plus d'options"
                    className="flex items-center justify-center bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] w-[38px] h-[38px] rounded-lg transition"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onToggleFollow}
                    className={
                      isFollowing
                        ? "flex items-center gap-2 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                        : "flex items-center gap-2 bg-[#A35A2A] hover:bg-[#8B4A1F] text-white px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                    }
                  >
                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    {isFollowing ? "Abonné" : "Suivre"}
                  </button>
                  <button
                    onClick={onMessage}
                    className="flex items-center gap-2 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}