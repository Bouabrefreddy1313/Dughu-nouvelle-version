"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CircleDollarSign, Search, Plus, Loader2, Sparkles, Inbox } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useFinanceList, useUserFinanceList } from "@/hooks/queries/use-finance"
import FinanceCard from "./FinanceCard"
import { Skeleton } from "@/components/ui/skeleton"

export default function FinanceListPage() {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const [activeTab, setActiveTab] = useState<"browse" | "mine">("browse")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce ~400ms sur la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Requête liste globale (Parcourir)
  const {
    data: browseData,
    isLoading: browseLoading,
    isError: browseError,
    refetch: refetchBrowse,
  } = useFinanceList({ q: debouncedQuery || undefined })

  // Requête liste utilisateur (Mes demandes)
  const {
    data: userFinancesData,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useUserFinanceList(userId, { q: debouncedQuery || undefined })

  const isBrowse = activeTab === "browse"
  const currentLoading = isBrowse ? browseLoading : userLoading
  const currentError = isBrowse ? browseError : userError
  const campaigns = isBrowse
    ? browseData?.finances || []
    : userFinancesData?.finances || []

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="finance">
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header : Icône $ + Titre à gauche | Barre de recherche "Cherchez ici" à droite */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#8B5E34]/10 text-[#8B5E34] flex items-center justify-center shrink-0">
                <CircleDollarSign className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                  Finances
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Découvrez et soutenez des projets inspirants
                </p>
              </div>
            </div>

            {/* Barre de recherche avec debounce ~400ms */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cherchez ici"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 transition"
              />
            </div>
          </div>

          {/* Barre d'onglets : Parcourir / Mes demandes + Bouton + CRÉER à droite */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("browse")}
                className={`px-5 py-2 rounded-full text-sm font-bold transition cursor-pointer ${
                  activeTab === "browse"
                    ? "bg-[#8B5E34] text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                Parcourir
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("mine")}
                className={`px-5 py-2 rounded-full text-sm font-bold transition cursor-pointer ${
                  activeTab === "mine"
                    ? "bg-[#8B5E34] text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                Mes demandes
              </button>
            </div>

            {/* Bouton "+ CRÉER" (fond marron #8B5E34, texte blanc, pill) */}
            <button
              type="button"
              onClick={() => router.push("/finance/create")}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8B5E34] hover:bg-[#744c29] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ CRÉER</span>
            </button>
          </div>

          {/* Grille de cartes (2 colonnes desktop, responsive) */}
          {currentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-4 space-y-4 shadow-xs"
                >
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : currentError ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center border border-red-100 dark:border-red-950 space-y-3">
              <p className="text-sm font-semibold text-red-600">
                Impossible de charger les demandes de financement.
              </p>
              <button
                type="button"
                onClick={() => (isBrowse ? refetchBrowse() : refetchUser())}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#8B5E34]/10 text-[#8B5E34] flex items-center justify-center mx-auto">
                <Inbox className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isBrowse
                    ? debouncedQuery
                      ? "Aucun résultat trouvé pour votre recherche."
                      : "Aucune demande de financement disponible."
                    : "Vous n'avez pas encore créé de demande de financement."}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isBrowse
                    ? "Revenez bientôt ou lancez vous-même un appel aux dons."
                    : "Créez votre première demande dès aujourd'hui pour mobiliser la communauté."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/finance/create")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8B5E34] hover:bg-[#744c29] text-white font-semibold text-xs shadow-md transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Créer une demande</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {campaigns.map((camp) => (
                <FinanceCard
                  key={camp.id}
                  campaign={camp}
                  currentUserId={userId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
