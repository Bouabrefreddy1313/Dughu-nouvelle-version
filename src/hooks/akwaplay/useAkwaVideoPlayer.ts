"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import type { AkwaVideo, AkwaReportReason } from "@/types/akwaplay/akwaplay.types"
import {
  getVideoDetails,
  getVideoStreamUrl,
  incrementViews,
  saveProgress,
  toggleLikeVideo,
  toggleFavoriteVideo,
  getReportReasons,
  reportVideo,
  getTrendingByCategory,
  getTrendingVideos,
} from "@/services/akwaplay/akwaplayVideo.service"

interface UseAkwaVideoPlayerOptions {
  videoId: string | number
  userId?: string | number
  autoIncrementViews?: boolean
  progressIntervalSeconds?: number // ex: toutes les 10s
}

export function useAkwaVideoPlayer({
  videoId,
  userId,
  autoIncrementViews = true,
  progressIntervalSeconds = 10,
}: UseAkwaVideoPlayerOptions) {
  const [video, setVideo] = useState<AkwaVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Statuts d'interaction
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [dislikesCount, setDislikesCount] = useState(0)
  const [viewsCount, setViewsCount] = useState(0)

  // Motifs de signalement
  const [reportReasons, setReportReasons] = useState<AkwaReportReason[]>([])
  const [loadingReasons, setLoadingReasons] = useState(false)

  // Suggestions (Sidebar "Voir aussi")
  const [suggestions, setSuggestions] = useState<AkwaVideo[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Réf pour le suivi de progression
  const viewIncrementedRef = useRef(false)
  const currentProgressRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  const lastSavedProgressRef = useRef<number>(0)

  // 1. Charger les détails de la vidéo au montage
  useEffect(() => {
    let mounted = true
    if (!videoId) return

    setLoading(true)
    setError(null)
    viewIncrementedRef.current = false

    getVideoDetails(videoId, userId || "")
      .then((data) => {
        if (!mounted) return
        setVideo(data.video)
        setIsLiked(data.isLiked)
        setIsDisliked(data.isDisliked)
        setIsFavorite(data.isFavorite)
        setLikesCount(data.video.likesCount)
        setDislikesCount(data.video.dislikesCount)
        setViewsCount(data.video.viewsCount)
        durationRef.current = data.video.duration || 0
        currentProgressRef.current = data.video.progress || 0
        lastSavedProgressRef.current = data.video.progress || 0
      })
      .catch((err) => {
        if (mounted) setError(err?.message || "Impossible de charger la vidéo.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [videoId, userId])

  // 2. Incrémenter les vues lors du démarrage de la lecture
  const onPlay = useCallback(() => {
    if (!viewIncrementedRef.current && autoIncrementViews && videoId) {
      viewIncrementedRef.current = true
      incrementViews(videoId, userId).then((res) => {
        if (res.viewsCount !== undefined) {
          setViewsCount(res.viewsCount)
        } else {
          setViewsCount((v) => v + 1)
        }
      })
    }
  }, [videoId, userId, autoIncrementViews])

  // 3. Suivi et sauvegarde de progression
  const onTimeUpdate = useCallback(
    (currentTime: number, totalDuration?: number) => {
      currentProgressRef.current = currentTime
      if (totalDuration) durationRef.current = totalDuration

      // Sauvegarde périodique toutes les X secondes
      if (
        userId &&
        Math.abs(currentTime - lastSavedProgressRef.current) >= progressIntervalSeconds
      ) {
        lastSavedProgressRef.current = currentTime
        saveProgress({
          videoId,
          userId,
          progress: currentTime,
          duration: durationRef.current,
        })
      }
    },
    [videoId, userId, progressIntervalSeconds]
  )

  const onPauseOrEnd = useCallback(() => {
    if (userId && currentProgressRef.current > 0) {
      lastSavedProgressRef.current = currentProgressRef.current
      saveProgress({
        videoId,
        userId,
        progress: currentProgressRef.current,
        duration: durationRef.current,
      })
    }
  }, [videoId, userId])

  // Sauvegarde à la fermeture / démontage
  useEffect(() => {
    return () => {
      if (userId && currentProgressRef.current > 0) {
        saveProgress({
          videoId,
          userId,
          progress: currentProgressRef.current,
          duration: durationRef.current,
        })
      }
    }
  }, [videoId, userId])

  // 4. Like / Dislike avec Optimistic UI
  const handleToggleLike = useCallback(
    async (action: "like" | "dislike" = "like") => {
      if (!userId) throw new Error("Veuillez vous connecter pour réagir.")

      // Optimistic update
      const prevIsLiked = isLiked
      const prevIsDisliked = isDisliked
      const prevLikesCount = likesCount
      const prevDislikesCount = dislikesCount

      if (action === "like") {
        if (prevIsLiked) {
          setIsLiked(false)
          setLikesCount((c) => Math.max(0, c - 1))
        } else {
          setIsLiked(true)
          setLikesCount((c) => c + 1)
          if (prevIsDisliked) {
            setIsDisliked(false)
            setDislikesCount((c) => Math.max(0, c - 1))
          }
        }
      } else {
        if (prevIsDisliked) {
          setIsDisliked(false)
          setDislikesCount((c) => Math.max(0, c - 1))
        } else {
          setIsDisliked(true)
          setDislikesCount((c) => c + 1)
          if (prevIsLiked) {
            setIsLiked(false)
            setLikesCount((c) => Math.max(0, c - 1))
          }
        }
      }

      try {
        const res = await toggleLikeVideo(videoId, userId, action)
        if (res.likesCount !== undefined) setLikesCount(res.likesCount)
        if (res.dislikesCount !== undefined) setDislikesCount(res.dislikesCount)
        if (res.liked !== undefined) setIsLiked(res.liked)
        if (res.disliked !== undefined) setIsDisliked(res.disliked)
        toast.success(res.message || (action === "like" ? "Réaction enregistrée !" : "Mention enregistrée"))
      } catch (err) {
        // Rollback
        setIsLiked(prevIsLiked)
        setIsDisliked(prevIsDisliked)
        setLikesCount(prevLikesCount)
        setDislikesCount(prevDislikesCount)
        throw err
      }
    },
    [videoId, userId, isLiked, isDisliked, likesCount, dislikesCount]
  )

  // 5. Favoris avec Optimistic UI
  const handleToggleFavorite = useCallback(async () => {
    if (!userId) throw new Error("Veuillez vous connecter pour ajouter aux favoris.")

    const prevFavorite = isFavorite
    setIsFavorite(!prevFavorite)

    try {
      const res = await toggleFavoriteVideo(videoId, userId)
      setIsFavorite(res.isFavorite)
      toast.success(res.isFavorite ? "Ajouté à vos favoris !" : "Retiré de vos favoris")
      return res.isFavorite
    } catch (err) {
      setIsFavorite(prevFavorite)
      throw err
    }
  }, [videoId, userId, isFavorite])

  // 6. Chargement des motifs et signalement
  const loadReportReasons = useCallback(async () => {
    setLoadingReasons(true)
    try {
      const reasons = await getReportReasons()
      setReportReasons(reasons)
      return reasons
    } finally {
      setLoadingReasons(false)
    }
  }, [])

  const submitReport = useCallback(
    async (reasonId: string | number, details?: string) => {
      if (!userId) throw new Error("Veuillez vous connecter pour signaler.")
      return await reportVideo({
        videoId,
        reasonId,
        details,
        userId,
      })
    },
    [videoId, userId]
  )

  // 7. Charger les suggestions ("Voir aussi")
  useEffect(() => {
    let mounted = true
    if (!videoId) return

    setLoadingSuggestions(true)
    const categoryId = video?.categoryId

    const fetchPromise =
      categoryId && userId
        ? getTrendingByCategory(categoryId, userId, 1)
        : getTrendingVideos(1)

    fetchPromise
      .then((res) => {
        if (mounted) {
          // Exclure la vidéo courante des suggestions
          setSuggestions(res.videos.filter((v) => String(v.id) !== String(videoId)))
        }
      })
      .catch(() => {
        // Ignore silencieux
      })
      .finally(() => {
        if (mounted) setLoadingSuggestions(false)
      })

    return () => {
      mounted = false
    }
  }, [videoId, video?.categoryId, userId])

  return {
    video,
    loading,
    error,
    streamUrl: getVideoStreamUrl(videoId),
    viewsCount,
    likesCount,
    dislikesCount,
    isLiked,
    isDisliked,
    isFavorite,
    onPlay,
    onTimeUpdate,
    onPauseOrEnd,
    toggleLike: () => handleToggleLike("like"),
    toggleDislike: () => handleToggleLike("dislike"),
    toggleFavorite: handleToggleFavorite,
    reportReasons,
    loadingReasons,
    loadReportReasons,
    submitReport,
    suggestions,
    loadingSuggestions,
  }
}
