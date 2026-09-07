"use client"

import { useState, useRef } from "react"
import { X, Upload, Music2, RefreshCw, Check, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import type { AkwaMusique } from "@/services/akwaplay/akwaplayMusique.service"
import { storeMusique } from "@/services/akwaplay/akwaplayMusique.service"

interface AkwaMusiqueCreateModalProps {
  open: boolean
  onClose: () => void
  userId: string | number
  onSuccess: (musique?: AkwaMusique) => void
}

export default function AkwaMusiqueCreateModal({
  open,
  onClose,
  userId,
  onSuccess,
}: AkwaMusiqueCreateModalProps) {
  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3") && !file.name.endsWith(".wav")) {
      toast.error("Veuillez sélectionner un fichier audio valide (.mp3, .wav).")
      return
    }

    setAudioFile(file)
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Veuillez renseigner le titre du morceau.")
      return
    }
    if (!artist.trim()) {
      toast.error("Veuillez renseigner le nom de l'artiste.")
      return
    }
    if (!audioFile) {
      toast.error("Veuillez sélectionner un fichier audio.")
      return
    }

    setSubmitting(true)
    setUploadProgress(0)

    try {
      const res = await storeMusique(
        {
          title: title.trim(),
          artist: artist.trim(),
          genreId: 2,
          audioFile,
          coverFile,
          userId,
        },
        (percent) => setUploadProgress(percent)
      )

      if (res.success) {
        toast.success("Musique ajoutée avec succès !")
        onSuccess(res.musique)
        handleClose()
      } else {
        toast.error(res.message || "Erreur lors de l'ajout de la musique.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'ajout de la musique.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setTitle("")
    setArtist("")
    setAudioFile(null)
    setCoverFile(null)
    setCoverPreview(null)
    setUploadProgress(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl p-6 relative border border-[#2e2e2e] shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: "#1c1c1c" }}
      >
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-[#888888] hover:text-white transition p-1.5 rounded-full hover:bg-white/10"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
          <Music2 className="text-[#985810]" size={20} />
          <span>Ajouter une musique libre</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioSelect}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverSelect}
          />

          {/* Fichier Audio */}
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
              Fichier audio (MP3, WAV) *
            </label>
            <div
              onClick={() => audioInputRef.current?.click()}
              className="p-3.5 rounded-xl border border-dashed border-[#383838] hover:border-[#985810] bg-[#141414] hover:bg-[#181818] transition flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#242424] flex items-center justify-center text-[#985810] shrink-0">
                <Music2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {audioFile ? audioFile.name : "Sélectionner un fichier audio..."}
                </p>
                <p className="text-[10px] text-[#666666]">
                  {audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} Mo` : "Formats acceptés : .mp3, .wav"}
                </p>
              </div>
            </div>
          </div>

          {/* Titre & Artiste */}
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Titre du morceau *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Chill Summer Vibes"
              disabled={submitting}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white bg-[#141414] border border-[#333333] focus:border-[#985810] outline-none transition placeholder-[#666666]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Artiste / Compositeur *</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Ex: Dughu Studio"
              disabled={submitting}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white bg-[#141414] border border-[#333333] focus:border-[#985810] outline-none transition placeholder-[#666666]"
            />
          </div>

          {/* Pochette optionnelle */}
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Pochette (optionnel)</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="p-2.5 rounded-xl border border-dashed border-[#383838] hover:border-[#985810] bg-[#141414] flex items-center gap-3 cursor-pointer"
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt="Pochette"
                  className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/20 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#242424] flex items-center justify-center text-[#777777] shrink-0">
                  <ImageIcon size={18} />
                </div>
              )}
              <span className="text-xs text-[#999999] truncate">
                {coverFile ? coverFile.name : "Choisir une image de couverture..."}
              </span>
            </div>
          </div>

          {/* Progression d'upload */}
          {submitting && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-[#9a9a9a]">
                <span>Téléversement du fichier...</span>
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
              disabled={submitting || !title.trim() || !artist.trim() || !audioFile}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-40 shadow-md"
              style={{ backgroundColor: "#985810" }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Envoi ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Ajouter le morceau</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
