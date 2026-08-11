"use client"

import { Camera, MapPin, Pencil, UserPlus, UserCheck, MessageCircle, Palette } from "lucide-react"

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
}

function displayName(user: ProfileUser) {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  return user.name || user.username || "Utilisateur"
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + " k"
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
}: ProfileHeaderProps) {
  const coverSrc = user.cover || "/images/group/default-cover.jpg"
  const avatarSrc = user.avatar || "/images/avatar.png"
  const name = displayName(user)

  return (
    <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* ═══════ COUVERTURE ═══════ */}
      <div className="relative group">
        <div className="relative h-44 sm:h-64 lg:h-72 w-full bg-gradient-to-br from-[#A35A2A] to-[#B87333]">
          <img
            src={coverSrc}
            alt="Photo de couverture"
            className="w-full h-full object-cover"
          />
        </div>

        {isOwn && (
          <button
            onClick={onEditCover}
            className="absolute top-3 right-3 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#050505] hover:bg-white transition shadow-md"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Modifier la photo de couverture</span>
            <span className="sm:hidden">Couverture</span>
          </button>
        )}
      </div>

      {/* ═══════ AVATAR + IDENTITÉ ═══════ */}
      <div className="flex flex-col items-center px-4 pb-4 -mt-12 sm:-mt-16">
        <div className="relative">
          <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#F0F2F5]">
            <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
          </div>
          {isOwn && (
            <button
              onClick={onEditAvatar}
              aria-label="Modifier la photo de profil"
              className="absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-[#F0F2F5] transition"
            >
              <Camera size={18} className="text-[#050505]" />
            </button>
          )}
        </div>

        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-[#050505] text-center">{name}</h1>

        {user.username && (
          <p className="text-[13px] text-[#65676B] text-center">@{user.username}</p>
        )}

        {user.bio && (
          <p className="mt-1 text-[14px] text-[#4A4A4A] text-center max-w-[520px] line-clamp-3">{user.bio}</p>
        )}

        {/* Statistiques */}
        <div className="mt-4 w-full max-w-[560px] flex items-center justify-center gap-4 sm:gap-8 text-center">
          <div>
            <p className="font-bold text-lg text-[#050505]">{formatCount(stats.posts)}</p>
            <p className="text-[12px] text-[#65676B]">Publications</p>
          </div>
          <div>
            <p className="font-bold text-lg text-[#050505]">{formatCount(stats.followers)}</p>
            <p className="text-[12px] text-[#65676B]">Abonnés</p>
          </div>
          <div>
            <p className="font-bold text-lg text-[#050505]">{formatCount(stats.following)}</p>
            <p className="text-[12px] text-[#65676B]">Abonnements</p>
          </div>
          <div>
            <p className="font-bold text-lg text-[#050505]">{formatCount(stats.friends)}</p>
            <p className="text-[12px] text-[#65676B]">Amis</p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {isOwn ? (
            <button className="flex items-center gap-2 bg-[#A35A2A] hover:bg-[#8B4A1F] text-white px-5 py-2 rounded-lg text-[14px] font-semibold transition">
              <Pencil size={16} />
              Modifier le profil
            </button>
          ) : (
            <>
              <button
                onClick={onToggleFollow}
                className={
                  isFollowing
                    ? "flex items-center gap-2 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                    : "flex items-center gap-2 bg-[#A35A2A] hover:bg-[#8B4A1F] text-white px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                }
              >
                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                {isFollowing ? "Abonné" : "Suivre"}
              </button>
              <button
                onClick={onMessage}
                className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white px-5 py-2 rounded-lg text-[14px] font-semibold transition"
              >
                <MessageCircle size={16} />
                Message
              </button>
            </>
          )}
        </div>

        {/* Métadonnées utiles */}
        {(user.countryCode || user.gender) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[12px] text-[#65676B]">
            {user.countryCode && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {user.countryCode}
              </span>
            )}
            {user.gender && (
              <span className="flex items-center gap-1">
                <Palette size={13} /> {user.gender}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}