"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StoryCardProps {
  image?: string
  name?: string
  onClick?: () => void
  isAdd?: boolean
  viewed?: boolean
}

export default function StoryCard({ image, name, onClick, isAdd, viewed }: StoryCardProps) {
  if (isAdd) {
    return (
      <button
        onClick={onClick}
        className="relative w-[115px] h-[200px] rounded-[22px] overflow-hidden shrink-0 bg-white border border-[#ececec] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200"
      >
        <div className="w-12 h-12 rounded-full bg-[#F0F2F5] border-2 border-dashed border-[#A35A2A] flex items-center justify-center text-[#A35A2A]">
          <Plus size={24} />
        </div>
        <span className="text-[13px] font-medium text-[#2D2D2D]">Ajouter</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="relative w-[115px] h-[200px] rounded-[22px] overflow-hidden shrink-0 cursor-pointer group"
    >
      {/* Image */}
      {image ? (
        <img src={image} alt={name || ""} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#A35A2A] to-[#8B5A2B] flex items-center justify-center">
          <span className="text-white font-bold text-2xl">{name?.charAt(0) || "U"}</span>
        </div>
      )}

      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Nom */}
      <div className="absolute bottom-3 left-3 right-3 text-left">
        <p className="text-white text-[12px] font-semibold truncate drop-shadow">{name}</p>
      </div>

      {/* Anneau de progression */}
      <div className={cn(
        "absolute top-3 left-3 w-9 h-9 rounded-full p-[2px]",
        viewed ? "bg-gray-300" : "bg-gradient-to-tr from-[#F5C33B] via-[#A35A2A] to-[#E4405F]"
      )}>
        <div className="w-full h-full rounded-full bg-white p-[2px]">
          <div className="w-full h-full rounded-full bg-[#A35A2A] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
            {name?.charAt(0) || "U"}
          </div>
        </div>
      </div>
    </button>
  )
}