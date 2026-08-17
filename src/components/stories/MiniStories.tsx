"use client"

import { useRef } from "react"
import { Plus, ChevronRight, ChevronLeft, User } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { resolveMediaUrl } from "@/lib/dughu"

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

  const scrollNext = () => scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" })
  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -220, behavior: "smooth" })

  const currentUserAvatarSrc = currentUser?.avatar ? resolveMediaUrl(currentUser.avatar) : null

  return (
    <div className="relative mb-4 group/rail">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Carte Créer une story */}
        <button
          onClick={onAddStory}
          className="flex flex-col items-center shrink-0 cursor-pointer group/add"
        >
          <div className="w-[120px] h-[168px] rounded-2xl overflow-hidden relative flex flex-col border border-gray-200/80 shadow-sm transition-all duration-300 ease-out group-hover/add:shadow-lg group-hover/add:shadow-[#E08543]/15 group-hover/add:-translate-y-0.5">
            {/* Partie haute - Photo de l'utilisateur */}
            <div className="h-[70%] bg-gray-100 relative overflow-hidden">
              {currentUserAvatarSrc ? (
                <Image
                  src={currentUserAvatarSrc}
                  alt={currentUser?.name || "Moi"}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover/add:scale-105"
                  sizes="120px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E08543]/25 to-[#2D2D2D]/10 flex items-center justify-center">
                  <User size={26} className="text-[#A35A2A]" strokeWidth={1.75} />
                </div>
              )}
              {/* voile pour la lisibilité du bouton + */}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" />
            </div>

            {/* Bouton + qui chevauche les deux zones */}
            <div className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#E08543] ring-4 ring-white flex items-center justify-center text-white shadow-md z-10 transition-transform duration-300 ease-out group-hover/add:scale-110">
              <Plus size={20} strokeWidth={2.5} />
            </div>

            {/* Partie basse */}
            <div className="h-[30%] bg-white flex items-center justify-center px-2 pt-1">
              <span className="text-[12px] font-semibold text-[#2D2D2D] text-center leading-tight">
                Ajouter un flash
              </span>
            </div>
          </div>
        </button>

        {/* Mini cards stories */}
        {stories.map((story, i) => {
          const storyUserAvatarSrc = story.user?.avatar ? resolveMediaUrl(story.user.avatar) : null
          return (
            <button
              key={story.id}
              onClick={() => onOpenStory?.(i)}
              className="flex flex-col items-center shrink-0 cursor-pointer group/story relative"
            >
              <div className="w-[104px] h-[168px] rounded-2xl overflow-hidden relative bg-gray-200 shadow-sm transition-all duration-300 ease-out group-hover/story:shadow-lg group-hover/story:shadow-[#E08543]/15 group-hover/story:-translate-y-0.5">
                {story.image ? (
                  <Image
                    src={story.image}
                    alt={story.user?.name || ""}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover/story:scale-105"
                    sizes="104px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#E08543] to-[#A35A2A] flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {story.user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}

                {/* voile dégradé bas pour lisibilité du nom */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Avatar en haut avec contour */}
                <div
                  className={cn(
                    "absolute top-2.5 left-2.5 w-8 h-8 rounded-full p-[2px]",
                    story.viewed
                      ? "bg-[#D8DADF]"
                      : "bg-gradient-to-tr from-[#E08543] via-[#E08543] to-[#F2B183]"
                  )}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#A35A2A] border-2 border-white">
                    {storyUserAvatarSrc ? (
                      <Image
                        src={storyUserAvatarSrc}
                        alt={story.user?.name || ""}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold bg-[#A35A2A]">
                        {story.user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nom incrusté en bas de la carte */}
                <span className="absolute bottom-2 left-2.5 right-2.5 text-[12px] font-semibold text-white truncate drop-shadow-sm">
                  {story.user?.name || "Utilisateur"}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bouton navigation gauche */}
      {stories.length > 4 && (
        <button
          onClick={scrollPrev}
          aria-label="Précédent"
          className="absolute left-1 top-[76px] -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#E08543] z-20 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Bouton navigation droite */}
      {stories.length > 4 && (
        <button
          onClick={scrollNext}
          aria-label="Suivant"
          className="absolute right-1 top-[76px] -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#E08543] z-20"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}