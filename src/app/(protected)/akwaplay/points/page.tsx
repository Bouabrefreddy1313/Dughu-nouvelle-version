"use client"

import { useState, useEffect } from "react"
import { Coins, RefreshCw, Gift } from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"
import { usePointsHistory } from "@/hooks/points/use-points"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaplayPointsTable from "@/components/akwaplay/points/AkwaplayPointsTable"

export default function AkwaplayPointsPage() {
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Historique des points obtenus UNIQUEMENT sur Akwaplay → /pointsHistory/{userId}/akwaplay
  const historyQuery = usePointsHistory({ userId, source: "akwaplay" })
  const entries = historyQuery.data?.entries ?? []
  const loading = historyQuery.isLoading || historyQuery.isPending
  const error = historyQuery.error

  return (
    <>
      <meta name="theme-color" content="#141414" />
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#141414", color: "#ffffff", fontFamily: "'Inter', 'Roboto', sans-serif" }}
      >
        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          searchQuery=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onClearSearch={() => {}}
          onPublishClick={() => {}}
        />

        <div className="flex pt-14">
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => {}}
          />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-4 py-6 md:px-6 ${sidebarOpen ? "lg:ml-[220px]" : ""}`}
          >
            {/* En-tête section */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f5821f, #e5530a)" }}
              >
                <Gift size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Mes points Akwaplay</h1>
                <p className="text-sm text-[#9a9a9a]">
                  Historique des points obtenus sur Akwaplay
                </p>
              </div>
            </div>

            <div style={{ borderBottom: "1px solid #2a2a2a" }} className="mb-6" />

            {/* Contenu */}
            {loading ? (
              <div className="space-y-3" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl animate-pulse"
                    style={{ backgroundColor: "#1f1f1f" }}
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <RefreshCw size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm max-w-xs">
                  Impossible de charger l'historique des points.
                </p>
                <button
                  onClick={() => historyQuery.refetch()}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#f5821f]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  Réessayer
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <Coins size={24} className="text-[#9a9a9a]" />
                </div>
                <h3 className="text-white font-semibold">Aucun point pour le moment</h3>
                <p className="text-[#9a9a9a] text-sm max-w-xs">
                  Vos gains de points Akwaplay apparaîtront ici.
                </p>
              </div>
            ) : (
              <AkwaplayPointsTable entries={entries} />
            )}
          </main>
        </div>
      </div>
    </>
  )
}