"use client"

/**
 * Modale de confirmation réutilisable avant une action irréversible
 * (suppression d'album, suppression d'image…). Basée sur le Dialog shadcn.
 */

import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDeleteModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  pending = false,
  onConfirm,
  onOpenChange,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#2D2D2D]">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[#65676B]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-gray-200 text-[#65676B]"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
