"use client"

/**
 * Panneau « Admins » d'un espace — ajout, retrait et PRIVILÈGES détaillés
 * via /updatePageAdminPrivileges/{id} (checkboxes general, info, social,
 * avatar, design, admins, analytics, delete_page).
 */

import { useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Trash2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAddAdmin, useRemoveAdmin, useUpdateAdminPrivileges } from "@/hooks/pages/use-pages"
import type { PageAdmin, PageAdminPrivileges } from "@/types/pages/pages.types"
import { PageEmpty, PageError, PageSkeleton } from "./PageStates"

const PRIVILEGE_LABELS: { key: keyof PageAdminPrivileges; label: string }[] = [
  { key: "general", label: "Général" },
  { key: "info", label: "Informations" },
  { key: "social", label: "Réseaux" },
  { key: "avatar", label: "Avatar & couverture" },
  { key: "design", label: "Design" },
  { key: "admins", label: "Gestion admins" },
  { key: "analytics", label: "Statistiques" },
  { key: "deletePage", label: "Suppression" },
]

interface AdminsPanelProps {
  pageId: string
  admins: PageAdmin[]
  loading: boolean
  error: unknown
}

export default function AdminsPanel({ pageId, admins, loading, error }: AdminsPanelProps) {
  const addMutation = useAddAdmin(pageId)
  const removeMutation = useRemoveAdmin(pageId)
  const privilegesMutation = useUpdateAdminPrivileges(pageId)
  const [newAdminId, setNewAdminId] = useState("")

  const handleAdd = async () => {
    if (!newAdminId.trim()) {
      toast.error("Saisissez l'ID Dughu de l'utilisateur.")
      return
    }
    try {
      const result = await addMutation.mutateAsync(newAdminId.trim())
      if (result.success === false) toast.error(result.message || "Impossible d'ajouter l'administrateur.")
      else {
        toast.success("Administrateur ajouté !")
        setNewAdminId("")
      }
    } catch {
      toast.error("Impossible d'ajouter l'administrateur.")
    }
  }

  const handleTogglePrivilege = async (admin: PageAdmin, key: keyof PageAdminPrivileges, value: boolean) => {
    const privileges = { ...admin.privileges, [key]: value }
    try {
      const result = await privilegesMutation.mutateAsync({ adminId: admin.id, privileges })
      if (result.success === false) toast.error(result.message || "Impossible de mettre à jour les privilèges.")
    } catch {
      toast.error("Impossible de mettre à jour les privilèges.")
    }
  }

  if (loading && admins.length === 0) return <PageSkeleton rows={2} />
  if (error) {
    return (
      <PageError message={error instanceof Error && error.message ? error.message : "Impossible de charger les administrateurs."} />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-admin-id" className="mb-1 block text-sm font-semibold text-[#2D2D2D]">Ajouter un administrateur (ID Dughu)</label>
          <input
            id="new-admin-id"
            value={newAdminId}
            onChange={(e) => setNewAdminId(e.target.value)}
            placeholder="ex. 28341"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20"
          />
        </div>
        <Button onClick={handleAdd} disabled={addMutation.isPending} className="rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F]">
          <UserPlus size={16} aria-hidden className="mr-1" />
          Ajouter
        </Button>
      </div>

      {admins.length === 0 ? (
        <PageEmpty title="Aucun administrateur" text="Ajoutez des administrateurs pour gérer cet espace en équipe." />
      ) : (
        <ul className="space-y-3">
          {admins.map((admin) => (
            <li key={admin.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#F0F2F5]">
                  <Image src="/images/avatar.png" alt="" fill sizes="40px" className="object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#2D2D2D]">Admin #{admin.id}</p>
                  <p className="truncate text-xs text-[#65676B]">ID Dughu : {admin.userId || "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Retirer cet administrateur ?")) {
                      void removeMutation.mutate(admin.userId, {
                        onError: () => toast.error("Impossible de retirer l'administrateur."),
                        onSuccess: (result) => {
                          if (result.success === false) toast.error(result.message || "Impossible de retirer l'administrateur.")
                          else toast.success("Administrateur retiré.")
                        },
                      })
                    }
                  }}
                  disabled={removeMutation.isPending}
                  className="rounded-full p-2 text-[#8A8D91] transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`Retirer l'admin ${admin.id}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={`Privilèges de l'admin ${admin.id}`}>
                {PRIVILEGE_LABELS.map(({ key, label }) => (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                      admin.privileges[key] ? "border-[#A35A2A]/40 bg-[#F5EFE8] text-[#6B3F1D]" : "border-gray-200 text-[#65676B]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={admin.privileges[key]}
                      onChange={(e) => handleTogglePrivilege(admin, key, e.target.checked)}
                      className="size-3.5 accent-[#A35A2A]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}