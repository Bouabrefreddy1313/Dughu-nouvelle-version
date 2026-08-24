"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { resolveMediaUrl } from "@/lib/dughu"

interface MiniProfileCardProps {
  user?: any
  /** Solde total de points (endpoint /pointsToday/{id} → `total`). Prioritaire sur user.points. */
  points?: number
}

export default function MiniProfileCard({ user, points }: MiniProfileCardProps) {
  const router = useRouter()
  const totalPoints = points ?? user?.points ?? 0
  return (
    <div
      onClick={() => router.push(`/profile/${user?.username || user?.id || ""}`)}
      className="w-full bg-white rounded-[20px] overflow-visible shadow-sm hover:shadow-md cursor-pointer transition"
    >
      {/* Badge points */}
      <div className="bg-[#B87333] text-white text-center py-1.5 rounded-t-[20px]">
        <p className="font-bold text-sm tracking-wide">
          {totalPoints.toLocaleString("fr-FR")} Points
        </p>
      </div>

      {/* Zone cover */}
      <div className="h-[90px] relative">
        <Image
          src={user?.cover ? resolveMediaUrl(user.cover) : "/images/group/default-cover.jpg"}
          alt="Couverture"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>

      {/* Avatar chevauchant */}
      <div className="relative -mt-6 flex justify-center z-10">
        <div className="w-[64px] h-[64px] rounded-full border-2 border-white overflow-hidden shadow-md relative">
          <Image
            src={user?.avatar ? resolveMediaUrl(user.avatar) : (user?.image ? resolveMediaUrl(user.image) : "/images/avatar.png")}
            alt="Photo de profil"
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      </div>

      {/* Zone identité */}
      <div className="text-center px-4 mt-1">
        <p className="font-bold text-[14px] text-[#2D2D2D] truncate">
          {user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.name || "Utilisateur"}
        </p>
        <p className="text-[11px] text-[#65676B]">
          @{user?.username || user?.email?.split('@')[0] || 'utilisateur'}
        </p>
      </div>

      {/* Stats */}
      <div className="flex justify-around mt-2 pb-2">
        <div className="flex-1 text-center border-r border-[#E4E6EB]">
          <p className="font-bold text-[13px] text-[#2D2D2D]">{user?._count?.posts ?? 0}</p>
          <p className="text-[10px] text-[#65676B]">Posts</p>
        </div>
        <div className="flex-1 text-center border-r border-[#E4E6EB]">
          <p className="font-bold text-[13px] text-[#2D2D2D]">{user?._count?.following ?? 0}</p>
          <p className="text-[10px] text-[#65676B]">Suivis</p>
        </div>
        <div className="flex-1 text-center">
          <p className="font-bold text-[13px] text-[#2D2D2D]">{user?._count?.followers ?? 0}</p>
          <p className="text-[10px] text-[#65676B]">Abonnés</p>
        </div>
      </div>
    </div>
  )
}