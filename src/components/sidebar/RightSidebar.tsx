"use client"

import { useState, useMemo, useEffect } from "react"
import { BarChart3, Users, Globe, TrendingUp, Activity as ActivityIcon, Heart, MessageCircle, Repeat2, Share2, PenSquare, UserPlus, ThumbsUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Card from "@/components/common/Card"
import Avatar from "@/components/common/Avatar"
import { Skeleton } from "@/components/ui/skeleton"
import MiniProfileCard from "@/components/profile/MiniProfileCard"
import BoostedPostCard from "@/components/promotion/BoostedPostCard"
import GroupCarousel from "@/components/sidebar/GroupCarousel"
import { fetchSuggestions, fetchPointsToday } from "@/services/posts/feed.service"
import { useProfile } from "@/hooks/profile/use-profile"
import { useAuth } from "@/hooks/auth/use-auth"

interface RightSidebarProps {
  user?: any
  /** Mobile / tablette : ouvre le tiroir coulissant depuis la droite. */
  open?: boolean
  /** Mobile / tablette : demande de fermeture du tiroir. */
  onClose?: () => void
  /** Si true, masque la version fixe desktop (xl+) — utilisé sur les pages
   *  avec noRightSidebar={true} pour ne pas occuper la colonne droite.
   *  Le tiroir mobile reste toujours fonctionnel. */
  hideOnDesktop?: boolean
}

interface BoostedPost {
  id: string
  content: string
  image?: string | null
  video?: string | null
  author: {
    id: string
    name: string | null
    username: string | null
    avatar: string | null
  }
  _count?: {
    comments?: number
    likes?: number
    views?: number
  }
}

interface ActivityItem {
  id: string
  activityType: string
  postId?: string | null
  description?: string | null
  createdAt: string
  user?: {
    id: string
    name: string | null
    avatar: string | null
  } | null
}

const PROMOTIONS_PER_PAGE = 2
const TOTAL_DOTS = 5

// --- Constantes de layout responsive (xl+ & 2xl+) ---
// - Sur xl (1280px à 1535px, ex: 1280x903 à 1417x903) :
//   la sidebar droite se positionne à right-4 (16px) avec une réservation de
//   264px dans MainLayout, ce qui permet au feed central (composer + posts)
//   d'avoir une largeur confortable de 714px à 780px sans être comprimé.
// - Sur 2xl (1536px+) :
//   la sidebar droite reprend son décalage aéré de 220px (GAP_RIGHT_PX) et sa
//   réservation de 484px adaptée aux très grands moniteurs.
const GAP_RIGHT_PX = 220
const SIDEBAR_WIDTH_PX = 240

const GROUPS = [
  { id: "1", name: "Startups Afrique", description: "Rejoignez la communauté", members: "2.1k membres" },
  { id: "2", name: "Tech & Dev CI", description: "Développeurs passionnés", members: "1.5k membres" },
  { id: "3", name: "Créateurs CI", description: "Design & Créativité", members: "980 membres" },
  { id: "4", name: "Business Hub", description: "Entrepreneurs africains", members: "3.2k membres" },
  { id: "5", name: "Music CI", description: "Artistes ivoiriens", members: "1.8k membres" },
  { id: "6", name: "Sport & Fit", description: "Sportifs passionnés", members: "750 membres" },
]

const SPACES = [
  { id: "1", name: "Espace Tech", description: "Innovation et technologie", members: "1.2k membres" },
  { id: "2", name: "Espace Culture", description: "Culture africaine", members: "890 membres" },
  { id: "3", name: "Espace Business", description: "Business networking", members: "2.3k membres" },
  { id: "4", name: "Espace Jeunesse", description: "Jeunes talents", members: "1.5k membres" },
  { id: "5", name: "Espace Femme", description: "Leadership féminin", members: "670 membres" },
]

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Formater l'heure relative en français
function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const s = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d}j`
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " à " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

// Icône et libellé selon le type d'activité
function getActivityMeta(type: string): { icon: React.ReactNode; action: string; color: string } {
  switch (type) {
    case "post":
      return { icon: <PenSquare size={16} />, action: "a publié une publication", color: "bg-[#A35A2A]/10 text-[#A35A2A]" }
    case "reaction":
      return { icon: <Heart size={16} />, action: "a aimé une publication", color: "bg-[#E4405F]/10 text-[#E4405F]" }
    case "comment":
      return { icon: <MessageCircle size={16} />, action: "a commenté une publication", color: "bg-[#1877F2]/10 text-[#1877F2]" }
    case "repost":
      return { icon: <Repeat2 size={16} />, action: "a repartagé une publication", color: "bg-[#16A34A]/10 text-[#16A34A]" }
    case "share":
      return { icon: <Share2 size={16} />, action: "a partagé une publication", color: "bg-[#9333EA]/10 text-[#9333EA]" }
    case "follow":
      return { icon: <UserPlus size={16} />, action: "a reçu un nouvel abonné", color: "bg-[#0EA5E9]/10 text-[#0EA5E9]" }
    default:
      return { icon: <ActivityIcon size={16} />, action: "a fait une activité", color: "bg-[#65676B]/10 text-[#65676B]" }
  }
}

export default function RightSidebar({ user: propUser, open = false, onClose, hideOnDesktop = false }: RightSidebarProps) {
  const { data: authUser, isLoading: authLoading } = useAuth()
  const user = propUser ?? authUser

  const [activeDot, setActiveDot] = useState(0)
  const [boostedPosts, setBoostedPosts] = useState<BoostedPost[]>([])
  const [shuffledBoosted, setShuffledBoosted] = useState<BoostedPost[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [suggestedGroups, setSuggestedGroups] = useState<any[]>([])
  const [suggestedPages, setSuggestedPages] = useState<any[]>([])
  // Total de points de l'utilisateur (endpoint /pointsToday/{id} → `total`).
  const [totalPoints, setTotalPoints] = useState<number | undefined>(undefined)
  // `true` tant que les données distantes (suggestions + points) ne sont pas
  // arrivées : on affiche des squelettes au lieu des replis statiques (GROUPS,
  // SPACES, tendances…) pour ne pas « flasher » de fausses infos au chargement.
  const [loading, setLoading] = useState(true)

  // Vrais compteurs du profil connecté (GET /api/profile → stats : followersNbr,
  // followingsNbr, NbrPostsTotal côté API Dughu). Source de vérité pour la
  // carte mini-profil, à la place des compteurs locaux user._count. Le hook
  // passe par le service frontend (instance Axios cliente), jamais de fetch natif.
  const dughuId = String(user?.dughu?.userId ?? user?.dughhuUserId ?? "").trim()
  const profileParams = useMemo(
    () => ({
      ...(dughuId ? { dughuUserId: dughuId } : {}),
      ...(user?.id ? { userId: String(user.id) } : {}),
      ...(user?.username ? { slug: String(user.username) } : {}),
    }),
    [dughuId, user?.id, user?.username]
  )
  const { data: profileData, isLoading: profileLoading } = useProfile(profileParams)

  // Charger les posts boostés, les activités et les points du jour
  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      // On repasse en chargement à chaque (re)lancé (changement de user)
      // pour ne jamais afficher de repli statique pendant une attente réseau.
      setLoading(true)
      const userId = String(user?.id ?? "").trim()
      const dughhuUserId = String(user?.dughu?.userId ?? user?.dughhuUserId ?? "").trim()
      // Session pas encore résolue (auth en cours) : on garde les squelettes,
      // l'effet se relancera quand `user` arrivera.
      if (!userId && !dughhuUserId) {
        if (authLoading) {
          if (!cancelled) setLoading(true)
          return
        }
        if (!cancelled) setLoading(false)
        return
      }
      try {
        // Charger les suggestions
        const data = await fetchSuggestions(userId, { dughhuUserId })
        if (cancelled) return
        if (data.success) {
          if (data.boostedPosts) {
            setBoostedPosts(data.boostedPosts as BoostedPost[])
            setShuffledBoosted(data.boostedPosts as BoostedPost[])
          }
          if (data.activities) {
            setActivities(data.activities as ActivityItem[])
          }
          if (Array.isArray(data.groups) && data.groups.length > 0) {
            setSuggestedGroups(
              data.groups.map((g: any) => ({
                id: g.id,
                name: g.name,
                description: g.description,
                members: g.memberCount ? `${g.memberCount} membres` : "0 membres",
                cover: g.cover,
                avatar: g.image,
              }))
            )
          }
          if (Array.isArray(data.pages) && data.pages.length > 0) {
            setSuggestedPages(
              data.pages.map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                members: p.likes ? `${p.likes} j'aime` : "",
                cover: p.cover,
                avatar: p.image,
              }))
            )
          }
          if (Array.isArray(data.hashtags) && data.hashtags.length > 0) {
            setTrends(data.hashtags.slice(0, 6).map((t: any) => ({ tag: t.tag, count: t.postCount || 0 })))
          }
        }
        // Charger les points totaux de l'utilisateur
        if (userId) {
          const pointsData = await fetchPointsToday(userId)
          if (!cancelled) {
            setTotalPoints(pointsData.total ?? 0)
          }
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [user, authLoading])

  const currentBoosted = useMemo(() => {
    if (shuffledBoosted.length === 0) return []
    const start = activeDot * PROMOTIONS_PER_PAGE
    return shuffledBoosted.slice(start, start + PROMOTIONS_PER_PAGE)
  }, [shuffledBoosted, activeDot])

  const handleDotClick = (dotIndex: number) => {
    setActiveDot(dotIndex)
    if (boostedPosts.length > 0) {
      setShuffledBoosted(shuffleArray(boostedPosts))
    }
  }

  const [trends, setTrends] = useState([
    { tag: "#TechCI", count: 124 },
    { tag: "#Abidjan", count: 174 },
    { tag: "#Dughu", count: 224 },
  ])

  const isAnyLoading = loading || authLoading

  return (
    // Rendu adaptatif d'une seule instance (un seul fetch de /api/suggestions) :
    // - < xl (mobile/tablette) : tiroir coulissant fixe depuis la droite,
    //   ouvert par le bouton grille du header (prop `open`) — caché hors écran
    //   sinon (translate-x-full + invisible) ;
    // - xl+ (desktop) : colonne fixe et IMMOBILE, décalée de GAP_RIGHT_PX
    //   (220px) du bord droit, toujours visible — SAUF si hideOnDesktop=true
    //   (pages avec noRightSidebar) où la colonne fixe est masquée mais le
    //   tiroir mobile reste fonctionnel.
    <aside
      aria-label="Sidebar droite"
      className={cn(
        "flex flex-col fixed top-0 right-0 bottom-0 w-[300px] max-w-[85vw] z-50",
        "overflow-y-auto scrollbar-hide space-y-5 pb-10 pl-2 pr-3 bg-[#f7f8fa]",
        "transition-[transform,visibility] duration-300 ease-in-out",
        // Tiroir mobile : ouvert/fermé selon la prop `open`
        open ? "translate-x-0 visible" : "translate-x-full invisible",
        // Desktop xl+ : colonne fixe immobile, sauf si hideOnDesktop=true.
        // Sur xl (1280px - 1535px) : right-4 pour libérer de l'espace pour le feed.
        // Sur 2xl (1536px+) : right-[220px] pour les moniteurs très larges.
        !hideOnDesktop && "xl:translate-x-0 xl:visible xl:top-[88px] xl:bottom-0 xl:w-[240px] xl:max-w-none xl:right-4 2xl:right-[220px] xl:z-30"
      )}
    >
      {/* Barre de fermeture — mobile & tablette uniquement */}
      <div className="xl:hidden flex items-center justify-between px-1 pt-2">
        <span className="text-[15px] font-bold text-[#2D2D2D]">Découvertes</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la sidebar droite"
          className="w-9 h-9 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#050505] hover:bg-[#E4E6EB] transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Mini profil */}
      <MiniProfileCard
        user={user}
        points={totalPoints}
        stats={profileData?.stats}
        loading={isAnyLoading || profileLoading || !user}
      />

      {/* Posts boostés */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <TrendingUp size={15} className="text-[#A35A2A]" />
          <h3 className="text-[14px] font-bold text-[#2D2D2D]">Boostés pour vous</h3>
        </div>

        <div className="flex flex-col gap-3">
          {isAnyLoading ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Chargement des posts boostés…</span>
            </div>
          ) : currentBoosted.length > 0 ? (
            currentBoosted.map((p, i) => (
              <BoostedPostCard
                key={`${activeDot}-${p.id}-${i}`}
                image={p.image || p.video}
                authorName={p.author?.name}
                authorAvatar={p.author?.avatar}
                title={p.content}
                views={p._count?.views || null}
              />
            ))
          ) : (
            <div className="text-center py-8 text-[12px] text-[#65676B]">
              Aucun post boosté
            </div>
          )}
        </div>

        {/* Points de pagination */}
        {boostedPosts.length > PROMOTIONS_PER_PAGE && (
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={cn(
                  "transition-all duration-300 rounded-full",
                  activeDot === i
                    ? "w-4 h-1.5 bg-[#A35A2A]"
                    : "w-1.5 h-1.5 bg-[#E4E6EB] hover:bg-[#B87333]/50"
                )}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Groupes */}
      <GroupCarousel
        title="Groupe suggéré"
        loading={isAnyLoading}
        items={suggestedGroups.length > 0 ? suggestedGroups : GROUPS}
        defaultCover="/images/group/default-cover.jpg"
        defaultAvatar="/images/group/default-avatar.jpg"
        icon={<Users size={14} className="text-[#A35A2A]" />}
        buttonLabel="Adhérer"
        buttonColor="#A35A2A"
      />

      {/* Espaces */}
      <GroupCarousel
        title="Espace suggéré"
        loading={isAnyLoading}
        items={suggestedPages.length > 0 ? suggestedPages : SPACES}
        defaultCover="/images/page/default-cover.jpg"
        defaultAvatar="/images/page/default-avatar.jpg"
        icon={<Globe size={14} className="text-[#A35A2A]" />}
        buttonLabel="J'aime"
        buttonColor="#FF0000"
        buttonHoverColor="#FF000099"
        buttonIcon={<ThumbsUp size={12} />}
      />

      {/* Dernière activité */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <ActivityIcon size={15} className="text-[#A35A2A]" />
          <h3 className="text-[14px] font-bold text-[#2D2D2D]">Dernière activité</h3>
        </div>

        <div className="flex flex-col">
          {isAnyLoading ? (
            <div className="flex flex-col space-y-3" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/5" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                </div>
              ))}
              <span className="sr-only">Chargement de l&apos;activité…</span>
            </div>
          ) : activities.length > 0 ? (
            activities.slice(0, 5).map((act, i) => {
              const meta = getActivityMeta(act.activityType)
              const userName = act.user?.name || user?.name || "Utilisateur"
              const avatarSrc = act.user?.avatar || user?.avatar
              return (
                <div key={act.id || i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0">
                  {/* Photo de profil */}
                  <Avatar
                    src={avatarSrc}
                    name={userName}
                    size="xs"
                    className="w-8 h-8 shrink-0 border border-gray-200"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">
                      <span className="font-semibold text-[#050505]">{userName}</span>{" "}
                      <span className="text-[#65676B]">{meta.action}</span>
                    </p>
                    <p className="text-[11px] text-[#65676B] mt-0.5">{formatActivityTime(act.createdAt)}</p>
                  </div>
                  {/* Petite icône selon le type d'activité */}
                  <span className={cn("w-7 h-7 shrink-0 rounded-full flex items-center justify-center", meta.color)}>
                    {meta.icon}
                  </span>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-[12px] text-[#65676B]">
              Aucune activité pour le moment
            </div>
          )}
        </div>
      </div>

      {/* Tendances */}
      <Card className="p-5 rounded-[24px]">
        <h4 className="font-bold text-[16px] mb-3 text-[#2D2D2D]">On parle de ça</h4>
        <div className="space-y-1">
          {isAnyLoading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-5 w-5 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/5" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Chargement des tendances…</span>
            </div>
          ) : trends.map((t) => (
            <div key={t.tag} className="flex items-center gap-3 hover:bg-[#F0F2F5] p-3 rounded-xl cursor-pointer transition">
              <BarChart3 size={18} className="text-[#E4405F] shrink-0" />
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#2D2D2D]">{t.tag}</p>
                <p className="text-[12px] text-[#65676B]">{t.count} publications</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  )
}