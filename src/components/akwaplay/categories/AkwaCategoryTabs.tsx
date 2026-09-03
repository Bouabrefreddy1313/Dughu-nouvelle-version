"use client"

import { useRef } from "react"
import type { AkwaCategory } from "@/types/akwaplay/akwaplay.types"
import { cn } from "@/lib/utils"

interface AkwaCategoryTabsProps {
  categories: AkwaCategory[]
  selectedCategoryId: string | number | null
  onSelect: (id: string | number | null) => void
}

export default function AkwaCategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
}: AkwaCategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-2 overflow-x-auto py-3 px-1"
      style={{ scrollbarWidth: "none" }}
      role="tablist"
      aria-label="Catégories de vidéos"
    >
      {/* Onglet "Tous" */}
      <button
        role="tab"
        aria-selected={!selectedCategoryId}
        onClick={() => onSelect(null)}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition shrink-0 cursor-pointer",
          !selectedCategoryId
            ? "bg-white text-black"
            : "text-[#9a9a9a] hover:text-white hover:bg-white/10"
        )}
      >
        Tous
      </button>

      {categories.map((cat) => {
        const active = selectedCategoryId === cat.id
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition shrink-0 cursor-pointer",
              active
                ? "bg-white text-black"
                : "text-[#9a9a9a] hover:text-white hover:bg-white/10"
            )}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
