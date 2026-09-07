"use client"

import {
  Clapperboard,
  Sparkles,
  Users,
  Film,
  Coins,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CapsuleTab = "all" | "following" | "mine" | "points"

interface CapsuleSidebarProps {
  activeTab: CapsuleTab
  onTabChange: (tab: CapsuleTab) => void
  userId?: string
  myCapsulesCount?: number
  pointsTotal?: number
  pointsLoading?: boolean
  onOpenCreator?: () => void
  className?: string
}

export default function CapsuleSidebar({
  activeTab,
  onTabChange,
  userId,
  myCapsulesCount,
  pointsTotal,
  pointsLoading = false,
  onOpenCreator,
  className,
}: CapsuleSidebarProps) {
  const navItems: {
    id: CapsuleTab
    label: string
    subtitle: string
    icon: typeof Sparkles
    badge?: string | number
  }[] = [
    {
      id: "all",
      label: "Pour vous",
      subtitle: "Toutes les capsules",
      icon: Sparkles,
    },
    {
      id: "following",
      label: "Suivi(e)s",
      subtitle: "Capsules des abonnements",
      icon: Users,
    },
    {
      id: "mine",
      label: "Mes capsules",
      subtitle: "Vos vidéos publiées",
      icon: Film,
      badge: myCapsulesCount !== undefined && myCapsulesCount > 0 ? myCapsulesCount : undefined,
    },
    {
      id: "points",
      label: "Mes points Capsule",
      subtitle: "Historique & récompenses",
      icon: Coins,
      badge: pointsTotal !== undefined && pointsTotal > 0 ? `${pointsTotal} pts` : undefined,
    },
  ]

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm border border-gray-100",
        className
      )}
    >
      {/* ── En-tête Sidebar ── */}
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#985810]/10 text-[#985810]">
          <Clapperboard size={22} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#2D2D2D] truncate">Capsules Dughu</h2>
          <p className="text-xs text-[#65676B] truncate">Vidéos courtes & points</p>
        </div>
      </div>

      {/* ── Bouton Créer ── */}
      {userId && onOpenCreator && (
        <button
          type="button"
          onClick={onOpenCreator}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#985810] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#7d480d] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#985810] active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden />
          <span>Créer une capsule</span>
        </button>
      )}

      {/* ── Navigation principale ── */}
      <nav className="flex flex-col gap-1.5" aria-label="Navigation Capsules">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-all",
                isActive
                  ? "bg-[#985810] text-white shadow-sm font-semibold"
                  : "text-[#2D2D2D] hover:bg-[#F6F7F9]"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[#985810]/10 text-[#985810] group-hover:bg-[#985810]/15"
                )}
              >
                <Icon size={19} aria-hidden />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold truncate leading-snug">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                        isActive
                          ? "bg-white text-[#985810]"
                          : "bg-[#985810]/10 text-[#985810]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-[11px] truncate mt-0.5",
                    isActive ? "text-white/80" : "text-[#65676B]"
                  )}
                >
                  {item.subtitle}
                </p>
              </div>
            </button>
          )
        })}
      </nav>

      {/* ── Widget récapitulatif des points Capsule ── */}
      {userId && (
        <div
          onClick={() => onTabChange("points")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onTabChange("points")
            }
          }}
          className={cn(
            "group relative mt-1 cursor-pointer overflow-hidden rounded-2xl border p-3.5 transition-all",
            activeTab === "points"
              ? "border-[#985810] bg-[#985810]/5 ring-1 ring-[#985810]/20"
              : "border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-orange-50/40 hover:border-amber-300 hover:shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#985810] text-white">
                <Coins size={15} />
              </span>
              <span className="text-xs font-bold text-[#2D2D2D]">Points Capsule</span>
            </div>
            <ArrowRight size={14} className="text-[#985810] transition-transform group-hover:translate-x-0.5" />
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-lg font-extrabold text-[#985810]">
              {pointsLoading ? (
                <span className="text-xs text-[#985810]/70">Chargement…</span>
              ) : pointsTotal !== undefined ? (
                `${pointsTotal} pts`
              ) : (
                "—"
              )}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#65676B]">
              <TrendingUp size={11} className="text-emerald-600" />
              Récompenses
            </span>
          </div>
          <p className="mt-1 text-[10px] text-[#65676B] line-clamp-1">
            Gagnez des points en publiant & visionnant
          </p>
        </div>
      )}
    </div>
  )
}
