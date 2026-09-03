"use client"

import { useState } from "react"
import { X, UploadCloud, Plus } from "lucide-react"
import type { AkwaCategory, AkwaStoreVideoPayload } from "@/types/akwaplay/akwaplay.types"

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
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string | number>("")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState("0")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  if (!open) return null

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setVideoFile(file)
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      setThumbnailPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setPublishError("Le titre est requis."); return }
    if (!categoryId) { setPublishError("Veuillez choisir une catégorie."); return }
    if (!videoFile) { setPublishError("Veuillez sélectionner un fichier vidéo."); return }

    setPublishing(true)
    setPublishError(null)

    try {
      await onPublish(
        { title: title.trim(), description: description.trim(), categoryId, videoFile, thumbnailFile, userId, privacy },
        (e: ProgressEvent) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total))
        }
      )
      // Réinitialiser
      setTitle(""); setDescription(""); setCategoryId(""); setVideoFile(null)
      setThumbnailFile(null); setThumbnailPreview(null); setUploadProgress(null)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la publication."
      setPublishError(msg)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <h2 className="font-bold text-lg text-white">Publier une vidéo</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9a9a] hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Fichier vidéo */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#9a9a9a] mb-1.5">
              Fichier vidéo *
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-4 text-center transition hover:border-[#f5821f]"
              style={{ borderColor: "#3a3a3a" }}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                id="akwa-video-upload"
                className="hidden"
              />
              <label htmlFor="akwa-video-upload" className="cursor-pointer">
                <UploadCloud className="mx-auto mb-2" size={28} style={{ color: "#f5821f" }} />
                <p className="text-sm font-medium text-white">
                  {videoFile ? videoFile.name : "Cliquer pour sélectionner"}
                </p>
                <p className="text-xs text-[#9a9a9a] mt-1">MP4, WebM, MOV — max 500 Mo</p>
              </label>
            </div>
          </div>

          {/* Miniature */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#9a9a9a] mb-1.5">
              Miniature (optionnel)
            </label>
            <div className="flex items-center gap-3">
              {thumbnailPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailPreview} alt="Miniature" className="w-20 h-12 object-cover rounded-lg border border-[#3a3a3a]" />
              )}
              <label
                className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition hover:bg-[#f5821f]/10"
                style={{ border: "1px solid #f5821f", color: "#f5821f" }}
              >
                Choisir une image
                <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
              </label>
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#9a9a9a] mb-1">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la vidéo"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#6a6a6a] outline-none transition focus:ring-2 focus:ring-[#f5821f]/40"
              style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
              required
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#9a9a9a] mb-1">Catégorie *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition focus:ring-2 focus:ring-[#f5821f]/40"
              style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} style={{ backgroundColor: "#1c1c1c" }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#9a9a9a] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Description de la vidéo…"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#6a6a6a] outline-none resize-none transition focus:ring-2 focus:ring-[#f5821f]/40"
              style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
            />
          </div>

          {/* Barre de progression */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#9a9a9a]">
                <span>Progression</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%`, backgroundColor: "#f5821f" }}
                />
              </div>
            </div>
          )}

          {publishError && (
            <p className="text-red-400 text-xs rounded-xl p-2.5" style={{ backgroundColor: "rgba(220,38,38,0.1)" }}>
              {publishError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#9a9a9a] hover:text-white transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#f5821f" }}
            >
              {publishing ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                  Envoi…
                </>
              ) : (
                <><Plus size={14} /> Publier maintenant</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
