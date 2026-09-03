"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/queries/use-auth"
import { useAkwaHomeVideos } from "@/hooks/akwaplay/useAkwaHomeVideos"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaCategoryTabs from "@/components/akwaplay/categories/AkwaCategoryTabs"
import AkwaVideoGrid from "@/components/akwaplay/grid/AkwaVideoGrid"
import AkwaPublishModal from "@/components/akwaplay/publish/AkwaPublishModal"

/**
 * Page d'accueil Akwaplay — layout autonome thème sombre.
 * N'utilise PAS MainLayout Dughu : layout full-screen propre à Akwaplay.
 */
interface AkwaplayHomePageProps {
  initialUserId?: string
}

export default function AkwaplayHomePage({ initialUserId = "" }: AkwaplayHomePageProps) {
  const { data: rawUser } = useAuth()
  const userId = String(
    rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.user_id || rawUser?.id || initialUserId || ""
  )

  // ── État de la sidebar ──
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sur desktop (≥1024px), la sidebar est ouverte par défaut
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // ── Données vidéos ──
  const {
    categories,
    selectedCategoryId,
    selectCategory,
    searchQuery,
    setSearchQuery,
    submitSearch,
    clearSearch,
    videos,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    publishVideo,
  } = useAkwaHomeVideos({ userId })

  // ── Debounce recherche (400ms) ──
  useEffect(() => {
    if (!searchQuery.trim()) return
    const timer = setTimeout(() => submitSearch(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modale publication ──
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const handlePublish = useCallback(
    async (payload: Parameters<typeof publishVideo>[0], onProgress?: Parameters<typeof publishVideo>[1]) => {
      return publishVideo(payload, onProgress)
    },
    [publishVideo]
  )

  return (
    <>
      {/* ── Head méta (thème sombre pour la barre navigateur) ── */}
      <meta name="theme-color" content="#141414" />

      <div
        className="min-h-screen"
        style={{ backgroundColor: "#141414", color: "#ffffff", fontFamily: "'Inter', 'Roboto', sans-serif" }}
      >
        {/* ── Header fixe ── */}
        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q)
            if (!q.trim()) clearSearch()
          }}
          onSearchSubmit={submitSearch}
          onClearSearch={clearSearch}
          onPublishClick={() => setPublishModalOpen(true)}
        />

        {/* ── Corps (sous le header de 56px) ── */}
        <div className="flex pt-14">
          {/* Sidebar gauche */}
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => setPublishModalOpen(true)}
          />

          {/* ── Contenu principal ── */}
          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-4 py-4 md:px-6 ${
              sidebarOpen ? "lg:ml-[220px]" : ""
            }`}
          >
            {/* Barre de catégories */}
            <AkwaCategoryTabs
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={(id) => {
                selectCategory(id)
                // Scroll to top
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            />

            {/* Séparateur */}
            <div className="my-3" style={{ borderBottom: "1px solid #2a2a2a" }} />

            {/* Grille vidéos */}
            <AkwaVideoGrid
              videos={videos}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              error={error}
              onLoadMore={loadMore}
              onRetry={refresh}
              onPublishClick={() => setPublishModalOpen(true)}
            />
          </main>
        </div>

        {/* ── Modale de publication ── */}
        <AkwaPublishModal
          open={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          categories={categories}
          userId={userId}
          onPublish={handlePublish}
        />
      </div>
    </>
  )
}
