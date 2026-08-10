"use client"

import { Eye } from "lucide-react"
import Badge from "@/components/common/Badge"
import Avatar from "@/components/common/Avatar"

interface BoostedPostCardProps {
  image?: string | null
  authorName?: string | null
  authorAvatar?: string | null
  title?: string
  views?: number | null
}

export default function BoostedPostCard({
  image,
  authorName = "Utilisateur",
  authorAvatar,
  title = "Publication",
  views = 0,
}: BoostedPostCardProps) {
  const viewCount = views ?? 0
  return (
    <div className="relative bg-white rounded-[16px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 group cursor-pointer">
      {/* Badge Boosté */}
      <Badge variant="yellow" className="absolute top-2 left-2 z-10 text-[9px] px-1.5 py-0.5">
        Boosté
      </Badge>

      {/* Photo du post */}
      <div className="w-full h-28 bg-gray-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#A35A2A] to-[#8B5A2B]">
            <span className="text-white text-opacity-70 text-sm font-medium">📸</span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-2.5">
        {/* Auteur : avatar + nom */}
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar
            src={authorAvatar}
            name={authorName}
            size="xs"
            className="w-6 h-6 border border-gray-200"
          />
          <p className="text-[11px] font-medium text-[#65676B] truncate">{authorName}</p>
        </div>

        {/* Titre du post */}
        <p className="text-[13px] font-semibold text-[#050505] leading-snug line-clamp-2">
          {title}
        </p>

        {/* Vues */}
        {viewCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#65676B]">
            <Eye size={11} />
            <span>{viewCount} vues</span>
          </div>
        )}
      </div>
    </div>
  )
}