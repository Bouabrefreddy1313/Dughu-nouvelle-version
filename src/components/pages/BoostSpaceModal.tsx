"use client"

/**
 * Modale de BOOST d'un espace — demande le prix via /boostPrice (POST) avant
 * d'appeler /boostPage { days, page_id, user_id }. Règle métier : toujours
 * afficher le coût avant validation.
 */

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Rocket, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBoostPage } from "@/hooks/pages/use-pages"
import { fetchBoostPrice } from "@/services/pages/page-offer.service"
import type { BoostPrice } from "@/types/pages/pages.types"
import { cn } from "@/lib/utils"

interface BoostSpaceModalProps {
  open: boolean
  pageId: string
  onClose: () => void
}

const BOOST_OPTIONS = [3, 7, 15, 30]

export default function BoostSpaceModal({ open, pageId, onClose }: BoostSpaceModalProps) {
  const boostMutation = useBoostPage(pageId)
  const [days, setDays] = useState(7)
  const [price, setPrice] = useState<BoostPrice | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  // Prix via /boostPrice à l'ouverture et à chaque changement de durée.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingPrice(true)
    fetchBoostPrice(days)
      .then((result) => {
        if (!cancelled) setPrice(result)
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de calculer le prix du boost.")
      })
      .finally(() => {
        if (!cancelled) setLoadingPrice(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, days])

  if (!open) return null

  const handleBoost = async () => {
    try {
      const result = await boostMutation.mutateAsync(days)
      if (result.success === false) {
        toast.error(result.message || "Impossible de booster l'espace.")
        return
      }
      toast.success(`Espace boosté pour ${days} jour${days > 1 ? "s" : ""} ! 🚀`)
      onClose()
    } catch {
      toast.error("Impossible de booster l'espace. Veuillez réessayer.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Booster l'espace">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#2D2D2D]">
            <Rocket size={20} className="text-[#A35A2A]" /> Booster cet espace
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#65676B] hover:bg-[#F0F2F5]" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-[#65676B]">Choisissez la durée de mise en avant de votre espace.</p>

        <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Durée du boost">
          {BOOST_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-sm font-semibold transition",
                days === option ? "border-[#A35A2A] bg-[#F5EFE8] text-[#A35A2A]" : "border-gray-200 text-[#65676B] hover:bg-gray-50"
              )}
            >
              {option} j
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-[#F7F8FA] p-4 text-center">
          {loadingPrice ? (
            <Loader2 size={20} className="mx-auto animate-spin text-[#A35A2A]" aria-label="Calcul du prix" />
          ) : price ? (
            <>
              <p className="text-2xl font-extrabold text-[#2D2D2D]">{price.points.toLocaleString("fr-FR")} pts</p>
              <p className="text-sm text-[#65676B]">≈ {price.fcfa.toLocaleString("fr-FR")} FCFA</p>
            </>
          ) : (
            <p className="text-sm text-[#65676B]">Prix indisponible</p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">Annuler</Button>
          <Button onClick={handleBoost} disabled={boostMutation.isPending || loadingPrice} className="rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F]">
            {boostMutation.isPending ? "…" : `Booster ${days} j`}
          </Button>
        </div>
      </div>
    </div>
  )
}