"use client"

import { useEffect, useRef, useState } from "react"
import { Gift, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import Avatar from "@/components/common/Avatar"

interface GivePointsModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onClose: () => void
  /** Post cible de la récompense. */
  postId?: string
  /** Auteur du post — c'est lui qui reçoit les points. */
  author?: {
    id: string
    name: string | null
    avatar: string | null
  } | null
  /** Utilisateur connecté — c'est lui qui offre les points (user_offer_id). */
  currentUser?: {
    id: string
    dughu?: { userId?: string | number }
  } | null
}

/**
 * Modale « Donner des points » du menu « 3 points » d'un post.
 * Demande à l'utilisateur le nombre de points à offrir puis appelle
 * POST /api/points/give (qui encapsule POST /points/give de l'API Dughu).
 */
export function GivePointsModal({
  isOpen,
  setIsOpen,
  onClose,
  postId,
  author,
  currentUser,
}: GivePointsModalProps) {
  const [points, setPoints] = useState("1")
  const [sending, setSending] = useState(false)
  const pointsInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    const focusTimer = setTimeout(() => pointsInputRef.current?.focus(), 60)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      clearTimeout(focusTimer)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const parsedPoints = Math.max(1, Math.trunc(Number(points) || 1))

  const handleSubmit = async () => {
    if (!postId || !author?.id) {
      toast.error("Publication introuvable.")
      return
    }
    if (!currentUser?.id) {
      toast.error("Connectez-vous pour offrir des points.")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/points/give", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          authorId: author.id,
          points: parsedPoints,
          userId: currentUser.id,
          dughuUserId: currentUser.dughu?.userId || "",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          `${parsedPoints} point${parsedPoints > 1 ? "s" : ""} offert${parsedPoints > 1 ? "s" : ""} à ${author?.name || "l'auteur"}.`
        )
        setIsOpen(false)
      } else {
        toast.error(data.message || "Impossible d'offrir des points.")
      }
    } catch {
      toast.error("Impossible d'offrir des points.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={() => {
        if (!sending) setIsOpen(false)
      }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-[scaleIn_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Donner des points"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A35A2B]/10">
              <Gift size={18} className="text-[#A35A2B]" />
            </span>
            <div>
              <h3 className="text-[16px] font-semibold leading-tight text-[#050505]">
                Donner des points
              </h3>
              <p className="text-[12px] text-[#65676B]">
                Récompenser une bonne publication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-full p-2 text-[#65676B] transition-colors hover:bg-gray-100 hover:text-[#050505]"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {author && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-gray-100 bg-[#F7F8FA] p-3">
              <Avatar src={author.avatar} name={author.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#050505]">
                  {author.name || "Utilisateur"}
                </p>
                <p className="text-[12px] text-[#65676B]">
                  Points offerts pour cette publication
                </p>
              </div>
            </div>
          )}

          <label
            htmlFor="give-points-amount"
            className="mb-1.5 block text-[13px] font-medium text-[#050505]"
          >
            Nombre de points
          </label>
          <input
            id="give-points-amount"
            ref={pointsInputRef}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit()
            }}
            disabled={sending}
            placeholder="1"
            className="w-full rounded-xl border border-gray-200 bg-[#F7F8FA] px-4 py-3 text-[15px] font-semibold text-[#050505] outline-none transition focus:border-[#A35A2A]/40 focus:bg-white"
          />
          <p className="mt-1.5 text-[12px] text-[#65676B]">
            Le montant doit être un entier positif.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-full px-4 py-2 text-[13px] font-medium text-[#050505] transition hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={sending}
            className="flex items-center gap-2 rounded-full bg-[#A35A2A] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#8B4A1F] disabled:opacity-60"
          >
            {sending && <Loader2 size={14} className="animate-spin" />}
            {sending
              ? "Envoi..."
              : `Offrir ${parsedPoints} point${parsedPoints > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  )
}