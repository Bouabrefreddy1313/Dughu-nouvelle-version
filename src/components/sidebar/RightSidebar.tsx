"use client"

import { useState, useMemo, useEffect } from "react"
import { BarChart3, Users, Globe, TrendingUp, Activity as ActivityIcon, Heart, MessageCircle, Repeat2, Share2, PenSquare, UserPlus, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import Card from "@/components/common/Card"
import Avatar from "@/components/common/Avatar"
import MiniProfileCard from "@/components/profile/MiniProfileCard"
import BoostedPostCard from "@/components/promotion/BoostedPostCard"
import GroupCarousel from "@/components/sidebar/GroupCarousel"

interface RightSidebarProps {
  user?: any
  chatOpen?: boolean
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

export default function RightSidebar({ user, chatOpen }: RightSidebarProps) {
  const [activeDot, setActiveDot] = useState(0)
  const [boostedPosts, setBoostedPosts] = useState<BoostedPost[]>([])
  const [shuffledBoosted, setShuffledBoosted] = useState<BoostedPost[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])

  // Charger les posts boostés et les activités
  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const userId = user?.id || ""
        const res = await fetch(`/api/suggestions?userId=${userId}`)
        const data = await res.json()
        if (cancelled) return
        if (data.success) {
          if (data.boostedPosts) {
            setBoostedPosts(data.boostedPosts)
            setShuffledBoosted(data.boostedPosts)
          }
          if (data.activities) {
            setActivities(data.activities)
          }
        }
      } catch {
        /* silent */
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [user])

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

  const trends = [
    { tag: "#TechCI", count: 124 },
    { tag: "#Abidjan", count: 174 },
    { tag: "#Dughu", count: 224 },
  ]

  return (
    <aside className={cn(
      "hidden xl:flex flex-col fixed top-[72px] lg:top-[88px] bottom-0 w-[240px] overflow-y-auto scrollbar-hide space-y-5 pb-10 pl-2 pr-3 z-30 transition-[right] duration-300 ease-in-out",
      chatOpen ? "right-[400px]" : "right-[340px]"
    )}>
      {/* Mini profil */}
      <MiniProfileCard user={user} />

      {/* Posts boostés */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <TrendingUp size={15} className="text-[#A35A2A]" />
          <h3 className="text-[14px] font-bold text-[#2D2D2D]">Boostés pour vous</h3>
        </div>

        <div className="flex flex-col gap-3">
          {currentBoosted.length > 0 ? (
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
        items={GROUPS}
        defaultCover="/images/group/default-cover.jpg"
        defaultAvatar="/images/group/default-avatar.jpg"
        icon={<Users size={14} className="text-[#A35A2A]" />}
        buttonLabel="Adhérer"
        buttonColor="#A35A2A"
      />

      {/* Espaces */}
      <GroupCarousel
        title="Espace suggéré"
        items={SPACES}
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
          {activities.length > 0 ? (
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
          {trends.map((t) => (
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