"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Users, MoreHorizontal, ChevronLeft, ChevronRight, X, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import FollowButton from "@/components/common/FollowButton"
import { fetchRetrouvailles } from "@/services/retrouvailles/retrouvailles.service"
import { followAuthor } from "@/services/posts/posts.service"
import { resolveMediaUrl } from "@/lib/dughu"
import type { RetrouvaillePerson } from "@/types/retrouvailles/retrouvailles.types"
import { toast } from "sonner"

interface SuggestionsAmisCardProps {
  currentUser?: {
    id?: string
    dughu?: { userId?: string | number }
  } | null
  className?: string
}

export default function SuggestionsAmisCard({ currentUser, className }: SuggestionsAmisCardProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [persons, setPersons] = useState<RetrouvaillePerson[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [hidden, setHidden] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  // Navigation scroll state
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)
  const hasMoved = useRef(false)

  const userId = String(currentUser?.dughu?.userId || currentUser?.id || "")

  // Chargement des suggestions depuis GET /retrouvailles?tab=suggestions
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetchRetrouvailles({
          tab: "suggestions",
          userId: userId || undefined,
        })
        if (!active) return

        if (res.success) {
          // Rassembler toutes les personnes suggérées (groupes d'affinité ou liste plate)
          const collected: RetrouvaillePerson[] = []
          if (Array.isArray(res.groups) && res.groups.length > 0) {
            for (const group of res.groups) {
              if (Array.isArray(group.persons)) {
                collected.push(...group.persons)
              }
            }
          } else if (Array.isArray(res.persons) && res.persons.length > 0) {
            collected.push(...res.persons)
          }

          // Dédoublonnage strict par ID
          const uniqueMap = new Map<string, RetrouvaillePerson>()
          for (const p of collected) {
            if (p && p.id && !uniqueMap.has(String(p.id))) {
              uniqueMap.set(String(p.id), p)
            }
          }
          const uniqueList = Array.from(uniqueMap.values())
          setPersons(uniqueList)
        }
      } catch (err) {
        console.error("SuggestionsAmisCard load error:", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [userId])

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
  }, [updateScrollState, persons.length])

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

  // Retrait animé d'une personne suggérée
  const handleDismiss = (personId: string) => {
    setDismissedIds((prev) => new Set(prev).add(personId))
    setTimeout(() => {
      setPersons((prev) => prev.filter((p) => String(p.id) !== personId))
    }, 280)
  }

  // Toggle follow / abonnement
  const handleToggleFollow = async (person: RetrouvaillePerson) => {
    const targetId = String(person.id)
    const isCurrentlyFollowing = Boolean(followingMap[targetId])
    const nextFollowing = !isCurrentlyFollowing

    // Optimiste
    setFollowingMap((prev) => ({ ...prev, [targetId]: nextFollowing }))
    setLoadingMap((prev) => ({ ...prev, [targetId]: true }))

    try {
      await followAuthor({
        userId: userId || "",
        targetId,
        following: nextFollowing,
      })
      toast.success(nextFollowing ? `Abonné à ${person.name}` : `Abonnement retiré pour ${person.name}`)
    } catch {
      // Rollback
      setFollowingMap((prev) => ({ ...prev, [targetId]: isCurrentlyFollowing }))
      toast.error("Impossible de modifier l'abonnement.")
    } finally {
      setLoadingMap((prev) => ({ ...prev, [targetId]: false }))
    }
  }

  // Personnes visibles (non masquées)
  const visiblePersons = persons.filter((p) => !dismissedIds.has(String(p.id)))

  // Si masqué ou liste vide (et pas en cours de chargement initial), ne rien afficher
  if (hidden || (!loading && visiblePersons.length === 0)) {
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
            <Users size={18} />
          </div>
          <h3 className="font-bold text-[15px] text-[#050505] dark:text-[#F3F4F6] truncate">
            Profils par affinités
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
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-white dark:bg-[#252525] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-1 text-xs text-[#050505] dark:text-gray-200 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    setHidden(true)
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

      {/* Carousel horizontal de mini-cartes */}
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
          {loading && visiblePersons.length === 0
            ? [1, 2, 3, 4].map((i) => (
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
            : visiblePersons.map((person) => {
                const isDismissing = dismissedIds.has(String(person.id))
                const isFollowing = Boolean(followingMap[String(person.id)])
                const isFollowLoading = Boolean(loadingMap[String(person.id)])
                const avatarUrl = person.avatar ? resolveMediaUrl(person.avatar) : "/images/avatar.png"
                const profileUrl = person.username
                  ? `/profile/${encodeURIComponent(person.username)}`
                  : `/profile/${encodeURIComponent(person.id)}`
                const mutualCount = Number(
                  person.affinity?.mutualFriendsCount ??
                  (person as any).mutual_friends_count ??
                  (person as any).mutualFriendsCount ??
                  0
                )

                const handleNavigate = () => {
                  if (hasMoved.current) return
                  router.push(profileUrl)
                }

                return (
                  <div
                    key={person.id}
                    className={cn(
                      "w-[175px] sm:w-[190px] shrink-0 bg-white dark:bg-[#252525] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 hover:shadow-md",
                      isDismissing && "opacity-0 scale-90 pointer-events-none"
                    )}
                  >
                    {/* Photo de profil grand format */}
                    <div
                      className="relative w-full h-44 bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group"
                      onClick={handleNavigate}
                    >
                      <Image
                        src={avatarUrl}
                        alt={person.name}
                        fill
                        unoptimized
                        sizes="200px"
                        draggable={false}
                        className="object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />

                      {/* Bouton × pour masquer la personne */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss(String(person.id))
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
                          title={person.name}
                        >
                          {person.name}
                        </h4>

                        {/* Amis en commun si disponible (> 0) */}
                        {mutualCount > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#65676B] dark:text-[#A1A1AA]">
                            <Users size={12} className="shrink-0 text-[#A35A2A]" />
                            <span className="truncate">
                              {mutualCount === 1 ? "1 ami(e) en commun" : `${mutualCount} amis en commun`}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Bouton S'abonner pleine largeur */}
                      <div className="mt-3">
                        <FollowButton
                          isFollowing={isFollowing}
                          isLoading={isFollowLoading}
                          onClick={() => handleToggleFollow(person)}
                          className="w-full text-xs py-1.5"
                        />
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
          onClick={() => router.push("/retrouvailles?tab=suggestions")}
          className="text-[13px] font-semibold text-[#A35A2A] hover:text-[#8B4A1F] dark:text-[#B46D1C] transition hover:underline"
        >
          Voir tout
        </button>
      </div>
    </div>
  )
}
