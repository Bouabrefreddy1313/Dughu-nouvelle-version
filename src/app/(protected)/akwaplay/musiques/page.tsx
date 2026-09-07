"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import {
  Music2,
  RefreshCw,
  Search,
  Heart,
  Play,
  Pause,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  fetchMusiques,
  fetchUserFavoriteMusiques,
  toggleMusiqueFavorite,
  deleteMusique,
  type AkwaMusique,
} from "@/services/akwaplay/akwaplayMusique.service"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaMusiqueCreateModal from "@/components/akwaplay/musiques/AkwaMusiqueCreateModal"

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function AkwaMusiquesContent() {
  const { data: rawUser, isLoading: authLoading } = useAuth()

  const [cachedUserId, setCachedUserId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dughu_current_user_id") || ""
    }
    return ""
  })

  const rawUserId = String(
    rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.user_id || rawUser?.id || ""
  ).trim()

  useEffect(() => {
    if (rawUserId) {
      try {
        localStorage.setItem("dughu_current_user_id", rawUserId)
        setCachedUserId(rawUserId)
      } catch {}
    }
  }, [rawUserId])

  const effectiveUserId = rawUserId || cachedUserId || "28341"

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all")
  const [musiques, setMusiques] = useState<AkwaMusique[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lecteur audio
  const [currentTrack, setCurrentTrack] = useState<AkwaMusique | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Gestion responsive de la sidebar
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Chargement des musiques selon l'onglet
  const load = useCallback(
    async (query = "") => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      const signal = abortRef.current.signal

      setLoading(true)
      setError(null)

      let aborted = false

      try {
        let result: AkwaMusique[]
        if (activeTab === "favorites") {
          result = await fetchUserFavoriteMusiques(effectiveUserId, signal)
        } else {
          result = await fetchMusiques(query, signal)
        }

        if (signal.aborted) {
          aborted = true
          return
        }

        setMusiques(result)
      } catch (err: any) {
        const isAbort =
          signal.aborted ||
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED" ||
          err?.isCanceled ||
          (err instanceof Error && (err.message.includes("annulée") || err.message.includes("canceled")))

        if (isAbort) {
          aborted = true
          return
        }
        setError(err?.message || "Impossible de charger les musiques.")
      } finally {
        if (!aborted && !signal.aborted) {
          setLoading(false)
        }
      }
    },
    [activeTab, effectiveUserId]
  )

  useEffect(() => {
    if (authLoading && !cachedUserId && !rawUserId) return
    load(search)
  }, [load, search, authLoading, cachedUserId, rawUserId])

  // Gestion du lecteur audio
  const handlePlayTrack = (musique: AkwaMusique) => {
    if (currentTrack?.id === musique.id) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play().catch(() => {})
        setIsPlaying(true)
      }
      return
    }

    setCurrentTrack(musique)
    setIsPlaying(true)
    setAudioProgress(0)
    setAudioCurrentTime(0)

    if (audioRef.current) {
      audioRef.current.src = musique.audioUrl || ""
      audioRef.current.play().catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime
      const duration = audioRef.current.duration || 1
      setAudioCurrentTime(current)
      setAudioProgress((current / duration) * 100)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setAudioProgress(0)
  }

  // Toggle favori
  const handleToggleFavorite = async (e: React.MouseEvent, musique: AkwaMusique) => {
    e.stopPropagation()
    const prevFavorite = musique.isFavorite

    // Mise à jour optimiste
    setMusiques((prev) =>
      prev.map((m) => (m.id === musique.id ? { ...m, isFavorite: !prevFavorite } : m))
    )

    try {
      const res = await toggleMusiqueFavorite(musique.id, effectiveUserId)
      if (res.message) {
        toast.success(res.message)
      }
      if (activeTab === "favorites" && prevFavorite) {
        setMusiques((prev) => prev.filter((m) => m.id !== musique.id))
      }
    } catch {
      // Revert
      setMusiques((prev) =>
        prev.map((m) => (m.id === musique.id ? { ...m, isFavorite: prevFavorite } : m))
      )
      toast.error("Impossible de modifier les favoris.")
    }
  }

  // Suppression
  const handleDeleteMusique = async (e: React.MouseEvent, musicId: string | number) => {
    e.stopPropagation()
    if (!confirm("Voulez-vous vraiment supprimer cette musique ?")) return

    try {
      await deleteMusique(musicId, effectiveUserId)
      toast.success("Musique supprimée avec succès.")
      setMusiques((prev) => prev.filter((m) => m.id !== musicId))
      if (currentTrack?.id === musicId) {
        audioRef.current?.pause()
        setCurrentTrack(null)
        setIsPlaying(false)
      }
    } catch {
      toast.error("Erreur lors de la suppression.")
    }
  }

  return (
    <>
      <meta name="theme-color" content="#141414" />
      <div
        className="min-h-screen pb-24"
        style={{
          backgroundColor: "#141414",
          color: "#ffffff",
          fontFamily: "'Inter', 'Roboto', sans-serif",
        }}
      >
        {/* Balise audio invisible pour la lecture */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          muted={isMuted}
        />

        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          searchQuery=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onClearSearch={() => {}}
          onPublishClick={() => setCreateModalOpen(true)}
        />

        <div className="flex pt-14">
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => setCreateModalOpen(true)}
          />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-4 py-6 md:px-8 ${
              sidebarOpen ? "lg:ml-[220px]" : ""
            }`}
          >
            {/* ── En-tête section avec bouton Ajouter ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-[#985810]/20"
                  style={{ background: "linear-gradient(135deg, #985810, #7d480d)" }}
                >
                  <Music2 size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Musiques libres</h1>
                  <p className="text-xs text-[#9a9a9a]">
                    Bibliothèque sonore libre de droits pour vos créations
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-lg transition hover:scale-102 shrink-0 self-start sm:self-auto"
                style={{ backgroundColor: "#985810" }}
              >
                <Plus size={15} />
                <span>Ajouter une musique</span>
              </button>
            </div>

            {/* ── Onglets et Recherche ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
              {/* Onglets */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] self-start">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === "all"
                      ? "bg-[#985810] text-white shadow"
                      : "text-[#9a9a9a] hover:text-white"
                  }`}
                >
                  Toutes les musiques
                </button>
                <button
                  onClick={() => setActiveTab("favorites")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    activeTab === "favorites"
                      ? "bg-[#985810] text-white shadow"
                      : "text-[#9a9a9a] hover:text-white"
                  }`}
                >
                  <Heart size={12} className={activeTab === "favorites" ? "fill-white" : ""} />
                  <span>Mes favoris</span>
                </button>
              </div>

              {/* Barre de recherche */}
              {activeTab === "all" && (
                <div className="relative w-full md:w-80">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777]"
                  />
                  <input
                    type="text"
                    placeholder="Rechercher un titre ou un artiste…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-[#777777] bg-[#1c1c1c] border border-[#2a2a2a] focus:border-[#985810] outline-none transition"
                  />
                </div>
              )}
            </div>

            <div style={{ borderBottom: "1px solid #222222" }} className="mb-6" />

            {/* ── Liste des musiques ── */}
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#1c1c1c] border border-[#262626] animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#262626] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 rounded bg-[#262626] w-1/3" />
                      <div className="h-2.5 rounded bg-[#262626] w-1/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-[#202020]"
                >
                  <RefreshCw size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm max-w-xs">{error}</p>
                <button
                  onClick={() => load(search)}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-white transition bg-[#2a2a2a] hover:bg-[#985810]"
                >
                  Réessayer
                </button>
              </div>
            ) : musiques.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#202020]">
                  <Music2 size={28} className="text-[#777777]" />
                </div>
                <h3 className="text-white font-semibold text-sm">
                  {activeTab === "favorites"
                    ? "Aucune musique favorite"
                    : search
                    ? "Aucun résultat pour cette recherche"
                    : "Aucune musique disponible"}
                </h3>
                <p className="text-[#888888] text-xs max-w-xs">
                  {activeTab === "favorites"
                    ? "Ajoutez des morceaux à vos favoris en cliquant sur l'icône cœur."
                    : "Téléversez vos morceaux libres pour enrichir la bibliothèque Akwaplay."}
                </p>
                {activeTab === "all" && !search && (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="mt-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition hover:opacity-90"
                    style={{ backgroundColor: "#985810" }}
                  >
                    Ajouter le premier morceau
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {musiques.map((musique, index) => {
                  const isCurrent = currentTrack?.id === musique.id
                  return (
                    <div
                      key={musique.id}
                      onClick={() => handlePlayTrack(musique)}
                      className={`flex items-center gap-3.5 p-3 rounded-2xl transition duration-200 cursor-pointer group border ${
                        isCurrent
                          ? "bg-[#222222] border-[#985810]/60 shadow-md"
                          : "bg-[#181818] border-[#262626] hover:bg-[#202020] hover:border-[#383838]"
                      }`}
                    >
                      {/* Numéro / Bouton Play */}
                      <div className="w-8 text-center shrink-0 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlayTrack(musique)
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                            isCurrent && isPlaying
                              ? "bg-[#985810] text-white"
                              : "bg-[#252525] group-hover:bg-[#985810] text-white"
                          }`}
                        >
                          {isCurrent && isPlaying ? (
                            <Pause size={14} className="fill-white" />
                          ) : (
                            <Play size={13} className="fill-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Pochette */}
                      <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden bg-[#242424] flex items-center justify-center border border-white/5">
                        {musique.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={musique.cover}
                            alt={musique.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Music2
                            size={20}
                            className={isCurrent ? "text-[#985810]" : "text-[#777777]"}
                          />
                        )}
                      </div>

                      {/* Titre & Artiste */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-bold truncate leading-snug ${
                            isCurrent ? "text-[#985810]" : "text-white"
                          }`}
                        >
                          {musique.title}
                        </p>
                        <p className="text-[11px] text-[#888888] truncate mt-0.5">
                          {musique.artist || "Artiste inconnu"}
                        </p>
                      </div>

                      {/* Durée */}
                      {musique.duration ? (
                        <span className="text-[11px] text-[#777777] shrink-0">
                          {formatDuration(musique.duration)}
                        </span>
                      ) : null}

                      {/* Bouton Favori */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, musique)}
                        className={`p-2 rounded-lg transition shrink-0 ${
                          musique.isFavorite
                            ? "text-[#985810]"
                            : "text-[#666666] hover:text-white"
                        }`}
                        title={musique.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      >
                        <Heart
                          size={16}
                          className={musique.isFavorite ? "fill-[#985810]" : ""}
                        />
                      </button>

                      {/* Bouton Supprimer */}
                      <button
                        onClick={(e) => handleDeleteMusique(e, musique.id)}
                        className="p-2 rounded-lg text-red-400 hover:text-red-300 transition opacity-0 group-hover:opacity-100 shrink-0"
                        title="Supprimer la musique"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>

        {/* ── BARRE DE LECTURE AUDIO FLOTTANTE (EN BAS) ── */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#161616]/95 backdrop-blur-md border-t border-[#2e2e2e] px-4 py-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              {/* Infos piste */}
              <div className="flex items-center gap-3 min-w-0 max-w-xs md:max-w-sm">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#242424] shrink-0 border border-white/10 flex items-center justify-center">
                  {currentTrack.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentTrack.cover}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music2 size={18} className="text-[#985810]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                  <p className="text-[10px] text-[#888888] truncate">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Contrôles et barre de progression */}
              <div className="flex-1 max-w-md flex flex-col items-center gap-1.5">
                <button
                  onClick={() => handlePlayTrack(currentTrack)}
                  className="w-8 h-8 rounded-full bg-[#985810] text-white flex items-center justify-center shadow hover:scale-105 transition"
                >
                  {isPlaying ? (
                    <Pause size={14} className="fill-white" />
                  ) : (
                    <Play size={13} className="fill-white ml-0.5" />
                  )}
                </button>
                <div className="w-full flex items-center gap-2">
                  <span className="text-[10px] text-[#777777]">
                    {formatDuration(Math.floor(audioCurrentTime))}
                  </span>
                  <div className="flex-1 h-1 bg-[#282828] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#985810] transition-all"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#777777]">
                    {formatDuration(currentTrack.duration || 0)}
                  </span>
                </div>
              </div>

              {/* Contrôle son */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="p-2 rounded-lg text-[#888888] hover:text-white transition"
                  title={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODALE D'AJOUT DE MUSIQUE ── */}
        <AkwaMusiqueCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          userId={effectiveUserId}
          onSuccess={(newMusique) => {
            if (newMusique) {
              setMusiques((prev) => [newMusique, ...prev])
            } else {
              load(search)
            }
          }}
        />
      </div>
    </>
  )
}

export default function AkwaMusiquesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#985810] animate-spin" />
        </div>
      }
    >
      <AkwaMusiquesContent />
    </Suspense>
  )
}
