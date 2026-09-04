"use client"

import { useState, useEffect, useRef } from "react"
import {
  X,
  UploadCloud,
  Plus,
  Sparkles,
  Film,
  Globe,
  Lock,
  Link as LinkIcon,
  RefreshCw,
  Tv,
  Check,
  AlertCircle,
} from "lucide-react"
import type { AkwaCategory, AkwaStoreVideoPayload } from "@/types/akwaplay/akwaplay.types"
import type { AkwaChannel } from "@/types/akwaplay/akwaplayChannel.types"
import { getUserChannels } from "@/services/akwaplay/akwaplayChannel.service"
import { generateVideoThumbnail } from "@/services/akwaplay/akwaplay.helpers"

interface AkwaPublishModalProps {
  open: boolean
  onClose: () => void
  categories: AkwaCategory[]
  userId: string
  onPublish: (payload: AkwaStoreVideoPayload, onProgress?: (e: ProgressEvent) => void) => Promise<unknown>
}

export default function AkwaPublishModal({
  open,
  onClose,
  categories,
  userId,
  onPublish,
}: AkwaPublishModalProps) {
  // ── Champs de formulaire requis ──
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string | number>("")
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public")
  const [channelId, setChannelId] = useState<string | number>("")

  // Fichiers et métadonnées
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isAutoThumbnail, setIsAutoThumbnail] = useState(false)
  const [duration, setDuration] = useState<string>("")
  const [durationSecs, setDurationSecs] = useState<number>(0)
  const [thumbnailTime, setThumbnailTime] = useState<number>(1)

  // États de chargement et d'upload
  const [generatingThumb, setGeneratingThumb] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  // Chaînes disponibles pour cet utilisateur
  const [userChannels, setUserChannels] = useState<AkwaChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)

  // Charger les chaînes de l'utilisateur à l'ouverture
  useEffect(() => {
    if (!open || !userId) return
    let active = true
    setChannelsLoading(true)
    getUserChannels(userId)
      .then((res) => {
        if (active) setUserChannels(res)
      })
      .catch(() => {
        // Silencieux : fallback sur le profil personnel
      })
      .finally(() => {
        if (active) setChannelsLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, userId])

  if (!open) return null

  // ── 1. Sélection de la vidéo et génération automatique de la miniature ──
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVideoFile(file)
    setPublishError(null)
    setGeneratingThumb(true)

    // Pré-remplir le titre si vide
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
    }

    try {
      // Génère automatiquement la miniature à 1 seconde
      const res = await generateVideoThumbnail(file, 1.0)
      setThumbnailFile(res.file)
      setThumbnailPreview(res.dataUrl)
      setIsAutoThumbnail(true)
      setDuration(res.durationFormatted)
      setDurationSecs(res.durationSeconds)
      setThumbnailTime(Math.min(1.0, res.durationSeconds))
    } catch (err: any) {
      // Fallback si la génération automatique échoue
      setPublishError(
        "Vidéo chargée, mais la génération automatique de la miniature a échoué. Vous pouvez en téléverser une manuellement."
      )
    } finally {
      setGeneratingThumb(false)
    }
  }

  // ── 2. Régénérer la miniature à un moment précis du curseur ──
  const handleRegenerateThumbnail = async (seekTime: number) => {
    if (!videoFile) return
    setThumbnailTime(seekTime)
    setGeneratingThumb(true)
    try {
      const res = await generateVideoThumbnail(videoFile, seekTime)
      setThumbnailFile(res.file)
      setThumbnailPreview(res.dataUrl)
      setIsAutoThumbnail(true)
    } catch {
      // Ignorer
    } finally {
      setGeneratingThumb(false)
    }
  }

  // ── 4. Soumission du formulaire ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setPublishError("Le titre de la vidéo est obligatoire.")
      return
    }
    if (!categoryId) {
      setPublishError("Veuillez sélectionner une catégorie.")
      return
    }
    if (!videoFile) {
      setPublishError("Veuillez sélectionner un fichier vidéo.")
      return
    }

    // Si la durée n'est pas encore calculée
    const finalDuration = duration || "00:10"

    setPublishing(true)
    setPublishError(null)

    try {
      await onPublish(
        {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          videoFile,
          thumbnailFile,
          userId,
          visibility,
          duration: finalDuration,
          channelId: channelId || null,
        },
        (progressEvent: ProgressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
          }
        }
      )

      // Réinitialiser les champs
      setTitle("")
      setDescription("")
      setCategoryId("")
      setVisibility("public")
      setChannelId("")
      setVideoFile(null)
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setDuration("")
      setUploadProgress(null)
      onClose()
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la publication de la vidéo."
      setPublishError(msg)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200 border border-[#2a2a2a] max-h-[92vh] flex flex-col"
        style={{ backgroundColor: "#1c1c1c" }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#2a2a2a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f5821f]/20 flex items-center justify-center text-[#f5821f]">
              <Film size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">Publier une vidéo</h2>
              <p className="text-xs text-[#888888]">Akwaplay Vidéos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9a9a] hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1">
          {/* 1. FICHIER VIDÉO */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#a0a0a0] mb-1.5">
              Fichier vidéo *
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
                videoFile
                  ? "border-[#f5821f]/60 bg-[#f5821f]/5"
                  : "border-[#3a3a3a] hover:border-[#f5821f]/50 hover:bg-[#252525]"
              }`}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                id="akwa-video-upload"
                className="hidden"
                disabled={publishing}
              />
              <label htmlFor="akwa-video-upload" className="cursor-pointer block">
                <UploadCloud
                  className="mx-auto mb-1.5"
                  size={32}
                  style={{ color: videoFile ? "#f5821f" : "#888888" }}
                />
                <p className="text-sm font-semibold text-white truncate max-w-sm mx-auto">
                  {videoFile ? videoFile.name : "Cliquez ou glissez une vidéo ici"}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1 text-xs text-[#888888]">
                  <span>MP4, WebM, MOV</span>
                  {duration && (
                    <>
                      <span>•</span>
                      <span className="text-[#f5821f] font-medium">Durée : {duration}</span>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* 2. MINIATURE GÉNÉRÉE AUTOMATIQUEMENT */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase text-[#a0a0a0]">
                Miniature (Thumbnail) *
              </label>
              {isAutoThumbnail && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#f5821f] font-semibold bg-[#f5821f]/10 px-2 py-0.5 rounded-full">
                  <Sparkles size={11} />
                  Générée automatiquement
                </span>
              )}
            </div>

            {generatingThumb ? (
              <div className="w-full aspect-video rounded-xl bg-[#222222] flex flex-col items-center justify-center gap-2 border border-[#333333] animate-pulse">
                <RefreshCw size={24} className="text-[#f5821f] animate-spin" />
                <span className="text-xs text-[#9a9a9a]">Extraction de la miniature...</span>
              </div>
            ) : thumbnailPreview ? (
              <div className="space-y-2">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#333333] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailPreview}
                    alt="Miniature générée"
                    className="w-full h-full object-cover"
                  />
                  {duration && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] px-1.5 py-0.5 rounded font-mono font-medium">
                      {duration}
                    </span>
                  )}
                </div>

                {/* Sélecteur de moment dans la vidéo */}
                {videoFile && durationSecs > 1 && (
                  <div className="p-2.5 rounded-xl bg-[#222222] border border-[#2e2e2e] space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] text-[#9a9a9a]">
                      <span>Moment de capture dans la vidéo :</span>
                      <span className="font-mono text-[#f5821f] font-semibold">
                        {Math.floor(thumbnailTime)}s / {Math.floor(durationSecs)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={Math.max(1, durationSecs - 0.5)}
                      step={0.5}
                      value={thumbnailTime}
                      onChange={(e) => handleRegenerateThumbnail(Number(e.target.value))}
                      className="w-full accent-[#f5821f] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#333333] text-center bg-[#222222]/40">
                <p className="text-xs text-[#888888]">
                  La miniature sera générée automatiquement dès la sélection de votre vidéo.
                </p>
              </div>
            )}
          </div>

          {/* 3. TITRE */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#a0a0a0] mb-1">
              Titre de la vidéo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Donnez un titre captivant à votre vidéo"
              maxLength={150}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#6a6a6a] outline-none transition focus:ring-2 focus:ring-[#f5821f]/40 bg-[#262626] border border-[#363636]"
              required
              disabled={publishing}
            />
            <div className="text-right text-[11px] text-[#777777] mt-0.5">
              {title.length}/150
            </div>
          </div>

          {/* 4. CATÉGORIE & CHAÎNE (GRILLE 2 COLONNES) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Catégorie */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#a0a0a0] mb-1">
                Catégorie *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition focus:ring-2 focus:ring-[#f5821f]/40 bg-[#262626] border border-[#363636]"
                required
                disabled={publishing}
              >
                <option value="">Choisir une catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#1c1c1c]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chaîne */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#a0a0a0] mb-1">
                Chaîne (optionnel)
              </label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition focus:ring-2 focus:ring-[#f5821f]/40 bg-[#262626] border border-[#363636]"
                disabled={publishing || channelsLoading}
              >
                <option value="" className="bg-[#1c1c1c]">
                  Mon profil personnel
                </option>
                {userChannels.map((ch) => (
                  <option key={ch.id} value={ch.id} className="bg-[#1c1c1c]">
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. VISIBILITÉ */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#a0a0a0] mb-1.5">
              Visibilité *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", label: "Public", icon: Globe, desc: "Tout le monde" },
                { id: "unlisted", label: "Non répertorié", icon: LinkIcon, desc: "Via le lien" },
                { id: "private", label: "Privé", icon: Lock, desc: "Vous seul" },
              ].map(({ id, label, icon: Icon, desc }) => {
                const active = visibility === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVisibility(id as any)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      active
                        ? "border-[#f5821f] bg-[#f5821f]/10 text-white"
                        : "border-[#333333] bg-[#242424] text-[#888888] hover:border-[#444444] hover:text-[#cccccc]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon size={14} className={active ? "text-[#f5821f]" : ""} />
                      {active && <Check size={12} className="text-[#f5821f]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{label}</p>
                      <p className="text-[10px] text-[#777777] truncate">{desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 6. DESCRIPTION */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#a0a0a0] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Décrivez votre vidéo, ajoutez des précisions, des liens ou des mots-clés…"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#6a6a6a] outline-none resize-none transition focus:ring-2 focus:ring-[#f5821f]/40 bg-[#262626] border border-[#363636]"
              disabled={publishing}
            />
          </div>

          {/* Barre de progression */}
          {uploadProgress !== null && (
            <div className="space-y-1.5 p-3 rounded-xl bg-[#242424] border border-[#333333]">
              <div className="flex justify-between text-xs text-[#a0a0a0]">
                <span>Téléversement en cours...</span>
                <span className="font-mono text-[#f5821f] font-semibold">{uploadProgress}%</span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden bg-[#1c1c1c]">
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%`, backgroundColor: "#f5821f" }}
                />
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {publishError && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{publishError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#2a2a2a] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={publishing}
              className="px-4 py-2.5 rounded-xl text-sm text-[#9a9a9a] hover:text-white hover:bg-white/5 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={publishing || generatingThumb}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[#f5821f]/20"
              style={{ backgroundColor: "#f5821f" }}
            >
              {publishing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Publication...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Publier la vidéo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
