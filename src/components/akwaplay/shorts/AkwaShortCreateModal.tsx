"use client"

import { useState, useRef } from "react"
import { X, Upload, Video, RefreshCw, Clapperboard, Check } from "lucide-react"
import { toast } from "sonner"
import type { AkwaShort } from "@/services/akwaplay/akwaplayShort.service"
import { storeShort } from "@/services/akwaplay/akwaplayShort.service"

interface AkwaShortCreateModalProps {
  open: boolean
  onClose: () => void
  userId: string | number
  onSuccess: (short?: AkwaShort) => void
}

export default function AkwaShortCreateModal({
  open,
  onClose,
  userId,
  onSuccess,
}: AkwaShortCreateModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      toast.error("Veuillez sélectionner un fichier vidéo valide (MP4, WebM, MOV).")
      return
    }

    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile) {
      toast.error("Veuillez sélectionner une vidéo.")
      return
    }

    setSubmitting(true)
    setUploadProgress(0)

    try {
      const res = await storeShort(
        {
          videoFile,
          caption: caption.trim() || undefined,
          title: caption.trim() || undefined,
          userId,
        },
        (percent) => setUploadProgress(percent)
      )

      if (res.success) {
        toast.success("Capsule publiée avec succès !")
        onSuccess(res.short)
        handleClose()
      } else {
        toast.error(res.message || "Erreur lors de la publication.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la publication de la capsule.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setVideoFile(null)
    setVideoPreview(null)
    setCaption("")
    setUploadProgress(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl p-6 relative border border-[#2e2e2e] shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: "#1c1c1c" }}
      >
        {/* Bouton fermeture */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-[#888888] hover:text-white transition p-1.5 rounded-full hover:bg-white/10"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
          <Clapperboard className="text-[#985810]" size={20} />
          <span>Créer une capsule (Short)</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Zone de sélection vidéo */}
          {!videoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-52 rounded-2xl border-2 border-dashed border-[#383838] hover:border-[#985810] bg-[#141414] hover:bg-[#181818] transition flex flex-col items-center justify-center gap-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-[#242424] group-hover:bg-[#985810]/20 flex items-center justify-center text-[#888888] group-hover:text-[#985810] transition">
                <Upload size={22} />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-semibold text-white">Sélectionner une vidéo verticale</p>
                <p className="text-[11px] text-[#666666] mt-0.5">Format 9:16 recommandé (MP4, MOV)</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-[#333333] bg-black h-56 flex items-center justify-center group">
              <video
                src={videoPreview}
                controls
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium backdrop-blur-sm transition flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Changer</span>
              </button>
            </div>
          )}

          {/* Légende / Titre */}
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
              Légende / Titre de la capsule
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Décrivez votre capsule, ajoutez des #hashtags..."
              disabled={submitting}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white bg-[#141414] border border-[#333333] focus:border-[#985810] outline-none transition placeholder-[#666666] resize-none"
            />
          </div>

          {/* Progression d'upload */}
          {submitting && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-[#9a9a9a]">
                <span>Téléversement de la capsule...</span>
                <span className="font-semibold text-white">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#242424] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#985810] to-[#7d480d] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a2a2a]">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a0a0a0] hover:text-white transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !videoFile}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-40 shadow-md"
              style={{ backgroundColor: "#985810" }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Publication ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Publier la capsule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
