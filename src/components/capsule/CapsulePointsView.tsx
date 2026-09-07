"use client"

import { useMemo } from "react"
import { Coins, Gift, RefreshCw, Sparkles, TrendingUp } from "lucide-react"
import { usePointsHistory } from "@/hooks/points/use-points"
import CapsulePointsTable from "./CapsulePointsTable"
import { Skeleton } from "@/components/ui/skeleton"

interface CapsulePointsViewProps {
  userId: string
  onOpenCreator?: () => void
}

export default function CapsulePointsView({ userId, onOpenCreator }: CapsulePointsViewProps) {
  // Appel direct du hook branché sur /pointsHistory/{userId}/capsule
  const { data, isLoading, isError, error, refetch, isFetching } = usePointsHistory({
    userId,
    source: "capsule",
  })

  const entries = data?.entries ?? []

  // Statistiques calculées
  const stats = useMemo(() => {
    let totalGains = 0
    let totalPertes = 0
    let gainCount = 0

    for (const entry of entries) {
      if (entry.type === "gain") {
        totalGains += entry.points
        gainCount++
      } else {
        totalPertes += entry.points
      }
    }

    const solde = totalGains - totalPertes
    const latest = entries[0]?.date ? new Date(entries[0].date).toLocaleDateString("fr-FR") : null

    return { totalGains, solde, gainCount, latest }
  }, [entries])

  return (
    <div className="space-y-5">
      {/* ── En-tête des points ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#985810] to-[#7d480d] text-white shadow-md shadow-[#985810]/30">
            <Coins size={24} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2D2D2D]">Mes points Capsule</h1>
            <p className="text-xs text-[#65676B] mt-0.5">
              Historique des points obtenus uniquement sur les capsules vidéo
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-[#F6F7F9] px-3.5 py-2 text-xs font-semibold text-[#2D2D2D] transition hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin text-[#985810]" : "text-[#65676B]"} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* ── Cartes d'indicateurs (KPIs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Solde Capsule */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 border border-amber-200/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#985810]">Solde Capsule</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#985810] text-white">
              <Gift size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#985810]">
            {isLoading ? "…" : `${stats.solde} pts`}
          </div>
          <p className="mt-1 text-[11px] text-[#65676B]">Total accumulé via les capsules</p>
        </div>

        {/* Nombre de gains */}
        <div className="rounded-3xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65676B]">Récompenses reçues</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#2D2D2D]">
            {isLoading ? "…" : stats.gainCount}
          </div>
          <p className="mt-1 text-[11px] text-[#65676B]">Mouvements de gains crédités</p>
        </div>

        {/* Dernier gain */}
        <div className="rounded-3xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65676B]">Dernière activité</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Sparkles size={15} />
            </span>
          </div>
          <div className="mt-2 text-base font-bold text-[#2D2D2D] truncate">
            {isLoading ? "…" : stats.latest ?? "Aucune activité"}
          </div>
          <p className="mt-1 text-[11px] text-[#65676B]">Dernière transaction enregistrée</p>
        </div>
      </div>

      {/* ── Tableau de l'historique ou états ── */}
      {isError ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : "Impossible de charger l'historique des points."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 text-xs font-semibold text-[#985810] hover:underline"
          >
            Réessayer
          </button>
        </div>
      ) : isLoading ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 sm:p-12 text-center shadow-sm border border-gray-100">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#985810]/10 text-[#985810] mb-3">
            <Coins size={28} />
          </div>
          <h3 className="text-base font-bold text-[#2D2D2D]">Aucun point Capsule pour le moment</h3>
          <p className="text-sm text-[#65676B] max-w-md mx-auto mt-1 leading-relaxed">
            Vous n&apos;avez pas encore gagné de points dans la section Capsule. Regardez des capsules, aimez du contenu et publiez vos propres créations pour recevoir des récompenses.
          </p>
          {onOpenCreator && (
            <button
              type="button"
              onClick={onOpenCreator}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#985810] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d]"
            >
              <Sparkles size={16} />
              <span>Créer une capsule</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">Mouvements de points Capsule</h2>
          <CapsulePointsTable entries={entries} loading={isLoading} />
        </div>
      )}
    </div>
  )
}
