"use client"

/**
 * Modale "Rejoindre le canal" (JoinCanalModal).
 *
 * Affichée lorsqu'un utilisateur clique sur un lien d'invitation ou de partage
 * (ex: /canal?id=24 ou /canal?code=...).
 *
 * Spécifications :
 *  - Affiche les informations du canal (nom, photo, couverture, catégorie, membres, type privé/public)
 *  - Propose deux options claires : refuser/annuler ou envoyer la demande
 *  - Envoie la demande via POST /requestJoinCanal ({{local_dughu}}/requestJoinCanal)
 *  - Affiche un retour visuel clair (chargement, succès, avertissement)
 *  - Gère les cas où l'utilisateur est déjà membre ou propriétaire du canal
 */

import { useState } from "react"
import Image from "next/image"
import {
  Lock,
  Globe,
  Users,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Send,
} from "lucide-react"
import { useCanalDetail, useRequestJoinCanal, useJoinOrRequestCanal } from "@/hooks/canal/use-canals"
import type { Canal } from "@/types/canal/canal.types"

interface JoinCanalModalProps {
  canalId?: string
  initialCanal?: Canal | null
  currentUserId: string
  isOpen: boolean
  onClose: () => void
  onOpenChat?: (canal: Canal) => void
}

export default function JoinCanalModal({
  canalId,
  initialCanal,
  currentUserId,
  isOpen,
  onClose,
  onOpenChat,
}: JoinCanalModalProps) {
  const [requestSent, setRequestSent] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Récupérer les détails si seul canalId est fourni
  const resolvedCanalId = initialCanal?.id || canalId
  const { data: detailData, isLoading: detailLoading, isError: detailError } = useCanalDetail(
    !initialCanal && resolvedCanalId ? resolvedCanalId : undefined
  )

  const canal: Canal | undefined = initialCanal || detailData?.canal

  const requestJoinMutation = useRequestJoinCanal()
  const directJoinMutation = useJoinOrRequestCanal()

  if (!isOpen) return null

  const isOwner = !!(canal?.userId && currentUserId && String(canal.userId) === String(currentUserId))
  const isAlreadyJoined = !!canal?.isJoined

  const handleSendRequest = async () => {
    if (!canal || !currentUserId) return
    setErrorMessage(null)

    if (canal.type === "public") {
      directJoinMutation.mutate(
        { userId: currentUserId, canalId: canal.id, type: "direct" },
        {
          onSuccess: (res) => {
            if (res.success) {
              if (onOpenChat) onOpenChat(canal)
              onClose()
            } else {
              setErrorMessage(res.message || "Impossible de rejoindre ce canal.")
            }
          },
          onError: (err: any) => {
            setErrorMessage(err?.message || "Impossible de rejoindre ce canal public.")
          },
        }
      )
      return
    }

    // Canal privé : appel explicite à POST /requestJoinCanal
    requestJoinMutation.mutate(
      { userId: currentUserId, canalId: canal.id },
      {
        onSuccess: (res) => {
          if (res.success) {
            setRequestSent(true)
            setSuccessMessage(
              res.message ||
                "Votre demande d'adhésion a été envoyée avec succès au créateur du canal."
            )
          } else {
            setErrorMessage(res.message || "Impossible d'envoyer la demande d'adhésion.")
          }
        },
        onError: (err: any) => {
          setErrorMessage(err?.message || "Erreur lors de l'envoi de la demande d'adhésion.")
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-800 bg-[#0F172A] shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-modal-title"
      >
        {/* Bouton fermeture */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-black/60 text-gray-400 hover:bg-black/90 hover:text-white transition backdrop-blur-sm cursor-pointer"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        {/* État de chargement initial */}
        {detailLoading && !canal ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 size={36} className="animate-spin text-[#985810] mb-4" />
            <p className="text-sm font-semibold text-gray-300">Chargement des informations du canal...</p>
          </div>
        ) : detailError || !canal ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-red-950/40 border border-red-800/40 text-red-400 mb-4">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Canal introuvable</h3>
            <p className="text-xs text-gray-400 mb-6 max-w-xs">
              Ce canal n&apos;existe pas ou le lien d&apos;invitation a expiré.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-gray-800 px-6 py-2.5 text-xs font-bold text-gray-200 hover:bg-gray-700 transition"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div>
            {/* Bannière de couverture */}
            <div className="relative h-32 w-full bg-gradient-to-r from-gray-900 to-gray-800">
              <Image
                src={canal.cover || "/images/cover.jpg"}
                alt=""
                fill
                sizes="400px"
                className="object-cover opacity-80"
                unoptimized={canal.cover?.startsWith("http")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />
            </div>

            {/* Contenu principal */}
            <div className="relative px-6 pb-6 pt-0">
              {/* Logo / Avatar canal superposé */}
              <div className="-mt-12 mb-3 flex items-end justify-between">
                <div className="relative size-20 overflow-hidden rounded-2xl border-4 border-[#0F172A] bg-gray-800 shadow-xl">
                  <Image
                    src={canal.logo || "/images/avatar.png"}
                    alt={canal.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={canal.logo?.startsWith("http")}
                  />
                </div>

                {/* Badge Type (Public / Privé) */}
                <div className="mb-2">
                  {canal.type === "private" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-300">
                      <Lock size={12} />
                      Canal privé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-300">
                      <Globe size={12} />
                      Canal public
                    </span>
                  )}
                </div>
              </div>

              {/* Titre & Catégorie */}
              <h2 id="join-modal-title" className="text-xl font-black text-white leading-tight">
                {canal.name}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-400">
                {canal.categoryName && (
                  <span className="rounded-full bg-[#985810]/20 border border-[#985810]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#d48937]">
                    {canal.categoryName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={12} className="text-gray-400" />
                  {canal.memberCount || 0} membre{(canal.memberCount || 0) > 1 ? "s" : ""}
                </span>
              </div>

              {/* Description */}
              {canal.description && (
                <p className="mt-3 text-xs text-gray-300 line-clamp-3 leading-relaxed bg-gray-900/60 p-3 rounded-2xl border border-gray-800/80">
                  {canal.description}
                </p>
              )}

              {/* Messages d'alerte / feedback */}
              {errorMessage && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* ÉTAT 1 : Demande déjà envoyée avec succès */}
              {requestSent ? (
                <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-900/50 text-emerald-400 mb-2 border border-emerald-700/50">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-300 mb-1">Demande envoyée !</h4>
                  <p className="text-xs text-gray-300 mb-4">
                    {successMessage || "Votre demande a été transmise à l'administrateur du canal."}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-2xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition shadow-md"
                  >
                    Fermer
                  </button>
                </div>
              ) : isOwner ? (
                /* ÉTAT 2 : Utilisateur est propriétaire */
                <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-amber-900/40 text-amber-300 mb-2">
                    <ShieldCheck size={20} />
                  </div>
                  <p className="text-xs font-semibold text-amber-200 mb-3">
                    Vous êtes le créateur et administrateur de ce canal.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenChat) onOpenChat(canal)
                      onClose()
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#985810] hover:bg-[#7d480d] px-4 py-2.5 text-xs font-bold text-white transition shadow-md"
                  >
                    <MessageSquare size={14} />
                    Ouvrir mon canal
                  </button>
                </div>
              ) : isAlreadyJoined ? (
                /* ÉTAT 3 : Déjà membre */
                <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-300 mb-2">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-xs font-semibold text-emerald-200 mb-3">
                    Vous êtes déjà membre de ce canal.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenChat) onOpenChat(canal)
                      onClose()
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#985810] hover:bg-[#7d480d] px-4 py-2.5 text-xs font-bold text-white transition shadow-md"
                  >
                    <MessageSquare size={14} />
                    Accéder à la discussion
                  </button>
                </div>
              ) : (
                /* ÉTAT 4 : Invitation à rejoindre (Action requise) */
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-3.5 text-center">
                    <p className="text-xs text-gray-300">
                      {canal.type === "private"
                        ? "Ce canal est privé. Souhaitez-vous envoyer une demande d'adhésion à l'administrateur ?"
                        : "Souhaitez-vous rejoindre ce canal pour participer aux échanges ?"}
                    </p>
                  </div>

                  {/* Boutons d'action Refuser / Rejoindre */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={requestJoinMutation.isPending || directJoinMutation.isPending}
                      className="flex-1 rounded-2xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition cursor-pointer disabled:opacity-50"
                    >
                      Refuser
                    </button>

                    <button
                      type="button"
                      onClick={handleSendRequest}
                      disabled={requestJoinMutation.isPending || directJoinMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#985810] hover:bg-[#7d480d] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {requestJoinMutation.isPending || directJoinMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>{canal.type === "private" ? "Rejoindre le canal" : "Rejoindre"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
