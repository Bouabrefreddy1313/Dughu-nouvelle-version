"use client"

import { useState } from "react"
import { Users, X } from "lucide-react"
import Image from "next/image"
import Card from "@/components/common/Card"

export interface ProfileFriend {
  id: string
  name?: string | null
  username?: string | null
  avatar?: string | null
}

interface ProfileFriendsProps {
  friends?: ProfileFriend[]
  total?: number
  userId: string
}

export function ProfileFriends({ friends = [], total = friends.length, userId: _userId }: ProfileFriendsProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = friends.slice(0, 9)

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[16px] font-bold text-[#2D2D2D] flex items-center gap-2">
          <Users size={16} className="text-[#A35A2A]" />
          Amis
        </h3>
        {total > 9 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[12px] font-semibold text-[#A35A2A] hover:underline"
          >
            Voir tous
          </button>
        )}
      </div>
      <p className="text-[13px] text-[#65676B] -mt-1 mb-3">{total} amis</p>

      {visible.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#65676B]">Aucun ami pour le moment.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {visible.map((f) => (
            <a
              key={f.id}
              href={`/profile/${f.username || f.id}`}
              className="group flex flex-col items-center gap-1.5 p-1.5 rounded-lg hover:bg-[#F0F2F5] transition"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F0F2F5] relative">
                <Image
                  src={f.avatar || "/images/avatar.png"}
                  alt={f.name || "Ami"}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <span className="text-[12px] text-[#2D2D2D] text-center leading-tight line-clamp-2 group-hover:underline">
                {f.name}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Modal voir tous les amis */}
      {showAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-[#050505]">Amis</h3>
                <p className="text-[13px] text-[#65676B]">{total} amis</p>
              </div>
              <button onClick={() => setShowAll(false)} className="p-2 rounded-full hover:bg-gray-100 transition" aria-label="Fermer">
                <X size={20} className="text-[#65676B]" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {friends.map((f) => (
                <a
                  key={f.id}
                  href={`/profile/${f.username || f.id}`}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F0F2F5] transition"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-[#F0F2F5] shrink-0 relative">
                    <Image src={f.avatar || "/images/avatar.png"} alt={f.name || "Ami"} fill className="object-cover" sizes="44px" />
                  </div>
                  <span className="text-[13px] font-medium text-[#050505] truncate">{f.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}