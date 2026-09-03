"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Music2, RefreshCw, Search, Heart, Play } from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  fetchMusiques,
  toggleMusiqueFavorite,
  type AkwaMusique,
} from "@/services/akwaplay/akwaplayMusique.service"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export default function AkwaMusiquesPage() {
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [musiques, setMusiques] = useState<AkwaMusique[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const load = useCallback(async (query = "") => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMusiques(query, signal)
      setMusiques(result)
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "CanceledError") return
      setError(err?.message || "Impossible de charger les musiques.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Debounce recherche
  useEffect(() => {
    const timer = setTimeout(() => load(search), 400)
    return () => clearTimeout(timer)
  }, [search, load])

  const toggleFavorite = useCallback(async (musiqueId: string | number) => {
    if (!userId || userId.trim() === "") return
    try {
      await toggleMusiqueFavorite(musiqueId, userId)
      setMusiques(prev => prev.map(m => m.id === musiqueId ? { ...m, isFavorite: !m.isFavorite } : m))
    } catch {
      // Silencieux
    }
  }, [userId])

  return (
    <>
      <meta name="theme-color" content="#141414" />
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#141414", color: "#ffffff", fontFamily: "'Inter', 'Roboto', sans-serif" }}
      >
        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
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
                <Music2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Musiques libres</h1>
                <p className="text-sm text-[#9a9a9a]">Bibliothèque musicale pour vos créations</p>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-6 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
              <input
                type="text"
                placeholder="Rechercher une musique ou un artiste…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-[#9a9a9a] outline-none transition focus:ring-1 focus:ring-[#f5821f]"
                style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
              />
            </div>

            <div style={{ borderBottom: "1px solid #2a2a2a" }} className="mb-4" />

            {/* Contenu */}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse" style={{ backgroundColor: "#1c1c1c" }}>
                    <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ backgroundColor: "#2a2a2a" }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded" style={{ backgroundColor: "#2a2a2a", width: "60%" }} />
                      <div className="h-2 rounded" style={{ backgroundColor: "#2a2a2a", width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <RefreshCw size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm max-w-xs">{error}</p>
                <button
                  onClick={() => load(search)}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#f5821f]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  Réessayer
                </button>
              </div>
            ) : musiques.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <Music2 size={24} className="text-[#9a9a9a]" />
                </div>
                <h3 className="text-white font-semibold">Aucune musique trouvée</h3>
                <p className="text-[#9a9a9a] text-sm max-w-xs">
                  {search ? "Essayez un autre terme de recherche." : "La bibliothèque musicale est vide pour l'instant."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {musiques.map((musique, index) => (
                  <div
                    key={musique.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5 group cursor-pointer"
                  >
                    {/* Numéro / play */}
                    <div className="w-8 text-center flex-shrink-0">
                      <span className="text-[#9a9a9a] text-sm group-hover:hidden">{index + 1}</span>
                      <button
                        onClick={() => setPlayingId(prev => prev === musique.id ? null : musique.id)}
                        className="hidden group-hover:flex items-center justify-center"
                        aria-label={playingId === musique.id ? "Pause" : "Lire"}
                      >
                        <Play size={16} className="text-white" />
                      </button>
                    </div>

                    {/* Cover */}
                    <div
                      className="w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: "#2a2a2a" }}
                    >
                      {musique.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={musique.cover} alt={musique.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Music2 size={18} className="text-[#9a9a9a]" />
                      )}
                    </div>

                    {/* Titre + artiste */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${playingId === musique.id ? "text-[#f5821f]" : "text-white"}`}>
                        {musique.title}
                      </p>
                      {musique.artist && (
                        <p className="text-xs text-[#9a9a9a] truncate">{musique.artist}</p>
                      )}
                    </div>

                    {/* Durée */}
                    {musique.duration ? (
                      <span className="text-xs text-[#9a9a9a] flex-shrink-0">{formatDuration(musique.duration)}</span>
                    ) : null}

                    {/* Favori */}
                    {userId && (
                      <button
                        onClick={() => toggleFavorite(musique.id)}
                        className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={musique.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      >
                        <Heart
                          size={16}
                          className={musique.isFavorite ? "text-[#f5821f] fill-[#f5821f]" : "text-[#9a9a9a]"}
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
