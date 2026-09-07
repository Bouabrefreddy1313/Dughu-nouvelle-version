"use client"

// ── CapsuleCreator — modale de création d'une Capsule (vidéo + légende) ─────
// POSTe vers /api/capsules (route interne, contrat POST /store/capsule Dughu).
// Pattern identique à FlashCreator : portail, aperçu local, bouton loading,
// toasts sonner pour les retours utilisateur.

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Send, Loader2, Video, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createCapsuleClient } from "@/hooks/queries/use-capsules"
import type { Capsule } from "@/lib/capsule-service"

/** Taille maximale acceptée pour une vidéo (100 Mo). */
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
/** Longueur maximale de la légende. */
const MAX_CAPTION_LENGTH = 500

export interface CapsuleCreatorUser {
  id?: string
  name?: string | null
  avatar?: string | null
  dughu?: { userId?: string }
}

interface CapsuleCreatorProps {
  user?: CapsuleCreatorUser
  open: boolean
  onClose: () => void
  onCreated?: (capsule: Capsule | null) => void
}

type Step = "select" | "edit"

export default function CapsuleCreator({ user, open, onClose, onCreated }: CapsuleCreatorProps) {
  const [step, setStep] = useState<Step>("select")
  const [caption, setCaption] = useState("")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])

  // Libère l'URL de prévisualisation au démontage / changement de fichier
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!open || !mounted) return null

  const resetAll = () => {
    setStep("select")
    setCaption("")
    setVideoFile(null)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoPreview("")
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("video/")) {
      toast.error("Veuillez choisir un fichier vidéo.")
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("Votre vidéo est trop lourde (100 Mo maximum).")
      return
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setStep("edit")
    // Permet de resélectionner le même fichier plus tard
    e.target.value = ""
  }

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview("")
    setStep("select")
  }

  const handleSubmit = async () => {
    if (!videoFile || isSubmitting) return
    const userId = user?.dughu?.userId || user?.id
    if (!userId) {
      toast.error("Connectez-vous pour publier")
      return
    }
    setIsSubmitting(true)
    try {
      const capsule = await createCapsuleClient({
        video: videoFile,
        caption: caption.trim(),
        userId: String(userId),
      })
      toast.success("Capsule publiée.")
      resetAll()
      onCreated?.(capsule ?? null)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de publier votre capsule. Veuillez réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Créer une capsule"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          {step === "edit" ? (
            <button
              type="button"
              onClick={clearVideo}
              className="rounded-full p-1.5 text-[#65676B] transition hover:bg-[#F0F2F5]"
              aria-label="Retour"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span className="w-[26px]" aria-hidden />
          )}
          <h2 className="text-[15px] font-semibold text-[#2D2D2D]">Nouvelle capsule</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-[#65676B] transition hover:bg-[#F0F2F5]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Étape 1 : sélection de la vidéo */}
        {step === "select" && (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#985810]/10">
              <Video size={28} className="text-[#985810]" aria-hidden />
            </div>
            <p className="text-center text-sm text-[#65676B]">
              Choisissez une vidéo verticale pour votre capsule.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-[#985810] hover:bg-[#7d480d] text-white"
            >
              <Video size={16} />
              <span className="ml-1 text-sm">Choisir une vidéo</span>
            </Button>
            <p className="text-center text-[11px] text-[#8A8A8A]">MP4 ou WebM · 100 Mo maximum</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden
            />
          </div>
        )}

        {/* Étape 2 : aperçu + légende */}
        {step === "edit" && videoPreview && (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-xl bg-black">
                <video
                  src={videoPreview}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="aspect-[9/16] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearVideo}
                  className="absolute top-2 right-2 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60"
                  aria-label="Changer la vidéo"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
                placeholder="Ajouter une légende…"
                rows={3}
                maxLength={MAX_CAPTION_LENGTH}
                className="mt-4 w-full resize-none rounded-xl bg-[#F0F2F5] p-3 text-sm outline-none placeholder-[#8A8A8A] focus-visible:ring-1 focus-visible:ring-[#985810]"
              />
              <p className="mt-1 text-right text-[11px] text-[#8A8A8A]">
                {caption.length}/{MAX_CAPTION_LENGTH}
              </p>
            </div>

            <div className="flex items-center justify-end border-t border-gray-100 p-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-full bg-[#985810] hover:bg-[#7d480d] text-white"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span className="ml-1 text-sm">{isSubmitting ? "Publication…" : "Publier"}</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}