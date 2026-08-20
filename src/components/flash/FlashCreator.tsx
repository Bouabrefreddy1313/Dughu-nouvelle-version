"use client"

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH CREATOR — Modale de création d'un Flash (texte + image/video + fond).
// POSTe vers /api/stories (route existante, contrat POST /postStory Dughu).
//
// Flux :
//   1) "select"  — écran de choix (photo/vidéo vs texte), fidèle à la maquette.
//   2) "media"   — aperçu + légende pour une story photo/vidéo.
//   3) "text"    — éditeur plein cadre avec fond coloré pour une story texte.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Send, Loader2, ImageIcon, ArrowLeft, Palette, Type } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { BackgroundPicker, type BackgroundColor } from "@/components/composer/BackgroundPicker"
import { resolveMediaUrl } from "@/lib/dughu"

export interface FlashCreatorUser {
  id?: string
  name?: string | null
  avatar?: string | null
  dughu?: { userId?: string }
}

interface FlashCreatorProps {
  user?: FlashCreatorUser
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

type Step = "select" | "media" | "text"

const DEFAULT_TEXT_BG: BackgroundColor = {
  bg: "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
} as BackgroundColor

export default function FlashCreator({ user, open, onClose, onCreated }: FlashCreatorProps) {
  const [step, setStep] = useState<Step>("select")
  const [text, setText] = useState("")
  const [selectedColor, setSelectedColor] = useState<BackgroundColor | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string>("")
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])

  // Libère l'URL de prévisualisation au démontage / changement de fichier
  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasContent = step === "text" ? text.trim().length > 0 : !!mediaFile

  const resetAll = () => {
    setStep("select")
    setText("")
    setMediaFile(null)
    setMediaPreview("")
    setSelectedColor(null)
    setShowBgPicker(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/")
    if (!isMedia) return
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setStep("media")
  }

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview("")
  }

  const handleBgSelect = (color: BackgroundColor) => {
    setSelectedColor(color)
    setShowBgPicker(false)
  }

  const goToTextStep = () => {
    setSelectedColor(DEFAULT_TEXT_BG)
    setStep("text")
  }

  const goToMediaStep = () => {
    fileInputRef.current?.click()
  }

  const goBackToSelect = () => {
    clearMedia()
    setText("")
    setSelectedColor(null)
    setStep("select")
  }

  const handleSubmit = async () => {
    if (!hasContent || isSubmitting) return
    if (!user?.id) return
    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append("userId", user.id)
      if (user.dughu?.userId) payload.append("dughuUserId", user.dughu.userId)
      if (text.trim()) payload.append("text", text.trim())
      if (selectedColor?.bg) payload.append("bgColor", selectedColor.bg)
      if (mediaFile) {
        // Le backend /api/stories attend `image` ou `video`
        if (mediaFile.type.startsWith("video/")) payload.append("video", mediaFile)
        else payload.append("image", mediaFile)
      }
      const res = await fetch("/api/stories", { method: "POST", body: payload })
      const data = await res.json()
      if (data.success) {
        resetAll()
        onCreated?.()
        onClose()
      } else {
        throw new Error(data.message || "Erreur création du Flash")
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showBgPicker) setShowBgPicker(false)
        else if (step !== "select") goBackToSelect()
        else onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showBgPicker, step, onClose])

  if (!mounted || !open) return null

  const avatarSrc = user?.avatar ? resolveMediaUrl(user.avatar) : "/images/avatar.png"

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Input fichier caché, partagé par la carte "photo/vidéo" */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          handleFileChange(e)
          e.target.value = ""
        }}
      />

      <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-xl mx-auto mb-20 overflow-hidden">
        {/* En-tête, commun à toutes les étapes */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step !== "select" && (
              <button
                type="button"
                onClick={goBackToSelect}
                className="p-1.5 rounded-full hover:bg-gray-100 transition"
                aria-label="Retour"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <p className="font-semibold text-[#2D2D2D]">
                {step === "select" ? "Créer un Flash" : user?.name}
              </p>
              {step !== "select" && <p className="text-xs text-gray-500">Nouveau Flash</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { resetAll(); onClose() }}
            className="p-1.5 rounded-full hover:bg-gray-100 transition"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Étape 1 : sélection du type de Flash ────────────────────────── */}
        {step === "select" && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={goToMediaStep}
                className="group relative h-64 rounded-2xl overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4C6EF5]"
                style={{ background: "linear-gradient(160deg, #4338CA 0%, #60A5FA 55%, #93C5FD 100%)" }}
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 transition-transform group-hover:scale-[1.03]">
                  <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <ImageIcon size={22} className="text-[#2D2D2D]" />
                  </span>
                  <span className="text-white font-semibold text-sm text-center leading-snug">
                    Créer un flash avec une photo ou une vidéo
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={goToTextStep}
                className="group relative h-64 rounded-2xl overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C026D3]"
                style={{ background: "linear-gradient(160deg, #A21CAF 0%, #C026D3 45%, #EC4899 100%)" }}
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 transition-transform group-hover:scale-[1.03]">
                  <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Type size={20} className="text-[#2D2D2D]" strokeWidth={2.5} />
                  </span>
                  <span className="text-white font-semibold text-sm text-center leading-snug">
                    Créer un flash avec du texte
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : story photo/vidéo ──────────────────────────────────── */}
        {step === "media" && (
          <>
            <div className="p-4 space-y-3">
              {mediaFile && (
                <div className="relative">
                  {mediaFile.type.startsWith("video/") ? (
                    <video src={mediaPreview} controls className="w-full h-64 object-cover rounded-xl bg-black" />
                  ) : (
                    <Image
                      src={mediaPreview}
                      alt="Aperçu"
                      width={400}
                      height={256}
                      unoptimized
                      className="w-full h-64 object-cover rounded-xl"
                    />
                  )}
                  <button
                    type="button"
                    onClick={goToMediaStep}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
                    aria-label="Changer le média"
                  >
                    <ImageIcon size={14} />
                  </button>
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                placeholder="Ajouter une légende…"
                rows={2}
                maxLength={2000}
                className="w-full resize-none text-sm outline-none bg-transparent placeholder-gray-400"
              />
            </div>

            <div className="flex items-center justify-end p-3 border-t border-gray-100">
              <Button
                onClick={handleSubmit}
                disabled={!hasContent || isSubmitting}
                className="rounded-full bg-[#A35A2A] hover:bg-[#8a4d23] text-white"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span className="ml-1 text-sm">Partager</span>
              </Button>
            </div>
          </>
        )}

        {/* ── Étape 3 : story texte plein cadre ────────────────────────────── */}
        {step === "text" && (
          <>
            <div
              className="relative h-72 flex items-center justify-center p-6"
              style={{ background: selectedColor?.bg || DEFAULT_TEXT_BG.bg }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                placeholder="Tapez votre texte…"
                rows={4}
                maxLength={500}
                autoFocus
                className="w-full resize-none text-center text-xl font-semibold text-white placeholder-white/70 outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowBgPicker(true)}
                className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 transition flex items-center justify-center"
                aria-label="Changer le fond"
              >
                <Palette size={16} className="text-white" />
              </button>
            </div>

            <div className="flex items-center justify-end p-3 border-t border-gray-100">
              <Button
                onClick={handleSubmit}
                disabled={!hasContent || isSubmitting}
                className="rounded-full bg-[#A35A2A] hover:bg-[#8a4d23] text-white"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span className="ml-1 text-sm">Partager</span>
              </Button>
            </div>

            {showBgPicker && (
              <BackgroundPicker
                currentColor={selectedColor}
                onSelect={handleBgSelect}
                onClose={() => setShowBgPicker(false)}
              />
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}