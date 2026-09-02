"use client"

/**
 * Modale de SUPPRESSION d'un espace — le MOT DE PASSE est obligatoire
 * (règle métier Dughu, POST /destroyPage/{id} avec body { password }).
 */

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Lock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDestroyPage } from "@/hooks/pages/use-pages"

interface DeleteSpaceModalProps {
  open: boolean
  pageId: string
  pageName: string
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteSpaceModal({ open, pageId, pageName, onClose, onDeleted }: DeleteSpaceModalProps) {
  const destroyMutation = useDestroyPage(pageId)
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (open) setPassword("")
  }, [open])

  if (!open) return null

  const handleDelete = async () => {
    if (!password) {
      toast.error("Veuillez saisir votre mot de passe.")
      return
    }
    try {
      const result = await destroyMutation.mutateAsync(password)
      if (result.success === false) {
        toast.error(result.message || "Impossible de supprimer l'espace.")
        return
      }
      toast.success("Espace supprimé.")
      onDeleted()
    } catch {
      toast.error("Impossible de supprimer l'espace. Vérifiez votre mot de passe.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Supprimer l'espace">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-[#2D2D2D]">Supprimer « {pageName} »</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#65676B] hover:bg-[#F0F2F5]" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-[#65676B]">
          Cette action est irréversible. Saisissez votre <strong>mot de passe</strong> pour confirmer la suppression.
        </p>
        <label htmlFor="delete-password" className="mt-4 block text-sm font-semibold text-[#2D2D2D]">Mot de passe</label>
        <div className="relative mt-1">
          <Lock size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8D91]" />
          <input
            id="delete-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleDelete()
            }}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">Annuler</Button>
          <Button onClick={handleDelete} disabled={destroyMutation.isPending} className="rounded-full bg-red-600 text-white hover:bg-red-700">
            {destroyMutation.isPending ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </div>
      </div>
    </div>
  )
}