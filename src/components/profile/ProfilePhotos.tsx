"use client"

import { useState } from "react"
import { Images, X } from "lucide-react"
import Image from "next/image"
import Card from "@/components/common/Card"
import { cn } from "@/lib/utils"

export interface ProfilePhoto {
  id: string
  url?: string | null
  createdAt?: string
}

interface ProfilePhotosProps {
  photos?: ProfilePhoto[]
  total?: number
  onSeeAll?: () => void
}

export function ProfilePhotos({ photos = [], onSeeAll }: ProfilePhotosProps) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const visible = photos.slice(0, 9)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-bold text-[#2D2D2D] flex items-center gap-2">
          <Images size={16} className="text-[#A35A2A]" />
          Photos
        </h3>
        {onSeeAll && visible.length > 0 && (
          <button
            onClick={onSeeAll}
            className="text-[12px] font-semibold text-[#A35A2A] hover:underline"
          >
            Voir toutes les photos
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#65676B]">Aucune photo pour le moment.</div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {visible.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setLightbox(i)}
              className="aspect-square overflow-hidden hover:opacity-90 transition rounded-md"
              aria-label="Voir la photo"
            >
              <Image src={p.url || ""} alt="" width={200} height={200} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && visible[lightbox] && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            aria-label="Fermer"
          >
            <X size={28} />
          </button>
          <Image
            src={visible[lightbox].url || ""}
            alt=""
            width={1200}
            height={900}
            className={cn("max-w-full max-h-[85vh] object-contain rounded-xl")}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Card>
  )
}