"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Globe, MoreHorizontal, ChevronLeft, ChevronRight, X, EyeOff, ThumbsUp, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchSuggestions } from "@/services/posts/feed.service"
import { likePage } from "@/services/pages/pages.service"
import { resolveMediaUrl } from "@/lib/dughu"
import { toast } from "sonner"

export interface SuggestedSpaceItem {
  id: string
  name: string
  description?: string
  image?: string | null
  cover?: string | null
  category?: string | null
  likes?: number
}

interface SuggestionsEspacesCardProps {
  currentUser?: {
    id?: string
    dughu?: { userId?: string | number }
    dughhuUserId?: string | number
    username?: string
  } | null
  className?: string
  onEmpty?: () => void
}

export default function SuggestionsEspacesCard({
  currentUser,
  className,
  onEmpty,
}: SuggestionsEspacesCardProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [spaces, setSpaces] = useState<SuggestedSpaceItem[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [hidden, setHidden] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  // Navigation scroll & drag state
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)
  const hasMoved = useRef(false)

  const userId = String(currentUser?.id || "")
  const dughuUserId = String(currentUser?.dughu?.userId || currentUser?.dughhuUserId || "")

  // Chargement des espaces suggérés
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        // TODO: brancher l'endpoint espaces suggérés dédié (ex: /retrouvailles?tab=espaces&user_id={user_id})
        // Dès à présent, nous utilisons l'endpoint suggestions centralisé connecté à suggestPages de l'API Dughu
        const res = await fetchSuggestions(userId, {
          dughuUserId: dughuUserId || undefined,
          username: currentUser?.username || undefined,
        })
        if (!active) return

        if (res.success && Array.isArray(res.pages) && res.pages.length > 0) {
          const mapped: SuggestedSpaceItem[] = res.pages.map((p: any) => ({
            id: String(p.id ?? p.page_id ?? ""),
            name: p.name || p.page_title || p.page_name || "Espace",
            description: p.description || p.page_description || "",
            image: p.image || p.avatar || "/images/page/default-avatar.jpg",
            cover: p.cover || "/images/page/default-cover.jpg",
            category: p.category ?? p.page_category ?? null,
            likes: Number(p.likes ?? p.likesNbr ?? 0),
          }))
          setSpaces(mapped)
          if (mapped.length === 0) {
            onEmpty?.()
          }
        } else {
          setSpaces([])
          onEmpty?.()
        }
      } catch (err) {
        console.error("SuggestionsEspacesCard load error:", err)
        if (active) onEmpty?.()
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [userId, dughuUserId, currentUser?.username, onEmpty])

  // Détection des limites de défilement horizontal
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [updateScrollState, spaces.length])

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const delta = direction === "left" ? -340 : 340
    el.scrollBy({ left: delta, behavior: "smooth" })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    setIsDragging(true)
    hasMoved.current = false
    dragStartX.current = e.pageX - el.offsetLeft
    dragScrollLeft.current = el.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - dragStartX.current) * 1.2
    if (Math.abs(walk) > 5) {
      hasMoved.current = true
    }
    el.scrollLeft = dragScrollLeft.current - walk
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // Retrait d'un espace avec animation
  const handleDismiss = (spaceId: string) => {
    setDismissedIds((prev) => new Set(prev).add(spaceId))
    setTimeout(() => {
      setSpaces((prev) => {
        const next = prev.filter((s) => String(s.id) !== spaceId)
        if (next.length === 0) onEmpty?.()
        return next
      })
    }, 280)
  }

  // Action Aimer / Suivre l'espace via likePage existant
  const handleToggleLike = async (space: SuggestedSpaceItem) => {
    const targetId = String(space.id)
    const isCurrentlyLiked = Boolean(likedMap[targetId])
    const nextLiked = !isCurrentlyLiked

    setLikedMap((prev) => ({ ...prev, [targetId]: nextLiked }))
    setLoadingMap((prev) => ({ ...prev, [targetId]: true }))

    try {
      await likePage(targetId, dughuUserId || undefined)
      toast.success(nextLiked ? `Vous suivez désormais "${space.name}"` : `Vous ne suivez plus "${space.name}"`)
    } catch {
      setLikedMap((prev) => ({ ...prev, [targetId]: isCurrentlyLiked }))
      toast.error("Impossible de modifier votre mention J'aime.")
    } finally {
      setLoadingMap((prev) => ({ ...prev, [targetId]: false }))
    }
  }

  const visibleSpaces = spaces.filter((s) => !dismissedIds.has(String(s.id)))

  if (hidden || (!loading && visibleSpaces.length === 0)) {
    return null
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-[#1E1E1E] rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-white/10 mb-4 transition-all duration-300",
        className
      )}
    >
      {/* En-tête de la carte */}
      <div className="flex items-center justify-between mb-3.5 px-1 relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#A35A2A]/10 dark:bg-[#A35A2A]/20 flex items-center justify-center text-[#A35A2A] shrink-0">
            <Globe size={18} />
          </div>
          <h3 className="font-bold text-[15px] text-[#050505] dark:text-[#F3F4F6] truncate">
            Espaces que vous pourriez aimer
          </h3>
        </div>

        {/* Menu ••• à droite */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition"
            aria-label="Options"
          >
            <MoreHorizontal size={19} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-white dark:bg-[#252525] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-1 text-xs text-[#050505] dark:text-gray-200 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    setHidden(true)
                    onEmpty?.()
                    toast.info("Section masquée du fil d'actualité")
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  <EyeOff size={15} className="text-gray-400" />
                  <span>Masquer cette section</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Carrousel horizontal de mini-cartes */}
      <div className="relative group">
        {/* Flèche gauche < */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 dark:bg-[#2A2A2A]/95 shadow-md border border-gray-200/70 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-110 active:scale-95 transition backdrop-blur-sm"
            aria-label="Défiler vers la gauche"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Flèche droite > */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 dark:bg-[#2A2A2A]/95 shadow-md border border-gray-200/70 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-110 active:scale-95 transition backdrop-blur-sm"
            aria-label="Défiler vers la droite"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Conteneur défilant */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={cn(
            "flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 -mx-1 select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {loading && visibleSpaces.length === 0
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[175px] sm:w-[190px] shrink-0 bg-gray-50 dark:bg-white/5 rounded-2xl p-3 animate-pulse space-y-3"
                >
                  <div className="w-full h-44 bg-gray-200 dark:bg-white/10 rounded-xl" />
                  <div className="h-3.5 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 dark:bg-white/10 rounded-full" />
                </div>
              ))
            : visibleSpaces.map((space) => {
                const isDismissing = dismissedIds.has(String(space.id))
                const isLiked = Boolean(likedMap[String(space.id)])
                const isLikeLoading = Boolean(loadingMap[String(space.id)])
                const coverUrl = space.cover ? resolveMediaUrl(space.cover) : "/images/page/default-cover.jpg"
                const spaceUrl = `/espaces/${encodeURIComponent(space.id)}`
                const likesCount = space.likes || 0

                const handleNavigate = () => {
                  if (hasMoved.current) return
                  router.push(spaceUrl)
                }

                return (
                  <div
                    key={space.id}
                    className={cn(
                      "w-[175px] sm:w-[190px] shrink-0 bg-white dark:bg-[#252525] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 hover:shadow-md",
                      isDismissing && "opacity-0 scale-90 pointer-events-none"
                    )}
                  >
                    {/* Image de couverture grand format */}
                    <div
                      className="relative w-full h-44 bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group"
                      onClick={handleNavigate}
                    >
                      <Image
                        src={coverUrl}
                        alt={space.name}
                        fill
                        unoptimized
                        sizes="200px"
                        draggable={false}
                        className="object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />

                      {/* Bouton × pour masquer l'espace */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss(String(space.id))
                        }}
                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition active:scale-90"
                        title="Retirer cette suggestion"
                        aria-label="Retirer cette suggestion"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Informations textuelles */}
                    <div className="p-3 flex flex-col justify-between flex-1">
                      <div>
                        <h4
                          onClick={handleNavigate}
                          className="font-bold text-[13px] text-[#050505] dark:text-[#F3F4F6] line-clamp-1 hover:underline cursor-pointer leading-tight"
                          title={space.name}
                        >
                          {space.name}
                        </h4>

                        {/* Info secondaire : catégorie ou nombre de likes */}
                        {likesCount > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#65676B] dark:text-[#A1A1AA]">
                            <ThumbsUp size={12} className="shrink-0 text-[#A35A2A]" />
                            <span className="truncate">
                              {likesCount} {likesCount > 1 ? "j'aime" : "j'aime"}
                            </span>
                          </div>
                        ) : space.category ? (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#65676B] dark:text-[#A1A1AA]">
                            <Globe size={12} className="shrink-0 text-[#A35A2A]" />
                            <span className="truncate">{space.category}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#65676B] dark:text-[#A1A1AA]">
                            <Globe size={12} className="shrink-0 text-[#A35A2A]" />
                            <span className="truncate">Espace recommandé</span>
                          </div>
                        )}
                      </div>

                      {/* Bouton Suivre / J'aime pleine largeur */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(space)}
                          disabled={isLikeLoading}
                          className={cn(
                            "w-full inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-70",
                            isLiked
                              ? "bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6E9] dark:bg-white/10 dark:text-gray-200"
                              : "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                          )}
                        >
                          {isLiked ? <Check size={13} /> : <ThumbsUp size={13} />}
                          <span>{isLiked ? "Abonné" : "Suivre"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
        </div>
      </div>

      {/* Lien Voir tout sous le carrousel */}
      <div className="mt-3 pt-2 text-center border-t border-gray-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => router.push("/espaces")}
          className="text-[13px] font-semibold text-[#A35A2A] hover:text-[#8B4A1F] dark:text-[#B46D1C] transition hover:underline"
        >
          Voir tout
        </button>
      </div>
    </div>
  )
}
