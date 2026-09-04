"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Video,
  Tv,
  Clapperboard,
  Activity,
  Star,
  Plus,
  Trash2,
  Edit,
  Play,
  CheckCircle2,
  RefreshCw,
  Film,
  Calendar,
  AlertTriangle,
  X,
  Camera,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/queries/use-auth"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaVideoCard from "@/components/akwaplay/grid/AkwaVideoCard"
import AkwaVideoSkeleton from "@/components/akwaplay/grid/AkwaVideoSkeleton"
import AkwaPublishModal from "@/components/akwaplay/publish/AkwaPublishModal"
import {
  getUserVideos,
  destroyVideo,
  getUserActivities,
  getFavoriteVideos,
  storeVideo,
  getCategories,
} from "@/services/akwaplay/akwaplayVideo.service"
import {
  getUserChannels,
  destroyChannel,
  storeChannel,
} from "@/services/akwaplay/akwaplayChannel.service"
import { formatChannelIdentifiant } from "@/services/akwaplay/akwaplay.helpers"
import { fetchUserShorts, type AkwaShort } from "@/services/akwaplay/akwaplayShort.service"
import AkwaShortCard from "@/components/akwaplay/shorts/AkwaShortCard"
import type {
  AkwaVideo,
  AkwaChannel,
  AkwaCategory,
  AkwaUserActivity,
} from "@/types/akwaplay/akwaplay.types"

interface AkwaProfilePageProps {
  initialUserId?: string
}

type ProfileTab = "videos" | "channels" | "shorts" | "activities" | "favorites"

export default function AkwaProfilePage({ initialUserId = "" }: AkwaProfilePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryUserId = searchParams.get("userId")

  const { data: rawUser } = useAuth()
  const myUserId = String(
    rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.user_id || rawUser?.id || initialUserId || ""
  )
  // L'utilisateur affiché : soit passé en query param (pour voir un créateur), soit l'utilisateur connecté, soit fallback 31262
  const targetUserId = queryUserId || myUserId || "31262"
  const isOwnProfile = !queryUserId || queryUserId === myUserId

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos")
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  // ── 1. État Vidéos de l'utilisateur ──
  const [videos, setVideos] = useState<AkwaVideo[]>([])
  const [videosPage, setVideosPage] = useState(1)
  const [videosHasMore, setVideosHasMore] = useState(true)
  const [videosLoading, setVideosLoading] = useState(true)
  const [videosError, setVideosError] = useState<string | null>(null)

  // ── 2. État Chaînes de l'utilisateur ──
  const [channels, setChannels] = useState<AkwaChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [channelsError, setChannelsError] = useState<string | null>(null)
  const [createChannelModal, setCreateChannelModal] = useState(false)
  const [channelName, setChannelName] = useState("")
  const [channelIdentifiant, setChannelIdentifiant] = useState("")
  const [channelDescription, setChannelDescription] = useState("")
  const [channelAvatarFile, setChannelAvatarFile] = useState<File | null>(null)
  const [channelAvatarPreview, setChannelAvatarPreview] = useState<string | null>(null)
  const [channelBannerFile, setChannelBannerFile] = useState<File | null>(null)
  const [channelBannerPreview, setChannelBannerPreview] = useState<string | null>(null)
  const [channelSubmitting, setChannelSubmitting] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // ── 3. État Shorts de l'utilisateur ──
  const [shorts, setShorts] = useState<AkwaShort[]>([])
  const [shortsLoading, setShortsLoading] = useState(false)
  const [shortsError, setShortsError] = useState<string | null>(null)

  // ── 4. État Activités de l'utilisateur ──
  const [activities, setActivities] = useState<AkwaUserActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)

  // ── 5. État Favoris ──
  const [favorites, setFavorites] = useState<AkwaVideo[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoritesError, setFavoritesError] = useState<string | null>(null)

  // Catégories pour la publication
  const [categories, setCategories] = useState<AkwaCategory[]>([])

  // ── Modales de suppression personnalisées (remplace confirm() natif) ──
  const [videoToDelete, setVideoToDelete] = useState<AkwaVideo | null>(null)
  const [deletingVideo, setDeletingVideo] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<AkwaChannel | null>(null)
  const [deletingChannel, setDeletingChannel] = useState(false)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  // Responsive sidebar desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // ── Chargement des Vidéos ──
  const loadUserVideos = useCallback(
    async (page = 1, isRefresh = false) => {
      if (!targetUserId) return
      if (page === 1) {
        setVideosLoading(true)
        setVideosError(null)
      }
      try {
        const viewerId = myUserId || targetUserId
        const res = await getUserVideos(targetUserId, viewerId, page)
        setVideos((prev) => (page === 1 || isRefresh ? res.videos : [...prev, ...res.videos]))
        setVideosHasMore(res.hasMore)
        setVideosPage(page)
      } catch (err: any) {
        setVideosError(err?.message || "Impossible de charger les vidéos.")
      } finally {
        setVideosLoading(false)
      }
    },
    [targetUserId, myUserId]
  )

  // ── Chargement des Chaînes ──
  const loadUserChannels = useCallback(async () => {
    if (!targetUserId) return
    setChannelsLoading(true)
    setChannelsError(null)
    try {
      const res = await getUserChannels(targetUserId)
      setChannels(res)
    } catch (err: any) {
      setChannelsError(err?.message || "Impossible de charger les chaînes.")
    } finally {
      setChannelsLoading(false)
    }
  }, [targetUserId])

  // ── Chargement des Shorts ──
  const loadUserShorts = useCallback(async () => {
    if (!targetUserId) return
    setShortsLoading(true)
    setShortsError(null)
    try {
      const res = await fetchUserShorts(targetUserId, 1)
      setShorts(res.shorts)
    } catch (err: any) {
      const isAbort =
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED" ||
        err?.isCanceled ||
        (err instanceof Error && (err.message.includes("annulée") || err.message.includes("canceled")))
      if (isAbort) return
      setShortsError(err?.message || "Impossible de charger les shorts.")
    } finally {
      setShortsLoading(false)
    }
  }, [targetUserId])

  // ── Chargement des Activités ──
  const loadUserActivities = useCallback(async () => {
    if (!targetUserId) return
    setActivitiesLoading(true)
    setActivitiesError(null)
    try {
      const res = await getUserActivities(targetUserId)
      setActivities(res)
    } catch (err: any) {
      setActivitiesError(err?.message || "Impossible de charger les activités.")
    } finally {
      setActivitiesLoading(false)
    }
  }, [targetUserId])

  // ── Chargement des Favoris ──
  const loadFavorites = useCallback(async () => {
    if (!targetUserId) return
    setFavoritesLoading(true)
    setFavoritesError(null)
    try {
      const res = await getFavoriteVideos(targetUserId, 1)
      setFavorites(res.videos)
    } catch (err: any) {
      setFavoritesError(err?.message || "Impossible de charger les favoris.")
    } finally {
      setFavoritesLoading(false)
    }
  }, [targetUserId])

  // Déclenche le chargement selon l'onglet
  useEffect(() => {
    if (activeTab === "videos") loadUserVideos(1, true)
    else if (activeTab === "channels") loadUserChannels()
    else if (activeTab === "shorts") loadUserShorts()
    else if (activeTab === "activities") loadUserActivities()
    else if (activeTab === "favorites") loadFavorites()
  }, [activeTab, loadUserVideos, loadUserChannels, loadUserShorts, loadUserActivities, loadFavorites])

  // ── Suppression d'une vidéo (via modale personnalisée) ──
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return
    setDeletingVideo(true)
    try {
      await destroyVideo(videoToDelete.id, myUserId || targetUserId)
      setVideos((prev) => prev.filter((v) => String(v.id) !== String(videoToDelete.id)))
      toast.success("Vidéo supprimée avec succès.")
      setVideoToDelete(null)
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression de la vidéo.")
    } finally {
      setDeletingVideo(false)
    }
  }

  // ── Suppression d'une chaîne (via modale personnalisée) ──
  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return
    setDeletingChannel(true)
    try {
      await destroyChannel(channelToDelete.id, myUserId || targetUserId)
      setChannels((prev) => prev.filter((c) => String(c.id) !== String(channelToDelete.id)))
      toast.success("Chaîne supprimée avec succès.")
      setChannelToDelete(null)
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression de la chaîne.")
    } finally {
      setDeletingChannel(false)
    }
  }

  // ── Sélection Avatar / Image de la chaîne ──
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image pour l'avatar.")
      return
    }
    setChannelAvatarFile(file)
    setChannelAvatarPreview(URL.createObjectURL(file))
  }

  // ── Sélection Bannière de la chaîne ──
  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image pour la bannière.")
      return
    }
    setChannelBannerFile(file)
    setChannelBannerPreview(URL.createObjectURL(file))
  }

  // ── Saisie dynamique du nom avec suggestion automatique de l'identifiant ──
  const handleChannelNameChange = (val: string) => {
    setChannelName(val)
    if (!channelIdentifiant || channelIdentifiant === formatChannelIdentifiant(channelName)) {
      setChannelIdentifiant(formatChannelIdentifiant(val))
    }
  }

  // ── Création d'une chaîne ──
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelName.trim()) return
    setChannelSubmitting(true)
    try {
      const slug = formatChannelIdentifiant(channelIdentifiant.trim() || channelName.trim())
      const res = await storeChannel({
        channelId: slug,
        name: channelName.trim(),
        identifiant: slug,
        description: channelDescription.trim() || null,
        avatarFile: channelAvatarFile,
        bannerFile: channelBannerFile,
        userId: myUserId || targetUserId,
      })
      if (res.channel) {
        setChannels((prev) => [res.channel!, ...prev])
      } else {
        await loadUserChannels()
      }
      toast.success("Chaîne créée avec succès !")
      setCreateChannelModal(false)
      setChannelName("")
      setChannelIdentifiant("")
      setChannelDescription("")
      setChannelAvatarFile(null)
      setChannelAvatarPreview(null)
      setChannelBannerFile(null)
      setChannelBannerPreview(null)
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création de la chaîne.")
    } finally {
      setChannelSubmitting(false)
    }
  }

  // Profil affiché
  const profileAuthor = useMemo(() => {
    if (videos.length > 0 && videos[0].author) {
      return videos[0].author
    }
    const name = rawUser?.name || rawUser?.username || "Créateur Akwaplay"
    return {
      id: targetUserId,
      name,
      username: rawUser?.username || null,
      avatar: rawUser?.avatar || "/images/avatar.png",
      verified: true,
      subscribersCount: 0,
    }
  }, [videos, rawUser, targetUserId])

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
          onPublishClick={() => setPublishModalOpen(true)}
        />

        <div className="flex pt-14">
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => setPublishModalOpen(true)}
          />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-4 py-6 md:px-8 ${
              sidebarOpen ? "lg:ml-[220px]" : ""
            }`}
          >
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* EN-TÊTE DU CRÉATEUR / PROFIL */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div
              className="rounded-2xl overflow-hidden p-6 md:p-8 mb-8"
              style={{
                background: "linear-gradient(180deg, #222222 0%, #181818 100%)",
                border: "1px solid #2a2a2a",
              }}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileAuthor.avatar || "/images/avatar.png"}
                    alt={profileAuthor.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#f5821f]/30"
                  />
                  {profileAuthor.verified && (
                    <div
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: "#f5821f" }}
                    >
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>

                {/* Métadonnées & actions */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                        <span>{profileAuthor.name}</span>
                      </h1>
                      {profileAuthor.username && (
                        <p className="text-sm text-[#9a9a9a] mt-0.5">@{profileAuthor.username}</p>
                      )}
                    </div>

                    {/* Actions créateur */}
                    {isOwnProfile && (
                      <div className="flex items-center justify-center sm:justify-end gap-2.5">
                        <button
                          onClick={() => setCreateChannelModal(true)}
                          className="px-4 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-white/10 flex items-center gap-1.5"
                          style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
                        >
                          <Tv size={15} className="text-[#f5821f]" />
                          <span>Créer une chaîne</span>
                        </button>
                        <button
                          onClick={() => setPublishModalOpen(true)}
                          className="px-4 py-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 flex items-center gap-1.5"
                          style={{ backgroundColor: "#f5821f" }}
                        >
                          <Plus size={16} />
                          <span>Publier</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Statistiques rapides */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 mt-5 text-sm text-[#c0c0c0]">
                    <div>
                      <span className="font-bold text-white text-base mr-1.5">{videos.length}</span>
                      vidéos
                    </div>
                    <div>
                      <span className="font-bold text-white text-base mr-1.5">{channels.length}</span>
                      chaînes
                    </div>
                    <div>
                      <span className="font-bold text-white text-base mr-1.5">{shorts.length}</span>
                      shorts
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* ONGLET DE NAVIGATION */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mt-8 pt-4 border-t border-[#2a2a2a]">
                {[
                  { key: "videos", label: "Mes Vidéos", icon: Video, count: videos.length },
                  { key: "channels", label: "Chaînes", icon: Tv, count: channels.length },
                  { key: "shorts", label: "Shorts", icon: Clapperboard, count: shorts.length },
                  { key: "activities", label: "Activités", icon: Activity, count: activities.length },
                  { key: "favorites", label: "Favoris", icon: Star, count: favorites.length },
                ].map((t) => {
                  const Icon = t.icon
                  const active = activeTab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key as ProfileTab)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                        active ? "text-white" : "text-[#9a9a9a] hover:text-white hover:bg-white/5"
                      }`}
                      style={active ? { backgroundColor: "#f5821f" } : {}}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                      {typeof t.count === "number" && t.count > 0 && (
                        <span
                          className={`text-xs px-1.5 py-0.2 rounded-full ${
                            active ? "bg-black/30 text-white" : "bg-[#2a2a2a] text-[#888888]"
                          }`}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* CONTENU DE L'ONGLET SÉLECTIONNÉ */}
            {/* ═══════════════════════════════════════════════════════════════ */}

            {/* 1. ONGLET VIDÉOS */}
            {activeTab === "videos" && (
              <div>
                {videosLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <AkwaVideoSkeleton key={i} />
                    ))}
                  </div>
                ) : videosError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <p className="text-sm text-[#9a9a9a]">{videosError}</p>
                    <button
                      onClick={() => loadUserVideos(1, true)}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#2a2a2a] hover:bg-[#f5821f] transition"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : videos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Film size={32} className="text-[#666666] mb-3" />
                    <h3 className="text-base font-semibold text-white">Aucune vidéo publiée</h3>
                    <p className="text-sm text-[#9a9a9a] max-w-sm mt-1">
                      Partagez votre première vidéo avec la communauté Akwaplay.
                    </p>
                    {isOwnProfile && (
                      <button
                        onClick={() => setPublishModalOpen(true)}
                        className="mt-4 px-5 py-2.5 rounded-full text-sm font-semibold text-white flex items-center gap-2"
                        style={{ backgroundColor: "#f5821f" }}
                      >
                        <Plus size={16} />
                        <span>Publier maintenant</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {videos.map((video) => (
                      <div key={video.id} className="relative group/card">
                        <AkwaVideoCard video={video} />
                        {isOwnProfile && (
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm p-1 rounded-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setVideoToDelete(video)
                              }}
                              className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition"
                              title="Supprimer la vidéo"
                              aria-label="Supprimer la vidéo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. ONGLET CHAÎNES */}
            {activeTab === "channels" && (
              <div>
                {channelsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-36 rounded-2xl bg-[#222222] animate-pulse" />
                    ))}
                  </div>
                ) : channelsError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <p className="text-sm text-[#9a9a9a]">{channelsError}</p>
                    <button
                      onClick={loadUserChannels}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#2a2a2a] hover:bg-[#f5821f] transition"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : channels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Tv size={32} className="text-[#666666] mb-3" />
                    <h3 className="text-base font-semibold text-white">Aucune chaîne créée</h3>
                    <p className="text-sm text-[#9a9a9a] max-w-sm mt-1">
                      Créez votre propre chaîne thématique sur Akwaplay pour rassembler votre audience.
                    </p>
                    {isOwnProfile && (
                      <button
                        onClick={() => setCreateChannelModal(true)}
                        className="mt-4 px-5 py-2.5 rounded-full text-sm font-semibold text-white flex items-center gap-2"
                        style={{ backgroundColor: "#f5821f" }}
                      >
                        <Plus size={16} />
                        <span>Créer une chaîne</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {channels.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-5 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] hover:border-[#f5821f]/50 transition flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ch.avatar || "/images/avatar.png"}
                            alt={ch.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-[#2a2a2a]"
                          />
                          <div className="min-w-0">
                            <h4 className="text-base font-bold text-white truncate">{ch.name}</h4>
                            <p className="text-xs text-[#9a9a9a] truncate">@{ch.identifiant || ch.slug}</p>
                            <p className="text-xs text-[#666666] mt-1">
                              {ch.videosCount || 0} vidéo{ch.videosCount > 1 ? "s" : ""} •{" "}
                              {ch.subscribersCount || 0} abonné{ch.subscribersCount > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {isOwnProfile && (
                          <button
                            onClick={() => setChannelToDelete(ch)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition shrink-0"
                            title="Supprimer la chaîne"
                            aria-label="Supprimer la chaîne"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. ONGLET SHORTS */}
            {activeTab === "shorts" && (
              <div>
                {shortsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-[9/16] rounded-2xl bg-[#222222] animate-pulse" />
                    ))}
                  </div>
                ) : shortsError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <p className="text-sm text-[#9a9a9a]">{shortsError}</p>
                    <button
                      onClick={loadUserShorts}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#2a2a2a] hover:bg-[#f5821f] transition"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : shorts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Clapperboard size={32} className="text-[#666666] mb-3" />
                    <h3 className="text-base font-semibold text-white">Aucun short disponible</h3>
                    <p className="text-sm text-[#9a9a9a] max-w-sm mt-1">
                      Les vidéos courtes publiées par cet utilisateur apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                    {shorts.map((s) => (
                      <AkwaShortCard
                        key={s.id}
                        short={s}
                        onClick={() => router.push(`/akwaplay/shorts?shortId=${s.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. ONGLET ACTIVITÉS */}
            {activeTab === "activities" && (
              <div>
                {activitiesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-[#222222] animate-pulse" />
                    ))}
                  </div>
                ) : activitiesError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <p className="text-sm text-[#9a9a9a]">{activitiesError}</p>
                    <button
                      onClick={loadUserActivities}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#2a2a2a] hover:bg-[#f5821f] transition"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Activity size={32} className="text-[#666666] mb-3" />
                    <h3 className="text-base font-semibold text-white">Aucune activité récente</h3>
                    <p className="text-sm text-[#9a9a9a] max-w-sm mt-1">
                      Les likes, partages et interactions Akwaplay seront répertoriés ici.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-w-2xl">
                    {activities.map((act, i) => (
                      <div
                        key={act.id || i}
                        onClick={() => {
                          if (act.videoId) router.push(`/akwaplay/watch?v=${act.videoId}`)
                          else if (act.shortId) router.push(`/akwaplay/shorts`)
                        }}
                        className={`p-4 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-between gap-3 text-sm transition ${
                          act.videoId || act.shortId
                            ? "hover:border-[#f5821f]/50 hover:bg-[#222222] cursor-pointer"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={act.user?.avatar || "/images/avatar.png"}
                            alt={act.user?.name || "Utilisateur"}
                            className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-[#333333]"
                          />
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm leading-snug">
                              <span className="font-semibold text-white mr-1.5">
                                {act.user?.name || "Utilisateur"}
                              </span>
                              <span className="text-[#c0c0c0]">{act.text}</span>
                            </p>
                            <span className="text-xs text-[#777777] mt-0.5 block">
                              {act.timeAgo || act.time || "Récemment"}
                            </span>
                          </div>
                        </div>

                        {act.videoId && (
                          <div className="shrink-0 text-xs text-[#f5821f] font-semibold flex items-center gap-1">
                            <span>Voir</span>
                            <Play size={12} className="fill-[#f5821f]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. ONGLET FAVORIS */}
            {activeTab === "favorites" && (
              <div>
                {favoritesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <AkwaVideoSkeleton key={i} />
                    ))}
                  </div>
                ) : favoritesError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <p className="text-sm text-[#9a9a9a]">{favoritesError}</p>
                    <button
                      onClick={loadFavorites}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#2a2a2a] hover:bg-[#f5821f] transition"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Star size={32} className="text-[#666666] mb-3" />
                    <h3 className="text-base font-semibold text-white">Aucune vidéo favorite</h3>
                    <p className="text-sm text-[#9a9a9a] max-w-sm mt-1">
                      Ajoutez des vidéos à vos favoris en cliquant sur l'icône étoile.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {favorites.map((video) => (
                      <AkwaVideoCard key={video.id} video={video} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* ── Modale de création de chaîne ── */}
        {createChannelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div
              className="w-full max-w-lg rounded-2xl p-6 relative border border-[#2e2e2e] shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "#1c1c1c" }}
            >
              {/* Bouton fermeture */}
              <button
                type="button"
                onClick={() => !channelSubmitting && setCreateChannelModal(false)}
                disabled={channelSubmitting}
                className="absolute top-4 right-4 text-[#888888] hover:text-white transition p-1.5 rounded-full hover:bg-white/10"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <Tv className="text-[#f5821f]" size={20} />
                <span>Créer une chaîne Akwaplay</span>
              </h3>

              <form onSubmit={handleCreateChannel} className="space-y-5">
                {/* ── 1. ZONE VISUELLE : BANNIÈRE & AVATAR (IMAGE) ── */}
                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-2">
                    Visuels de la chaîne (Bannière & Photo)
                  </label>

                  {/* Input fichiers masqués */}
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerSelect}
                  />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />

                  {/* Conteneur Bannière */}
                  <div className="relative rounded-xl overflow-hidden border border-[#333333] bg-[#242424]">
                    <div
                      onClick={() => bannerInputRef.current?.click()}
                      className="h-28 sm:h-32 w-full relative cursor-pointer group flex items-center justify-center bg-gradient-to-r from-[#2a2a2a] via-[#202020] to-[#1a1a1a]"
                    >
                      {channelBannerPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={channelBannerPreview}
                          alt="Aperçu bannière"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[#888888] group-hover:text-white transition">
                          <Camera size={22} />
                          <span className="text-xs font-medium">Ajouter une bannière</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white text-xs font-medium backdrop-blur-xs">
                        <Camera size={16} />
                        <span>{channelBannerPreview ? "Changer la bannière" : "Choisir une bannière"}</span>
                      </div>
                    </div>

                    {/* Médaillon Avatar / Image de la chaîne */}
                    <div className="p-3 pt-0 relative flex items-center justify-between">
                      <div className="-mt-10 relative group/avatar">
                        <div
                          onClick={() => avatarInputRef.current?.click()}
                          className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-4 border-[#1c1c1c] bg-[#141414] shadow-lg cursor-pointer relative"
                        >
                          {channelAvatarPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={channelAvatarPreview}
                              alt="Aperçu avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[#777777] group-hover/avatar:text-white transition bg-[#2a2a2a]">
                              <Camera size={20} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition flex items-center justify-center text-white">
                            <Camera size={18} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#f5821f] text-white flex items-center justify-center shadow-md hover:scale-105 transition"
                          title="Choisir la photo de la chaîne"
                        >
                          <Camera size={12} />
                        </button>
                      </div>

                      <div className="flex-1 ml-4 pt-2">
                        <p className="text-xs font-semibold text-white">Photo de profil</p>
                        <p className="text-[11px] text-[#777777]">Format carré recommandé (JPG, PNG)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. INFORMATIONS DE LA CHAÎNE ── */}
                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
                      Nom de la chaîne <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={channelName}
                      onChange={(e) => handleChannelNameChange(e.target.value)}
                      placeholder="Ex: Passion Cinéma, Gaming Zone..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white bg-[#141414] border border-[#333333] focus:border-[#f5821f] outline-none transition placeholder-[#666666]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
                      Identifiant unique (slug / channel_id) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center rounded-xl bg-[#141414] border border-[#333333] focus-within:border-[#f5821f] transition px-3">
                      <span className="text-xs text-[#777777] font-mono mr-1">@</span>
                      <input
                        type="text"
                        required
                        value={channelIdentifiant}
                        onChange={(e) => setChannelIdentifiant(formatChannelIdentifiant(e.target.value))}
                        placeholder="passion-cinema"
                        className="w-full py-2.5 text-xs text-white bg-transparent outline-none font-mono placeholder-[#666666]"
                      />
                    </div>
                    <p className="text-[10px] text-[#777777] mt-1">
                      Lettres minuscules, chiffres, tirets. Identifiant unique de votre chaîne.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
                      Description de la chaîne (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      value={channelDescription}
                      onChange={(e) => setChannelDescription(e.target.value)}
                      placeholder="Présentez le concept, le thème ou les contenus de votre chaîne..."
                      className="w-full px-3.5 py-2 rounded-xl text-xs text-white bg-[#141414] border border-[#333333] focus:border-[#f5821f] outline-none transition placeholder-[#666666] resize-none"
                    />
                  </div>
                </div>

                {/* ── 3. ACTIONS ── */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a2a2a]">
                  <button
                    type="button"
                    onClick={() => setCreateChannelModal(false)}
                    disabled={channelSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a0a0a0] hover:text-white transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={channelSubmitting || !channelName.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 shadow-md"
                    style={{ backgroundColor: "#f5821f" }}
                  >
                    {channelSubmitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Création en cours...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Créer la chaîne</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modale de publication ── */}
        <AkwaPublishModal
          open={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          categories={categories}
          userId={myUserId || targetUserId}
          onPublish={async (payload, onProgress) => {
            const res = await storeVideo(payload, onProgress)
            if (res.video) {
              setVideos((prev) => [res.video!, ...prev])
            }
            return res
          }}
        />

        {/* ── VRAIE MODALE DE CONFIRMATION DE SUPPRESSION VIDÉO ── */}
        {videoToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-[#2e2e2e] animate-in zoom-in-95 duration-200"
              style={{ backgroundColor: "#1c1c1c" }}
            >
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white leading-snug">
                    Supprimer cette vidéo ?
                  </h3>
                  <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                    Cette action est définitive et irréversible. La vidéo ainsi que toutes ses interactions associées seront supprimées.
                  </p>
                </div>
                <button
                  onClick={() => !deletingVideo && setVideoToDelete(null)}
                  disabled={deletingVideo}
                  aria-label="Fermer"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/10 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Aperçu de la vidéo à supprimer */}
              <div className="p-3 rounded-xl bg-[#242424] border border-[#333333] flex items-center gap-3 mb-5">
                <div className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={videoToDelete.thumbnail || "/images/video-placeholder.png"}
                    alt={videoToDelete.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate">
                    {videoToDelete.title}
                  </h4>
                  <p className="text-[11px] text-[#777777] mt-0.5">
                    {videoToDelete.viewsCount || 0} vues • {videoToDelete.durationFormatted || "Vidéo"}
                  </p>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVideoToDelete(null)}
                  disabled={deletingVideo}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9a9a9a] hover:text-white hover:bg-white/5 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVideo}
                  disabled={deletingVideo}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 shadow-lg shadow-red-600/20"
                >
                  {deletingVideo ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Supprimer définitivement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VRAIE MODALE DE CONFIRMATION DE SUPPRESSION CHAÎNE ── */}
        {channelToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-[#2e2e2e] animate-in zoom-in-95 duration-200"
              style={{ backgroundColor: "#1c1c1c" }}
            >
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white leading-snug">
                    Supprimer cette chaîne ?
                  </h3>
                  <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer la chaîne « {channelToDelete.name} » ? Cette action est irréversible.
                  </p>
                </div>
                <button
                  onClick={() => !deletingChannel && setChannelToDelete(null)}
                  disabled={deletingChannel}
                  aria-label="Fermer"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/10 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setChannelToDelete(null)}
                  disabled={deletingChannel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9a9a9a] hover:text-white hover:bg-white/5 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteChannel}
                  disabled={deletingChannel}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 shadow-lg shadow-red-600/20"
                >
                  {deletingChannel ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Supprimer la chaîne</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
