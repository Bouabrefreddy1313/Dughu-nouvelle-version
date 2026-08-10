"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Card from "@/components/common/Card"
import StoryCard from "@/components/stories/StoryCard"

interface Story {
  id: string
  user: { name?: string | null; avatar?: string | null }
  image?: string
  viewed?: boolean
}

interface StoriesProps {
  stories?: Story[]
  onAddStory?: () => void
  onOpenStory?: (index: number) => void
}

export default function Stories({ stories = [], onAddStory, onOpenStory }: StoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollNext = () => scrollRef.current?.scrollBy({ left: 250, behavior: "smooth" })
  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -250, behavior: "smooth" })

  return (
    <Card className="p-4 rounded-[24px] relative group">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        <StoryCard isAdd onClick={onAddStory} />

        {stories.map((story, i) => (
          <StoryCard
            key={story.id}
            image={story.image}
            name={story.user?.name || "Utilisateur"}
            viewed={story.viewed}
            onClick={() => onOpenStory?.(i)}
          />
        ))}
      </div>

      {/* Boutons de navigation */}
      {stories.length > 3 && (
        <>
          <button
            onClick={scrollNext}
            aria-label="Suivant"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#A35A2A] hover:bg-[#F0F2F5] opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={scrollPrev}
            aria-label="Précédent"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#A35A2A] hover:bg-[#F0F2F5] opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft size={18} />
          </button>
        </>
      )}
    </Card>
  )
}