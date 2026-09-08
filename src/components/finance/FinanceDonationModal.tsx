"use client"

import { useState } from "react"
import { Coins, Heart, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDonateFinanceMutation } from "@/hooks/queries/use-finance"
import { useAuth } from "@/hooks/queries/use-auth"

interface FinanceDonationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundingId: string
  recipientId: string
  campaignTitle: string
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000]

export default function FinanceDonationModal({
  open,
  onOpenChange,
  fundingId,
  recipientId,
  campaignTitle,
}: FinanceDonationModalProps) {
  const { data: rawUser } = useAuth()
  const currentUserId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const [points, setPoints] = useState<string>("100")
  const donateMutation = useDonateFinanceMutation()

  const handleDonate = async () => {
    const numPoints = Number(points)
    if (isNaN(numPoints) || numPoints <= 0) {
      toast.error("Veuillez entrer un nombre de points valide.")
      return
    }

    if (currentUserId && recipientId === currentUserId) {
      toast.error("Vous ne pouvez pas faire un don à votre propre demande.")
      return
    }

    try {
      const res = await donateMutation.mutateAsync({
        fundingId,
        recipientId,
        points: numPoints,
        userId: currentUserId,
      })

      if (res.success) {
        toast.success(res.message || "Votre don a été transmis avec succès !")
        onOpenChange(false)
      } else {
        toast.error(res.message || "Impossible d'effectuer le don.")
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi du don.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#8B5E34]/10 text-[#8B5E34] flex items-center justify-center">
            <Heart className="w-6 h-6 fill-[#8B5E34]/20" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Faire un don
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Soutenez la demande &laquo; <strong className="text-gray-700 dark:text-gray-300">{campaignTitle}</strong> &raquo; en contribuant avec vos points Dughu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Montant en points
            </label>
            <div className="relative">
              <Input
                type="number"
                min="1"
                step="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="Ex : 100"
                className="pr-12 text-lg font-bold rounded-2xl border-gray-200 dark:border-zinc-700 h-12 focus-visible:ring-[#8B5E34]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm font-bold text-[#8B5E34]">
                <Coins className="w-4 h-4" />
                <span>pts</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setPoints(String(amt))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  points === String(amt)
                    ? "bg-[#8B5E34] text-white border-[#8B5E34]"
                    : "bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-100"
                }`}
              >
                +{amt} pts
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={donateMutation.isPending}
            onClick={handleDonate}
            className="rounded-xl bg-[#8B5E34] hover:bg-[#734c28] text-white font-semibold px-5 cursor-pointer shadow-md hover:shadow-lg transition"
          >
            {donateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              "Confirmer le don"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
