"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  HeartHandshake,
  Loader2,
  TrendingUp,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useFinanceDetail } from "@/hooks/queries/use-finance"
import Avatar from "@/components/common/Avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import FinanceDonationModal from "./FinanceDonationModal"
import FinanceShareDropdown from "./FinanceShareDropdown"

interface FinanceDetailPageProps {
  id: string
}


function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(num))
}

export default function FinanceDetailPage({ id }: FinanceDetailPageProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const currentUserId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const { data: detailData, isLoading, isError, refetch } = useFinanceDetail(id)
  const [donationModalOpen, setDonationModalOpen] = useState(false)

  const campaign = detailData?.finance

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="finance">
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header : bandeau marron/dégradé, flèche retour (←) + titre en blanc */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#8B5E34] via-[#7D4F28] to-[#633A18] text-white p-5 sm:p-7 shadow-lg flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              title="Retour"
              aria-label="Retour"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate drop-shadow-xs">
              {campaign?.title || "Détail du financement"}
            </h1>
          </div>

          {isLoading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 border border-gray-100 dark:border-zinc-800 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#8B5E34]" />
              <p className="text-sm font-medium text-gray-500">Chargement de la demande...</p>
            </div>
          ) : isError || !campaign ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-zinc-800 space-y-3">
              <p className="text-base font-bold text-gray-800 dark:text-gray-200">
                Demande de financement introuvable ou indisponible.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/finance")}
                className="rounded-xl cursor-pointer"
              >
                Retourner aux finances
              </Button>
            </div>
          ) : (
            /* Disposition en 2 colonnes (desktop) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Colonne gauche (7 cols) : Grande image + bloc auteur + description */}
              <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-6">
                {/* Grande image de la demande */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  {campaign.image ? (
                    <Image
                      src={campaign.image}
                      alt={campaign.title}
                      fill
                      priority
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900">
                      <HeartHandshake className="w-16 h-16 text-[#8B5E34]/40 mb-2" />
                      <span className="text-sm font-bold text-[#8B5E34]/60">Dughu Finances</span>
                    </div>
                  )}
                </div>

                {/* Bloc auteur : avatar rond + nom + date */}
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/50">
                  <Avatar
                    src={campaign.author.avatar}
                    name={campaign.author.name}
                    size="md"
                    className="ring-2 ring-white dark:ring-zinc-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                      {campaign.author.name}
                    </h2>
                    {campaign.createdAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {campaign.createdAt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Texte de la description de la demande */}
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-gray-400">
                    Description de la demande
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {campaign.description || "Aucune description fournie pour cette demande."}
                  </p>
                </div>
              </div>

              {/* Colonne droite (5 cols) — carte "Progression du financement" */}
              <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#8B5E34]" />
                  <h2 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                    Progression du financement
                  </h2>
                </div>

                {/* Barre de progression (grise, remplie selon collecté/objectif) */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B5E34] to-[#E67E22] rounded-full transition-all duration-500"
                      style={{
                        width:
                          campaign.progressPercent !== null
                            ? `${Math.min(Math.max(campaign.progressPercent, 0), 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                  {campaign.progressPercent !== null && (
                    <div className="flex justify-end text-xs font-bold text-gray-500">
                      <span>{Math.round(campaign.progressPercent)}% atteint</span>
                    </div>
                  )}
                </div>

                {/* Lignes label/valeur alignées à droite */}
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {/* Collecté : X points (orange) */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Collecté :</span>
                    <span className="font-bold text-[#E67E22] dark:text-[#F39C12]">
                      {formatNumber(campaign.collectedPoints || campaign.collectedAmount)} points
                    </span>
                  </div>

                  {/* Objectif : X points (rouge si 0/non atteint) */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Objectif :</span>
                    <span
                      className={`font-bold ${
                        (campaign.targetPoints === 0 && campaign.amount === 0) ||
                        (campaign.collectedPoints || campaign.collectedAmount) <
                          (campaign.targetPoints || campaign.amount)
                          ? "text-red-500"
                          : "text-emerald-600"
                      }`}
                    >
                      {(campaign.targetPoints || campaign.amount) > 0
                        ? `${formatNumber(campaign.targetPoints || campaign.amount)} points`
                        : "0 point"}
                    </span>
                  </div>

                  {/* Total des dons : nombre de dons */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total des dons :</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {formatNumber(campaign.donationsCount)}
                    </span>
                  </div>
                </div>

                <Separator className="bg-gray-100 dark:bg-zinc-800" />

                {/* Bandeau vert conditionnel "✓ Objectif atteint !" */}
                {campaign.isGoalReached && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold border border-emerald-200 dark:border-emerald-800/40">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>✓ Objectif atteint !</span>
                  </div>
                )}

                {/* Bouton "Faire un don" */}
                <Button
                  type="button"
                  onClick={() => setDonationModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-[#8B5E34] hover:bg-[#744c29] text-white font-bold text-sm shadow-md hover:shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-white/30" />
                  <span>Faire un don</span>
                </Button>

                {/* Bouton "⇧ Partager" avec dropdown */}
                <FinanceShareDropdown
                  title={campaign.title}
                  url={typeof window !== "undefined" ? window.location.href : undefined}
                />
              </div>
            </div>
          )}

          {/* Modal de don */}
          {campaign && (
            <FinanceDonationModal
              open={donationModalOpen}
              onOpenChange={(open) => {
                setDonationModalOpen(open)
                if (!open) {
                  // Rafraîchir les données après fermeture
                  void refetch()
                }
              }}
              fundingId={campaign.id}
              recipientId={campaign.userId}
              campaignTitle={campaign.title}
            />
          )}
        </div>
      </div>
    </MainLayout>
  )
}
