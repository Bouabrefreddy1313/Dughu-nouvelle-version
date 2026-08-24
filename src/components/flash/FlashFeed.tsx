"use client"

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH FEED — Rail des avatars des amis ayant une story active ("Flash").
//
// Endpoint utilisé (source de vérité Dughu) :
//   GET /getFriendsStories?user_id={userId}&per_page={perPage}&page={page}
// Le statut "vu / non-vu" vient de l'API (viewed/is_viewed) ; s'il est absent
// (allViewed === null), on mémorise un état "vu" localement (Set) côté UI.
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { FlashAddCard, FlashStoryCard, type FlashCardUser } from "@/components/flash/FlashStoryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useFlashFeed, type FlashUserStory } from "@/hooks/queries/use-flash"
import { resolvePostColorCss } from "@/lib/constants"

// Résout la couleur de fond d'une story : accepte un ID numérique Dughu
// ("18"), un code hexadécimal ("#000000") ou un dégradé CSS déjà prêt.
function resolveStoryBg(raw: string | null | undefined): string {
  if (!raw) return ""
  return resolvePostColorCss(raw)?.bg ?? String(raw).trim()
}

interface FlashFeedProps {
  userId?: string
  currentUser?: FlashCardUser
  onAddStory?: () => void
  onOpenFlash?: (targetUserId: string, user?: { name?: string | null; avatar?: string | null }) => void
}

export default function FlashFeed({ userId, currentUser, onAddStory, onOpenFlash }: FlashFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // État local "vu" : statut affiché lorsque l'API ne renvoie pas de statut.
  const [locallyViewed, setLocallyViewed] = useState<Set<string>>(new Set())

  const { data, isLoading, isError, refetch } = useFlashFeed(userId)

  const markLocalViewed = (userIdToMark: string) => {
    setLocallyViewed((prev) => {
      const next = new Set(prev)
      next.add(userIdToMark)
      return next
    })
  }

  const users: FlashUserStory[] = data?.users || []

  // Ma propre carte : détectée pour afficher mon dernier Flash dans le rail comme
  // une carte story dédiée (à côté de la carte "Ajouter un flash"), et pour ne
  // pas la dupliquer dans la liste des amis.
  const selfId = String(currentUser?.dughu?.userId || currentUser?.id || "")
  const selfEntry = selfId ? users.find((u) => String(u.userId) === selfId) : undefined
  const friendUsers = users.filter((u) => String(u.userId) !== selfId)

  // Dernier Flash publié par moi (les stories sont triées, la plus récente en premier).
  const selfStory = selfEntry?.stories?.[0]

  // Statut visuel final : l'état local (j'ai ouvert ce Flash) prime, sinon le
  // statut API. Sans cela, l'anneau orange resterait affiché tant que l'API
  // n'a pas rafraîchi son propre statut `seen`.
  const isViewed = (u: FlashUserStory) =>
    locallyViewed.has(u.userId) || u.allViewed === true

  const handleOpen = (u: FlashUserStory) => {
    if (u.allViewed === null || u.allViewed === false) markLocalViewed(u.userId)
    onOpenFlash?.(u.userId, u.user || undefined)
  }

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" })
  }

  return (
    <div className="relative mb-4 group/rail">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Créer un Flash (rail) — garde toujours la photo de profil */}
        <FlashAddCard currentUser={currentUser} onClick={onAddStory} />

        {/* Mon dernier Flash — carte story dédiée dans le rail, comme les amis */}
        {selfEntry && selfStory && (
          <FlashStoryCard
            key={`self-${selfEntry.userId}`}
            image={selfStory.image}
            video={selfStory.video}
            thumbnail={selfStory.thumbnail}
            bg={selfStory.bg ? resolveStoryBg(selfStory.bg) : undefined}
            text={selfStory.text}
            avatar={currentUser?.avatar || selfEntry.user?.avatar}
            name={currentUser?.name || selfEntry.user?.name}
            viewed={isViewed(selfEntry)}
            ariaLabel="Voir mes Flash"
            onClick={() => onOpenFlash?.(selfEntry.userId, { name: currentUser?.name || selfEntry.user?.name, avatar: currentUser?.avatar || selfEntry.user?.avatar })}
          />
        )}

        {/* État de chargement — skeleton imitant les cartes Flash */}
        {isLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={`flash-skeleton-${i}`}
                className="flex flex-col items-center shrink-0"
              >
                <div className="w-[120px] h-[168px] rounded-2xl overflow-hidden relative bg-gray-100 border border-gray-200/80">
                  {/* vignette principale */}
                  <Skeleton className="absolute inset-0 rounded-none bg-gray-200" />
                  {/* avatar en haut à gauche */}
                  <Skeleton className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-gray-300" />
                  {/* nom incrusté en bas */}
                  <Skeleton className="absolute bottom-2 left-2.5 w-16 h-3 rounded bg-gray-300" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* État d'erreur réseau */}
        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 w-[220px] h-[168px] rounded-2xl bg-red-50/60 px-4 text-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-xs text-red-600">Impossible de charger les Flash</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-semibold text-[#A35A2A] underline underline-offset-2"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Cartes des amis ayant une story active */}
        {!isLoading && !isError && friendUsers.map((u) => (
          <FlashStoryCard
            key={u.userId}
            image={u.stories[0]?.image}
            video={u.stories[0]?.video}
            thumbnail={u.stories[0]?.thumbnail}
            bg={u.stories[0]?.bg ? resolveStoryBg(u.stories[0]?.bg) : undefined}
            text={u.stories[0]?.text}
            avatar={u.user?.avatar}
            name={u.user?.name}
            viewed={isViewed(u)}
            ariaLabel={`Ouvrir les Flash de ${u.user?.name || "Utilisateur"}`}
            onClick={() => handleOpen(u)}
          />
        ))}
      </div>

      {/* Navigation */}
      {users.length > 4 && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Précédent"
            className="absolute left-1 top-[76px] -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#E08543] z-20 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Suivant"
            className="absolute right-1 top-[76px] -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[#65676B] hover:text-[#E08543] z-20 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  )
}

