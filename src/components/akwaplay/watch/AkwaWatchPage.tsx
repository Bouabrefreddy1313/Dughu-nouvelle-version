"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  Flag,
  CheckCircle2,
  Play,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaCommentsSection from "@/components/akwaplay/watch/AkwaCommentsSection"
import { useAkwaVideoPlayer } from "@/hooks/akwaplay/useAkwaVideoPlayer"
import { useAkwaVideoComments } from "@/hooks/akwaplay/useAkwaVideoComments"
import { toggleFollowChannel } from "@/services/akwaplay/akwaplayChannel.service"
import { toggleFollow } from "@/services/profile/profile.service"
import FollowButton from "@/components/common/FollowButton"
import { toast } from "sonner"
import type { AkwaVideo } from "@/types/akwaplay/akwaplay.types"

interface AkwaWatchPageProps {
  initialVideoId?: string
  initialUserId?: string
}

export default function AkwaWatchPage({
  initialVideoId = "",
  initialUserId = "",
}: AkwaWatchPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoId = searchParams.get("v") || initialVideoId || "250"

  const { data: rawUser } = useAuth()
  const currentUserId = String(
    rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.user_id || rawUser?.id || initialUserId || ""
  )
  const effectiveUserId = currentUserId || "31262"

  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sur desktop (≥1024px), la sidebar est ouverte par défaut et pousse le contenu
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [selectedReasonId, setSelectedReasonId] = useState<string | number>("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)

  // Suivi / Abonnement à la chaîne / auteur
  const [isFollowing, setIsFollowing] = useState(false)
  const [followingLoading, setFollowingLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  // ── Hook Player Vidéo & Suggestions ──
  const {
    video,
    loading: videoLoading,
    error: videoError,
    streamUrl,
    viewsCount,
    likesCount,
    dislikesCount,
    isLiked,
    isDisliked,
    isFavorite,
    onPlay,
    onTimeUpdate,
    onPauseOrEnd,
    toggleLike,
    toggleDislike,
    toggleFavorite,
    reportReasons,
    loadReportReasons,
    submitReport,
    suggestions,
    loadingSuggestions,
  } = useAkwaVideoPlayer({
    videoId,
    userId: effectiveUserId,
  })

  // Synchroniser le statut d'abonnement au chargement de la vidéo
  useEffect(() => {
    if (video?.author) {
      setIsFollowing(Boolean(video.author.isSubscribed))
    }
  }, [video?.author])

  // ── Hook Commentaires ──
  const {
    comments,
    loading: commentsLoading,
    loadingMore: commentsLoadingMore,
    hasMore: commentsHasMore,
    submitting: commentSubmitting,
    loadMore: loadMoreComments,
    addComment,
    loadReplies,
    addReply,
    toggleLikeComment,
    toggleLikeReply,
    deleteComment,
    deleteReplyComment,
  } = useAkwaVideoComments({
    videoId,
    userId: effectiveUserId,
  })

  // Partager l'URL
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // Fallback
    }
  }

  // Ouvrir modal de signalement
  const handleOpenReport = async () => {
    setReportModalOpen(true)
    if (reportReasons.length === 0) {
      await loadReportReasons()
    }
  }

  // Soumettre signalement
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReasonId) return
    setReportSubmitting(true)
    try {
      await submitReport(selectedReasonId, reportDetails)
      alert("Votre signalement a bien été pris en compte.")
      setReportModalOpen(false)
      setReportDetails("")
      setSelectedReasonId("")
    } catch (err: any) {
      alert(err?.message || "Erreur lors du signalement.")
    } finally {
      setReportSubmitting(false)
    }
  }

  // Abonnement à la chaîne / auteur
  const handleToggleFollow = async () => {
    if (!video?.author?.id) return
    setFollowingLoading(true)
    try {
      try {
        await toggleFollow({ userId: effectiveUserId, targetId: String(video.author.id) })
      } catch {
        await toggleFollowChannel({ channelId: video.author.id, userId: effectiveUserId })
      }
      setIsFollowing((prev) => !prev)
      toast.success(!isFollowing ? "Vous êtes maintenant abonné !" : "Désabonnement effectué")
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'abonnement.")
    } finally {
      setFollowingLoading(false)
    }
  }

  // Clic sur une vidéo suggérée
  const handleSelectSuggestion = (sugVideo: AkwaVideo) => {
    router.push(`/akwaplay/watch?v=${sugVideo.id}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <meta name="theme-color" content="#141414" />
      <div
        className="min-h-screen"
        style={{
          backgroundColor: "#141414",
          color: "#ffffff",
          fontFamily: "'Inter', 'Roboto', sans-serif",
        }}
      >
        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          searchQuery=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onClearSearch={() => {}}
          onPublishClick={() => router.push("/akwaplay/profile")}
        />

        <div className="flex pt-14">
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => router.push("/akwaplay/profile")}
          />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-3 py-4 md:px-6 md:py-6 ${
              sidebarOpen ? "lg:ml-[220px]" : "lg:ml-0"
            }`}
          >
            {/* Conteneur 2 colonnes YouTube */}
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ═════════════════════════════════════════════════════════════ */}
              {/* COLONNE GAUCHE (8 colonnes) : LECTEUR + INFOS + COMMENTAIRES */}
              {/* ═════════════════════════════════════════════════════════════ */}
              <div className="lg:col-span-8 space-y-4 min-w-0">
                {/* ── LECTEUR VIDÉO 16:9 ── */}
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                  {videoLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] animate-pulse text-[#888888]">
                      <Play size={48} className="text-[#985810] opacity-80 mb-2" />
                      <span className="text-sm">Chargement de la vidéo...</span>
                    </div>
                  ) : videoError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] text-center p-6 text-[#9a9a9a]">
                      <p className="text-base text-white font-semibold mb-1">
                        Impossible de lire la vidéo
                      </p>
                      <p className="text-sm max-w-sm mb-4">{videoError}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-[#985810]"
                      >
                        Recharger la page
                      </button>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      controls
                      autoPlay
                      playsInline
                      poster={video?.thumbnail}
                      src={video?.videoUrl || streamUrl}
                      onPlay={onPlay}
                      onTimeUpdate={(e) => {
                        const target = e.currentTarget
                        onTimeUpdate(target.currentTime, target.duration)
                      }}
                      onPause={onPauseOrEnd}
                      onEnded={onPauseOrEnd}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* ── TITRE DE LA VIDÉO ── */}
                <h1 className="text-lg md:text-xl font-bold text-white leading-snug">
                  {video?.title || "Lecture de vidéo Akwaplay"}
                </h1>

                {/* ── LIGNE CRÉATEUR & ACTIONS (LIKE, SHARE, ETC.) ── */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-[#2a2a2a]">
                  {/* Profil Créateur */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video?.author?.avatar || "/images/avatar.png"}
                      alt={video?.author?.name || "Créateur"}
                      onClick={() => {
                        if (video?.author?.id) {
                          router.push(`/akwaplay/profile?userId=${video.author.id}`)
                        }
                      }}
                      className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover cursor-pointer ring-1 ring-[#3a3a3a]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => {
                            if (video?.author?.id) {
                              router.push(`/akwaplay/profile?userId=${video.author.id}`)
                            }
                          }}
                          className="text-sm md:text-base font-bold text-white hover:text-[#985810] transition cursor-pointer truncate"
                        >
                          {video?.author?.name || "Créateur Akwaplay"}
                        </span>
                        {video?.author?.verified && (
                          <CheckCircle2 size={14} className="text-[#985810] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#888888]">
                        {video?.author?.subscribersCount || 0} abonné
                        {(video?.author?.subscribersCount || 0) > 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Composant réutilisable S'abonner */}
                    <FollowButton
                      isFollowing={isFollowing}
                      isLoading={followingLoading}
                      onClick={handleToggleFollow}
                      className="ml-2"
                    />
                  </div>

                  {/* Boutons d'interaction à droite */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Pilule Like / Dislike */}
                    <div
                      className="flex items-center rounded-full overflow-hidden text-xs font-semibold"
                      style={{ backgroundColor: "#222222", border: "1px solid #333333" }}
                    >
                      <button
                        onClick={toggleLike}
                        className={`flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 transition ${
                          isLiked ? "text-[#985810]" : "text-white"
                        }`}
                        title="J'aime cette vidéo"
                      >
                        <ThumbsUp size={15} className={isLiked ? "fill-[#985810]" : ""} />
                        <span>{likesCount}</span>
                      </button>
                      <div className="w-[1px] h-4 bg-[#3a3a3a]" />
                      {/* Bouton Dislike */}
                      <button
                        onClick={toggleDislike}
                        className={`flex items-center gap-1.5 px-3.5 py-2 hover:bg-white/10 transition ${
                          isDisliked ? "text-[#985810]" : "text-white"
                        }`}
                        title="Je n'aime pas cette vidéo"
                      >
                        <ThumbsDown size={15} className={isDisliked ? "fill-[#985810]" : ""} />
                        <span>{dislikesCount}</span>
                      </button>
                    </div>

                    {/* Bouton Favori */}
                    <button
                      onClick={toggleFavorite}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition ${
                        isFavorite
                          ? "bg-[#985810] text-white"
                          : "bg-[#222222] text-white hover:bg-[#2a2a2a] border border-[#333333]"
                      }`}
                      title="Ajouter aux favoris"
                    >
                      <Star size={15} className={isFavorite ? "fill-white" : ""} />
                      <span>{isFavorite ? "Favori" : "Enregistrer"}</span>
                    </button>

                    {/* Bouton Partager */}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white bg-[#222222] hover:bg-[#2a2a2a] border border-[#333333] transition"
                      title="Partager"
                    >
                      <Share2 size={15} />
                      <span>{copied ? "Lien copié !" : "Partager"}</span>
                    </button>

                    {/* Bouton Signaler */}
                    <button
                      onClick={handleOpenReport}
                      className="p-2 rounded-full text-[#888888] hover:text-white bg-[#222222] hover:bg-[#2a2a2a] border border-[#333333] transition"
                      title="Signaler la vidéo"
                    >
                      <Flag size={15} />
                    </button>
                  </div>
                </div>

                {/* ── PANNEAU DESCRIPTION ── */}
                <div
                  onClick={() => setDescriptionExpanded((v) => !v)}
                  className="rounded-2xl p-4 bg-[#1c1c1c] border border-[#2a2a2a] hover:bg-[#222222] cursor-pointer transition"
                >
                  <div className="flex items-center gap-4 text-xs font-semibold text-white mb-2">
                    <span className="flex items-center gap-1">
                      <Eye size={13} className="text-[#985810]" />
                      {viewsCount} vue{viewsCount > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-[#9a9a9a]">
                      <Clock size={13} />
                      {video?.timeAgo || "Récemment"}
                    </span>
                    {video?.category && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#2a2a2a] text-[#c0c0c0]">
                        {video.category.name}
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs md:text-sm text-[#d0d0d0] whitespace-pre-line leading-relaxed ${
                      descriptionExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {video?.description || "Aucune description fournie pour cette vidéo."}
                  </p>

                  <button className="mt-2 text-xs font-semibold text-[#985810] flex items-center gap-1">
                    <span>{descriptionExpanded ? "Afficher moins" : "Afficher plus"}</span>
                    {descriptionExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* ── SECTION COMMENTAIRES ── */}
                <AkwaCommentsSection
                  comments={comments}
                  loading={commentsLoading}
                  loadingMore={commentsLoadingMore}
                  hasMore={commentsHasMore}
                  submitting={commentSubmitting}
                  currentUserId={effectiveUserId}
                  currentUserAvatar={rawUser?.avatar}
                  onLoadMore={loadMoreComments}
                  onAddComment={addComment}
                  onLoadReplies={loadReplies}
                  onReply={addReply}
                  onToggleLikeComment={toggleLikeComment}
                  onToggleLikeReply={toggleLikeReply}
                  onDeleteComment={deleteComment}
                  onDeleteReply={deleteReplyComment}
                />
              </div>

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* COLONNE DROITE (4 colonnes) : SUGGESTIONS "VOIR AUSSI"     */}
              {/* ═════════════════════════════════════════════════════════════ */}
              <div className="lg:col-span-4 space-y-3.5 min-w-0">
                <h3 className="text-base font-bold text-white mb-3">Vidéos suggérées</h3>

                {loadingSuggestions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex gap-2.5 animate-pulse">
                        <div className="w-36 md:w-40 aspect-video rounded-xl bg-[#222222] shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-[#222222] rounded w-full" />
                          <div className="h-3 bg-[#1e1e1e] rounded w-2/3" />
                          <div className="h-2.5 bg-[#1a1a1a] rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="py-8 text-center text-[#777777] text-xs">
                    Aucune vidéo similaire pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((sug) => (
                      <div
                        key={sug.id}
                        onClick={() => handleSelectSuggestion(sug)}
                        className="flex gap-2.5 cursor-pointer group hover:bg-white/5 p-1.5 rounded-xl transition"
                      >
                        {/* Miniature compacte 16:9 */}
                        <div className="relative w-36 md:w-40 aspect-video rounded-xl overflow-hidden bg-[#222222] shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sug.thumbnail || "/images/default-thumbnail.jpg"}
                            alt={sug.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          {sug.durationFormatted && (
                            <span className="absolute bottom-1 right-1 text-[10px] font-semibold text-white px-1 py-0.5 rounded bg-black/80">
                              {sug.durationFormatted}
                            </span>
                          )}
                        </div>

                        {/* Infos vidéo compacte */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs md:text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#985810] transition-colors">
                            {sug.title}
                          </h4>
                          <p className="text-[11px] text-[#888888] mt-1 truncate">
                            {sug.author?.name || "Créateur"}
                          </p>
                          <p className="text-[10px] text-[#666666] mt-0.5">
                            {sug.viewsCount || 0} vue{(sug.viewsCount || 0) > 1 ? "s" : ""} •{" "}
                            {sug.timeAgo || "Récemment"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* ── MODALE DE SIGNALEMENT ── */}
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div
              className="w-full max-w-md rounded-2xl p-6 relative"
              style={{ backgroundColor: "#1e1e1e", border: "1px solid #333333" }}
            >
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Flag className="text-[#985810]" size={18} />
                <span>Signaler cette vidéo</span>
              </h3>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-2">
                    Motif du signalement *
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {reportReasons.length === 0 ? (
                      <p className="text-xs text-[#777777]">Chargement des motifs...</p>
                    ) : (
                      reportReasons.map((r) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-[#d0d0d0] hover:bg-white/5 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="reportReason"
                            value={r.id}
                            checked={String(selectedReasonId) === String(r.id)}
                            onChange={() => setSelectedReasonId(r.id)}
                            className="text-[#985810] focus:ring-[#985810]"
                          />
                          <span>{r.reason}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
                    Détails supplémentaires (facultatif)
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Précisez pourquoi vous signalez ce contenu..."
                    rows={3}
                    className="w-full px-3.5 py-2 rounded-xl text-xs text-white placeholder-[#666666] bg-[#141414] border border-[#333333] focus:border-[#985810] outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a0a0a0] hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedReasonId || reportSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#985810" }}
                  >
                    {reportSubmitting ? "Envoi..." : "Envoyer le signalement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
