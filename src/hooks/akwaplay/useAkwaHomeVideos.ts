"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { AkwaVideo, AkwaCategory, AkwaStoreVideoPayload } from "@/types/akwaplay/akwaplay.types"
import {
  getCategories,
  getAllVideos,
  getVideosByCategory,
  searchVideos,
  storeVideo,
} from "@/services/akwaplay/akwaplayVideo.service"

interface UseAkwaHomeVideosOptions {
  userId?: string | number
  initialCategoryId?: string | number | null
}

export function useAkwaHomeVideos({ userId, initialCategoryId = null }: UseAkwaHomeVideosOptions = {}) {
  const [categories, setCategories] = useState<AkwaCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(initialCategoryId)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeQuery, setActiveQuery] = useState("")

  const [videos, setVideos] = useState<AkwaVideo[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Charge les catégories au montage
  useEffect(() => {
    let mounted = true
    getCategories()
      .then((cats) => {
        if (mounted) setCategories(cats)
      })
      .catch(() => {
        // Fallback silencieux ou vide pour les catégories
      })
    return () => {
      mounted = false
    }
  }, [])

  // Résout l'identifiant utilisateur stabilisé (utilisateur connecté ou fallback 31262)
  const effectiveUserId = (userId && String(userId).trim() !== "") ? String(userId).trim() : "31262"

  // 2. Fonction centrale de chargement des vidéos (remplace ou accumule selon pageNum)
  const loadVideos = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      const targetUserId = effectiveUserId

      // Annule la requête précédente en cours si nécessaire
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller
      const signal = controller.signal

      if (pageNum === 1) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      let aborted = false

      try {
        let result: { videos: AkwaVideo[]; hasMore: boolean; page: number }

        if (activeQuery.trim()) {
          // Mode recherche
          result = await searchVideos(targetUserId, activeQuery, pageNum, signal)
        } else if (selectedCategoryId && selectedCategoryId !== 0 && selectedCategoryId !== "all") {
          // Mode catégorie
          result = await getVideosByCategory(selectedCategoryId, targetUserId, pageNum, signal)
        } else {
          // Mode "Tous" par défaut
          result = await getAllVideos(targetUserId, pageNum, signal)
        }

        if (signal.aborted) {
          aborted = true
          return
        }

        setVideos((prev) => (pageNum === 1 || isRefresh ? result.videos : [...prev, ...result.videos]))
        setHasMore(result.hasMore)
        setPage(pageNum)
      } catch (err: any) {
        const isAbort =
          signal.aborted ||
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED" ||
          err?.cause?.name === "CanceledError" ||
          err?.cause?.name === "AbortError" ||
          (err instanceof Error && (err.message.includes("annulée") || err.message.includes("canceled")))

        if (isAbort) {
          aborted = true
          return
        }
        setError(err?.message || "Erreur lors du chargement des vidéos.")
      } finally {
        // N'éteindre le loading QUE si cette requête spécifique est toujours active et non avortée
        if (!aborted && !signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [effectiveUserId, selectedCategoryId, activeQuery]
  )

  // Déclenche le rechargement dès que la catégorie ou la recherche validée change
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    loadVideos(1, true)
  }, [loadVideos])

  // Passer à la page suivante (scroll infini ou clic "Charger plus")
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadVideos(page + 1)
    }
  }, [loading, loadingMore, hasMore, page, loadVideos])

  // Déclencher la recherche au submit du formulaire
  const submitSearch = useCallback((query?: string) => {
    const q = (query !== undefined ? query : searchQuery).trim()
    setActiveQuery(q)
  }, [searchQuery])

  // Réinitialiser la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setActiveQuery("")
  }, [])

  // Sélectionner une catégorie
  const selectCategory = useCallback((categoryId: string | number | null) => {
    setSelectedCategoryId(categoryId)
    // Réinitialise la recherche lors du changement de tab de catégorie
    setSearchQuery("")
    setActiveQuery("")
  }, [])

  // Action de publication d'une vidéo
  const publishVideo = useCallback(
    async (payload: AkwaStoreVideoPayload, onProgress?: (e: any) => void) => {
      const res = await storeVideo(payload, onProgress)
      if (res.video) {
        // Insère la vidéo en tête de liste
        setVideos((prev) => [res.video!, ...prev])
      }
      return res
    },
    []
  )

  return {
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
    refresh: () => loadVideos(1, true),
    publishVideo,
  }
}
