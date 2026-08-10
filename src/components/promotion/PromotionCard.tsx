"use client"

import { TrendingUp } from "lucide-react"
import Avatar from "@/components/common/Avatar"
import Badge from "@/components/common/Badge"
import { cn } from "@/lib/utils"

interface PromotionCardProps {
  name?: string
  description?: string
  members?: string
  image?: string
  color?: string
  badge?: string
  compact?: boolean
}

export default function PromotionCard({
  name = "Publicité",
  description = "Contenu sponsorisé",
  members = "2.1k membres",
  image,
  color = "from-[#A35A2A] to-[#8B5A2B]",
  badge = "Boosté",
  compact = false,
}: PromotionCardProps) {
  if (compact) {
    return (
      <div className={cn("relative bg-gradient-to-br rounded-[16px] p-3.5 text-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.08)]", color)}>
        <Badge variant="yellow" className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5">{badge}</Badge>
        <div className="flex items-center gap-2.5 pt-4">
          <Avatar
            src={image}
            name={name}
            size="md"
            className="w-10 h-10 border-2 border-white/40"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[13px] truncate">{name}</p>
            <p className="text-[11px] opacity-90 truncate">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/20">
          <TrendingUp size={12} className="opacity-90" />
          <p className="text-[11px] opacity-90 truncate">{members}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-gradient-to-br ${color} rounded-[20px] p-4 text-white overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)]`}>
      {/* Badge jaune */}
      <Badge variant="yellow" className="absolute top-3 left-3">{badge}</Badge>

      {/* Contenu */}
      <div className="flex items-center gap-3 pt-6">
        <Avatar
          src={image}
          name={name}
          size="md"
          className="w-12 h-12 border-2 border-white/40"
        />
        <div className="min-w-0">
          <p className="font-bold text-[15px] truncate">{name}</p>
          <p className="text-[12px] opacity-90 truncate">{description}</p>
        </div>
      </div>

      {/* Infos fictives */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
        <TrendingUp size={14} className="opacity-90" />
        <p className="text-[12px] opacity-90 truncate">{members}</p>
      </div>
    </div>
  )
}