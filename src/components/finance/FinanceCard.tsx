"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { MoreVertical, Edit3, Trash2, Loader2, HeartHandshake } from "lucide-react"
import { toast } from "sonner"
import type { FinanceCampaign } from "@/types/finance/finance.types"
import Avatar from "@/components/common/Avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDeleteFinanceMutation } from "@/hooks/queries/use-finance"

interface FinanceCardProps {
  campaign: FinanceCampaign
  currentUserId?: string
}

function formatNumber(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount))
}

export default function FinanceCard({ campaign, currentUserId }: FinanceCardProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteMutation = useDeleteFinanceMutation()

  const isOwner = Boolean(
    currentUserId && campaign.userId && String(campaign.userId) === String(currentUserId)
  )

  const handleCardClick = () => {
    router.push(`/finance/${campaign.id}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/finance/${campaign.id}/edit`)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    try {
      const res = await deleteMutation.mutateAsync(campaign.id)
      if (res.success) {
        toast.success(res.message || "Campagne supprimée.")
        setDeleteDialogOpen(false)
      } else {
        toast.error(res.message || "Impossible de supprimer.")
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression.")
    }
  }

  // Calcul du % pour la barre de progression
  const pct = campaign.progressPercent !== null ? campaign.progressPercent : 0

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
      >
        {/* Image 16:9 avec menu ⋮ flottant */}
        <div className="relative aspect-video w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
          {campaign.image ? (
            <Image
              src={campaign.image}
              alt={campaign.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-102 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900">
              <HeartHandshake className="w-12 h-12 text-[#8B5E34]/40 mb-1" />
              <span className="text-xs font-semibold text-[#8B5E34]/60">Dughu Finances</span>
            </div>
          )}

          {/* Menu ⋮ flottant en haut à droite (uniquement propriétaire) */}
          {isOwner && (
            <div
              className="absolute top-3 right-3 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  title="Options"
                  aria-label="Options"
                  className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center transition shadow-sm cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40 p-1.5 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800"
                >
                  <DropdownMenuItem
                    onClick={handleEdit}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#8B5E34]" />
                    <span>Modifier</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Supprimer</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Corps de la carte */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2">
            {/* Titre en gras */}
            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-[#8B5E34] transition-colors">
              {campaign.title}
            </h3>

            {/* Ligne avatar + nom auteur + date */}
            <div className="flex items-center gap-2.5">
              <Avatar
                src={campaign.author.avatar}
                name={campaign.author.name}
                size="sm"
                className="ring-1 ring-gray-200 dark:ring-zinc-700 shrink-0"
              />
              <div className="min-w-0 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {campaign.author.name}
                </span>
                {campaign.createdAt && (
                  <>
                    <span>•</span>
                    <span className="shrink-0">{campaign.createdAt}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ligne "Élevé de X points" (orange) */}
          <div className="space-y-1.5 pt-1">
            <p className="text-xs sm:text-sm font-bold text-[#E67E22] dark:text-[#F39C12] truncate">
              Élevé de {formatNumber(campaign.collectedPoints || campaign.collectedAmount)} points
            </p>

            {/* Barre de progression grise */}
            <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8B5E34] to-[#E67E22] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-[400px] p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl"
        >
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Supprimer la demande ?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              Êtes-vous certain de vouloir supprimer définitivement votre demande &laquo;{" "}
              <strong>{campaign.title}</strong> &raquo; ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
              className="rounded-xl font-semibold px-4 cursor-pointer"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Confirmer la suppression"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
