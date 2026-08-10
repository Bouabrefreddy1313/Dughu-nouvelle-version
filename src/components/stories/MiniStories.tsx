"use client"

import { useRef } from "react"
import { Plus, ChevronRight, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface MiniStory {
  id: string
  user: { name?: string | null; avatar?: string | null }
  image?: string
  viewed?: boolean
}

interface MiniStoriesProps {
  stories?: MiniStory[]
  currentUser?: { name?: string | null; avatar?: string | null }
  onAddStory?: () => void
  onOpenStory?: (index: number) => void
}

export default function MiniStories({ stories = [], currentUser, onAddStory, onOpenStory }: MiniStoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollNext = () => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })

  return (
    <div className="relative mb-4">
      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {/* Carte Créer une story */}
        <button
          onClick={onAddStory}
          className="flex flex-col items-center shrink-0 cursor-pointer group/add"
        >
          <div className="w-[120px] h-[160px] rounded-2xl overflow-hidden relative flex flex-col border border-gray-200">
            {/* Partie haute - Photo de l'utilisateur */}
            <div className="h-1/2 bg-gray-100 flex items-center justify-center relative">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name || "Moi"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <User size={28} className="text-white" />
                </div>
              )}
            </div>

            {/* Bouton + orange clair au milieu */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white shadow-lg z-10">
              <Plus size={22} />
            </div>

            {/* Partie basse - Fond blanc */}
            <div className="h-1/2 bg-white flex items-center justify-center px-1">
              <span className="text-[12px] font-semibold text-[#2D2D2D] text-center leading-tight">
                Ajouter un flash
              </span>
            </div>
          </div>
        </button>

        {/* Mini cards stories */}
        {stories.map((story, i) => (
          <button
            key={story.id}
            onClick={() => onOpenStory?.(i)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group/story relative"
          >
            {/* Carte image */}
            <div className="w-[100px] h-[140px] rounded-2xl overflow-hidden relative bg-gray-200">
              {story.image ? (
                <img
                  src={story.image}
                  alt={story.user?.name || ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#A35A2A] to-[#E4405F] flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {story.user?.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}

              {/* Avatar en haut avec contour */}
              <div className={cn(
                "absolute -top-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full p-[2px] bg-white",
                story.viewed ? "bg-[#E4E6EB]" : "bg-gradient-to-tr from-[#1877F2] via-[#1877F2] to-[#00C6FF]"
              )}>
                <div className="w-full h-full rounded-full overflow-hidden bg-[#A35A2A] border-2 border-white">
                  {story.user?.avatar ? (
                    <img
                      src={story.user.avatar}
                      alt={story.user.name || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold bg-[#A35A2A]">
                      {story.user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <span className="text-[11px] font-medium text-[#2D2D2D] truncate w-[100px] text-center">
              {story.user?.name || "Utilisateur"}
            </span>
          </button>
        ))}
      </div>

      {/* Bouton navigation droite */}
      {stories.length > 4 && (
        <button
          onClick={scrollNext}
          aria-label="Suivant"
          className="absolute right-1 top-[70px] -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#A35A2A] z-20"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}