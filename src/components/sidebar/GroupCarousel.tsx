"use client"

import { useRef, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Users } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface GroupItem {
  id: string
  name: string
  description?: string
  members?: string
  cover?: string | null
  avatar?: string | null
}

interface GroupCarouselProps {
  title: string
  items: GroupItem[]
  defaultCover: string
  defaultAvatar: string
  icon?: ReactNode
  buttonLabel?: string
  buttonColor?: string
  buttonHoverColor?: string
  buttonIcon?: ReactNode
  /** Pendant le chargement distant : squelettes à la place des données statiques. */
  loading?: boolean
  /** Lien de redirection au clic sur l'élément (ex: /groups/${item.id} ou /espaces/${item.id}) */
  getItemHref?: (item: GroupItem) => string
  /** Callback optionnel au clic sur l'élément */
  onItemClick?: (item: GroupItem) => void
}

const CARD_WIDTH = 160
const GAP = 8
const SCROLL_AMOUNT = CARD_WIDTH + GAP

export default function GroupCarousel({
  title,
  items,
  defaultCover,
  defaultAvatar,
  icon,
  buttonLabel,
  buttonColor = "#A35A2A",
  buttonHoverColor,
  buttonIcon,
  loading = false,
  getItemHref,
  onItemClick,
}: GroupCarouselProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleNext = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" })
  }

  const handlePrev = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" })
  }

  return (
    <div className="bg-white dark:bg-[#1E1E1E] dark:border dark:border-white/10 rounded-[20px] p-3 shadow-sm group">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-[14px] text-[#2D2D2D] dark:text-[#F3F4F6] flex items-center gap-1.5">
          {icon}
          {title}
        </h4>
      </div>

      {loading ? (
        <div className="flex gap-[8px] overflow-hidden" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="shrink-0 w-[160px] rounded-[14px] overflow-hidden border border-[#E4E6EB] dark:border-white/10 bg-white dark:bg-[#252525]"
            >
              <Skeleton className="h-[70px] w-full rounded-none border-0" />
              <div className="flex justify-center -mt-5 mb-1">
                <Skeleton className="w-[52px] h-[52px] rounded-full" />
              </div>
              <div className="px-3 text-center space-y-1.5 pb-3">
                <Skeleton className="h-3 w-3/4 mx-auto" />
                <Skeleton className="h-2.5 w-1/2 mx-auto" />
                <Skeleton className="h-7 w-full rounded-full mt-1.5" />
              </div>
            </div>
          ))}
          <span className="sr-only">Chargement des suggestions…</span>
        </div>
      ) : (
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-[8px] overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => {
            const href = getItemHref?.(item)
            const isClickable = Boolean(href || onItemClick)
            const handleItemClick = () => {
              if (onItemClick) {
                onItemClick(item)
              } else if (href) {
                router.push(href)
              }
            }

            return (
              <div
                key={item.id}
                data-card
                role={isClickable ? "link" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={handleItemClick}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && isClickable) {
                    e.preventDefault()
                    handleItemClick()
                  }
                }}
                className={cn(
                  "snap-start shrink-0 w-[160px] rounded-[14px] overflow-hidden border border-[#E4E6EB] dark:border-white/10 bg-white dark:bg-[#252525]",
                  isClickable && "cursor-pointer transition hover:shadow-md hover:border-[#A35A2A]/40 active:scale-[0.99]"
                )}
              >
                {/* Cover */}
                <div className="h-[70px] relative">
                  <Image
                    src={item.cover || defaultCover}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </div>

                {/* Avatar au centre - chevauche la cover */}
                <div className="relative flex justify-center -mt-5 mb-1">
                  <div className="w-[52px] h-[52px] rounded-full border-3 border-white dark:border-[#252525] overflow-hidden shadow-md relative">
                    <Image
                      src={item.avatar || defaultAvatar}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="52px"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="px-3 text-center">
                  <p className="font-bold text-[13px] text-[#2D2D2D] dark:text-[#F3F4F6] truncate hover:text-[#A35A2A] transition">
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="text-[10px] text-[#65676B] dark:text-[#A1A1AA] mt-0.5 truncate">{item.description}</p>
                  )}
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Users size={11} className="text-[#65676B] dark:text-[#A1A1AA]" />
                    <p className="text-[10px] text-[#65676B] dark:text-[#A1A1AA]">{item.members || "0 membres"}</p>
                  </div>
                  {buttonLabel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="w-full mt-2 mb-2 py-1.5 rounded-full text-[11px] font-semibold text-white flex items-center justify-center gap-1 transition hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: buttonColor,
                        ...(buttonHoverColor ? { backgroundImage: `linear-gradient(to right, ${buttonColor}, ${buttonHoverColor})` } : {}),
                      }}
                    >
                      {buttonIcon}
                      {buttonLabel}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bouton précédent - à gauche, visible au hover */}
        <button
          onClick={handlePrev}
          className="opacity-0 group-hover:opacity-100 transition-all duration-300 absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#B87333] hover:bg-[#A35A2A] flex items-center justify-center text-white shadow-md"
          aria-label="Précédent"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Bouton suivant - à droite, visible au hover */}
        <button
          onClick={handleNext}
          className="opacity-0 group-hover:opacity-100 transition-all duration-300 absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#B87333] hover:bg-[#A35A2A] flex items-center justify-center text-white shadow-md"
          aria-label="Suivant"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      )}
    </div>
  )
}
