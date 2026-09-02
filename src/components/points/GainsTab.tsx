"use client"

/**
 * Onglet « Mes gains » : bandeau statique, 3 cartes de statistiques
 * (points disponibles via /api/pointsHistory, points convertis et gains du
 * jour statiques), barème « Comment gagner des points » et tableau
 * « Historique des points ».
 */

import { Coins, Repeat2, CalendarClock } from "lucide-react"
import StatCard from "./StatCard"
import PointsHistoryTable from "./PointsHistoryTable"
import { GAINS_BANNER, EARN_RULES } from "./points.constants"
import type { PointsHistoryEntry } from "@/types/points/points.types"
import { cn } from "@/lib/utils"

interface GainsTabProps {
  /** Points disponibles (API /pointsToday/:userId → `total`). */
  balance: number
  /** Points convertis (API → `converted`). */
  converted?: number
  /** Gains du jour (API → `gain_today`). */
  gainToday?: number
  entries: PointsHistoryEntry[]
  loading: boolean
}

export default function GainsTab({ balance, converted = 0, gainToday = 0, entries, loading }: GainsTabProps) {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Mes gains">
      {/* Bandeau statique */}
      <header className="rounded-2xl bg-gradient-to-br from-[#6B3F1D] to-[#8B5A2B] p-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold sm:text-xl">{GAINS_BANNER.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/85">{GAINS_BANNER.subtitle}</p>
      </header>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Coins}
          label="Points disponibles"
          value={balance}
          format="decimal"
          sublabel="Utilisables dès maintenant"
          loading={loading}
        />
        <StatCard
          icon={Repeat2}
          label="Points convertis"
          value={converted}
          format="decimal"
          sublabel="Déjà utilisés"
          loading={loading}
        />
        <StatCard
          icon={CalendarClock}
          label="Mes gains du jour"
          value={gainToday}
          format="integer"
          sublabel="+ aujourd'hui"
          tone="success"
          loading={loading}
        />
      </div>

      {/* Barème : comment gagner des points */}
      <section
        id="bareme-points"
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <h2 className="text-base font-bold text-[#2D2D2D]">Comment gagner des points</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EARN_RULES.map(({ key, icon: Icon, title, items, tone }) => (
            <div
              key={key}
              className={cn(
                "rounded-xl border p-3.5",
                tone === "danger" ? "border-red-200 bg-red-50/60" : "border-gray-200 bg-gray-50/60"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    tone === "danger" ? "bg-red-100 text-red-600" : "bg-[#F5EFE8] text-[#A35A2A]"
                  )}
                  aria-hidden
                >
                  <Icon size={16} />
                </span>
                <h3
                  className={cn(
                    "text-sm font-bold",
                    tone === "danger" ? "text-red-700" : "text-[#2D2D2D]"
                  )}
                >
                  {title}
                </h3>
              </div>
              <ul className="mt-2 space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-[#65676B]">
                    <span
                      aria-hidden
                      className={cn("mt-1.5 size-1 shrink-0 rounded-full", tone === "danger" ? "bg-red-400" : "bg-[#A35A2A]/60")}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Historique des points */}
      <PointsHistoryTable entries={entries} loading={loading} />
    </div>
  )
}
