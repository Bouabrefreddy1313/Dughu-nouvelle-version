"use client"

import { Check, CheckCheck } from "lucide-react"
import type { MessageReceipt } from "@/lib/messages"

/**
 * Accusé de lecture visuel d'un message envoyé, à la WhatsApp / Signal :
 *   - `"sent"`      → 1 coche gris clair (en cours d'envoi / pas encore délivré)
 *   - `"delivered"` → 2 coches grises (le message a atteint le destinataire, pas encore lu)
 *   - `"read"`      → 2 coches bleues (le destinataire a ouvert le message)
 *
 * Le composant est volontairement minimal & sans dépendance : il est utilisé dans
 * la fenêtre de conversation (popup), la page `/messages`, et la sidebar.
 */
export default function ReceiptTicks({
  receipt,
  className,
}: {
  receipt: MessageReceipt | null | undefined
  className?: string
}) {
  if (!receipt) return null

  const base = "shrink-0"
  if (receipt === "sent") {
    return (
      <span className={`flex items-center ${className || ""}`} aria-label="Envoyé" title="Envoyé">
        <Check size={13} className={`${base} text-[#65676B]/60`} />
      </span>
    )
  }

  if (receipt === "delivered") {
    return (
      <span className={`flex items-center ${className || ""}`} aria-label="Message reçu" title="Message reçu">
        <Check size={12} className={`${base} text-[#65676B]`} />
        <Check size={12} className={`${base} -mx-1 text-[#65676B]`} />
      </span>
    )
  }

  // "read" — deux coches bleues
  return (
    <span className={`flex items-center ${className || ""}`} aria-label="Lu" title="Lu">
      <CheckCheck size={13} className={`${base} text-[#2196F3]`} />
      <CheckCheck size={13} className={`${base} -mx-1 text-[#2196F3]`} />
    </span>
  )
}
