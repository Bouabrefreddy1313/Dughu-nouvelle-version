"use client"

/**
 * Bouton « Fraterniser » — réutilisable dans les 3 onglets Retrouvailles.
 *
 * Envoie une demande de fraternisation via le service existant des relations
 * (contrat Dughu `POST relation/request` avec `auth_user_id` + `user_id` +
 * `type`). Gère : chargement, succès (« Demande envoyée »), déjà envoyé,
 * désactivation pendant la requête et rollback + message en cas d'erreur.
 */

import { useRef, useState } from "react"
import { Check, Loader2, UserRoundPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { sendRelationAction } from "@/services/relations/relations.service"
import { userMessage } from "@/lib/api/api-error"
import { cn } from "@/lib/utils"
import type { RelationResponse } from "@/types/relations/relation.types"

interface FraterniserButtonProps {
  targetUserId: string
  authUserId: string
  /** Ids des personnes pour lesquelles une demande a déjà été envoyée (état global). */
  alreadySent?: boolean
  className?: string
}

/** Ids pour lesquels une demande est en cours (anti double-clic global). */
const pendingRef = new Set<string>()

/** Ids pour lesquels une demande a déjà été envoyée (persistant côté runtime). */
const sentRef = new Set<string>()

export default function FraterniserButton({
  targetUserId,
  authUserId,
  alreadySent = false,
  className,
}: FraterniserButtonProps) {
  const initialSent = alreadySent || sentRef.has(targetUserId)
  const [state, setState] = useState<"idle" | "sending" | "sent">(initialSent ? "sent" : "idle")
  const mountedRef = useRef(true)

  // Synchronisation pendant le rendu : si les demandes sortantes chargées
  // depuis l'API confirment l'envoi, met à jour l'état ET le cache runtime
  // (pattern React « adjust state during render », sans effet).
  if (alreadySent && state === "idle") {
    sentRef.add(targetUserId)
    setState("sent")
  }

  const disabled = !authUserId || state === "sending" || state === "sent" || pendingRef.has(targetUserId)

  if (state === "sent") {
    return (
      <Button
        type="button"
        size="sm"
        disabled
        aria-label="Demande envoyée"
        className={cn(
          "gap-1.5 border border-[#A35A2A]/30 bg-[#F5EFE8] text-[#A35A2A]",
          className
        )}
      >
        <Check size={15} aria-hidden />
        Demande envoyée
      </Button>
    )
  }

  const handleClick = async () => {
    if (!authUserId || state !== "idle" || pendingRef.has(targetUserId)) return
    pendingRef.add(targetUserId)
    setState("sending")
    try {
      const res: RelationResponse = await sendRelationAction({
        targetId: targetUserId,
        type: "friend",
        action: "request",
      })
      if (res?.success === false) {
        if (mountedRef.current) setState("idle")
        toast.error(res.message || "Impossible d'envoyer la demande.")
        return
      }
      sentRef.add(targetUserId)
      if (mountedRef.current) setState("sent")
      toast.success("Demande envoyée.")
    } catch (error) {
      if (mountedRef.current) setState("idle")
      toast.error(userMessage(error, "Impossible d'envoyer la demande."))
    } finally {
      pendingRef.delete(targetUserId)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      onClick={() => void handleClick()}
      aria-label="Fraterniser"
      className={cn(
        "gap-1.5 bg-[#A35A2A] text-white hover:bg-[#8a4d23] disabled:pointer-events-none disabled:opacity-60",
        className
      )}
    >
      {state === "sending" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <UserRoundPlus size={15} aria-hidden />}
      {state === "sending" ? "Envoi…" : "Fraterniser"}
    </Button>
  )
}