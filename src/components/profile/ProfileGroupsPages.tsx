"use client"

import { Users, Globe, UserPlus, Heart, Plus } from "lucide-react"
import Image from "next/image"
import Card from "@/components/common/Card"

export interface ProfileGroup {
  id: string
  name: string
  image?: string | null
  description?: string | null
  role?: string
  memberCount?: number
}

export interface ProfilePage {
  id: string
  name: string
  image?: string | null
  cover?: string | null
  description?: string | null
  likes?: number
}

interface ProfileGroupsPagesProps {
  groups?: ProfileGroup[]
  pages?: { owned: ProfilePage[]; liked: ProfilePage[] } | null
  isOwn: boolean
}

export function ProfileGroupsPages({ groups = [], pages, isOwn }: ProfileGroupsPagesProps) {
  const ownedPages = pages?.owned || []
  const likedPages = pages?.liked || []

  return (
    <Card className="p-4">
      <h3 className="text-[16px] font-bold text-[#2D2D2D] flex items-center gap-2 mb-3">
        <Users size={16} className="text-[#A35A2A]" />
        Groupes et pages
      </h3>

      {/* Groupes */}
      {isOwn && (
        <button className="mb-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#A35A2A]/40 rounded-xl py-2.5 text-[13px] font-semibold text-[#A35A2A] hover:bg-[#A35A2A]/5 transition">
          <Plus size={16} />
          Créer un groupe
        </button>
      )}

      <div className="space-y-2.5">
        {groups.slice(0, 5).map((g) => (
          <a key={g.id} href={`/groups/${g.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F0F2F5] transition">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#1877F2] to-[#00C6FF] shrink-0 relative">
              {g.image ? (
                <Image src={g.image} alt={g.name} fill className="object-cover" sizes="44px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Users size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#2D2D2D] truncate">{g.name}</p>
              <p className="text-[12px] text-[#65676B] truncate">
                {g.memberCount ?? 0} membres
                {g.role === "admin" || g.role === "creator" ? " · Créé par vous" : ""}
              </p>
            </div>
          </a>
        ))}
        {groups.length === 0 && isOwn && (
          <p className="text-[13px] text-[#65676B] text-center py-2">
            Vous n'êtes membre d'aucun groupe.
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 my-3" />

      {/* Pages */}
      <h4 className="text-[13px] font-semibold text-[#65676B] uppercase tracking-wide mb-2 flex items-center gap-2">
        <Globe size={14} />
        Pages
      </h4>
      <div className="space-y-2.5">
        {(ownedPages.length > 0 || likedPages.length > 0) ? (
          <div className="space-y-2.5">
            {[
              ...ownedPages.map((p) => ({ ...p, tag: "Créée" })),
              ...likedPages.map((p) => ({ ...p, tag: "Aimée" })),
            ].slice(0, 5).map((p) => (
              <a key={`${p.id}-${p.tag}`} href={`/pages/${p.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F0F2F5] transition">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#E4405F] to-[#F5A33B] shrink-0 relative">
                  {p.image ? (
                    <Image src={p.image} alt={p.name} fill className="object-cover" sizes="44px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Heart size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#2D2D2D] truncate">{p.name}</p>
                  <p className="text-[12px] text-[#65676B] truncate">
                    {p.likes ?? 0} J'aime{p.likes && p.likes > 1 ? "s" : ""} · {p.tag}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#65676B] text-center py-2">Aucune page pour le moment.</p>
        )}
      </div>

      {isOwn && (
        <button className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#E4405F]/40 rounded-xl py-2.5 text-[13px] font-semibold text-[#E4405F] hover:bg-[#E4405F]/5 transition">
          <UserPlus size={16} />
          Créer une page
        </button>
      )}
    </Card>
  )
}