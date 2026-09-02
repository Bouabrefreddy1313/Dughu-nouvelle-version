"use client"

/**
 * Page « Points et activités » — 3 onglets : Mes gains (API /pointsHistory),
 * Mes badges (API /badge et /badge/[userId]) et Utilisations (statique).
 * L'ID Dughu de l'utilisateur connecté est résolu via useAuth.
 */

import { useState } from "react"
import { Coins, Trophy, ArrowLeftRight } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { usePointsHistory, usePointsToday } from "@/hooks/points/use-points"
import TabNavigation from "./TabNavigation"
import GainsTab from "./GainsTab"
import BadgesTab from "./BadgesTab"
import UsagesTab from "./UsagesTab"

type PointsTab = "gains" | "badges" | "usages"

const TABS: { key: PointsTab; label: string; icon: typeof Coins }[] = [
  { key: "gains", label: "Mes gains", icon: Coins },
  { key: "badges", label: "Mes badges", icon: Trophy },
  { key: "usages", label: "Utilisations", icon: ArrowLeftRight },
]

export default function PointsPage() {
  const [tab, setTab] = useState<PointsTab>("gains")

  const { data: rawUser } = useAuth()
  // ID Dughu numérique de l'utilisateur connecté (source de vérité session).
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || "")

  const pointsQuery = usePointsHistory({ userId })
  // Solde et compteurs du jour — même source que le mini-profil (/pointsToday/:userId).
  const pointsTodayQuery = usePointsToday({ userId })
  const pointsToday = pointsTodayQuery.data ?? {}

  return (
    <MainLayout user={rawUser} noRightSidebar active="points" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-5 flex items-center gap-3 px-1">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F5EFE8] text-[#A35A2A]">
            <Coins size={22} aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Points et activités</h1>
            <p className="mt-0.5 text-sm text-[#65676B]">Suivez vos gains, vos badges et vos usages.</p>
          </div>
        </header>

        <TabNavigation
          tabs={TABS}
          active={tab}
          onChange={setTab}
          ariaLabel="Onglets Points et activités"
          className="mb-5"
        />

        <div className="min-h-[420px]">
          {tab === "gains" && (
            <GainsTab
              balance={Number(pointsToday.total ?? 0)}
              converted={Number(pointsToday.converted ?? 0)}
              gainToday={Number(pointsToday.gain_today ?? 0)}
              entries={pointsQuery.data?.entries ?? []}
              loading={pointsQuery.isLoading || pointsQuery.isFetching || pointsTodayQuery.isFetching}
            />
          )}
          {tab === "badges" && <BadgesTab userId={userId} />}
          {tab === "usages" && <UsagesTab />}
        </div>
      </div>
    </MainLayout>
  )
}
