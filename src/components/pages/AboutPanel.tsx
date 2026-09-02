"use client"

/**
 * Panneau « À propos » d'un espace — coordonnées + gestion (si admin) :
 * destinataire des points (POST /page/{id}/points-recipient) et liens
 * sociaux (POST /socialLinksUpdat — clé `instgram` = typo backend conservée).
 */

import { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUpdatePointsRecipient, useUpdateSocialLinks } from "@/hooks/pages/use-pages"
import type { PageSocialLinks } from "@/types/pages/pages.types"

interface AboutPanelProps {
  pageId: string
  website: string
  phone: string
  address: string
  company: string
  categoryName: string
  registered: string
  pointsRecipient: string
  social: PageSocialLinks
  canManage: boolean
}

export default function AboutPanel({ pageId, website, phone, address, company, categoryName, registered, pointsRecipient, social, canManage }: AboutPanelProps) {
  const socialMutation = useUpdateSocialLinks(pageId)
  const pointsMutation = useUpdatePointsRecipient(pageId)
  const [links, setLinks] = useState<PageSocialLinks>(social)
  const [showSocialForm, setShowSocialForm] = useState(false)
  const [savingSocial, setSavingSocial] = useState(false)

  const handleSaveSocial = async () => {
    setSavingSocial(true)
    try {
      const result = await socialMutation.mutateAsync(links)
      if (result.success === false) toast.error(result.message || "Impossible de mettre à jour les liens.")
      else toast.success("Liens sociaux mis à jour !")
      setShowSocialForm(false)
    } catch {
      toast.error("Impossible de mettre à jour les liens sociaux.")
    } finally {
      setSavingSocial(false)
    }
  }

  const setLink = (key: keyof PageSocialLinks, value: string) => setLinks((prev) => ({ ...prev, [key]: value }))

  const fields: { label: string; value: string }[] = [
    { label: "Catégorie", value: categoryName },
    { label: "Créé", value: registered },
    { label: "Entreprise", value: company },
    { label: "Site web", value: website },
    { label: "Téléphone", value: phone },
    { label: "Adresse", value: address },
  ]

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#8A8D91]">{label}</dt>
            <dd className="mt-1 truncate text-sm font-medium text-[#2D2D2D]">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {canManage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#2D2D2D]">Destinataire des points</h3>
            <div className="flex gap-1" role="group" aria-label="Destinataire des points">
              {(["subscriber", "owner", "none"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    void pointsMutation.mutate(option, {
                      onSuccess: (result) => {
                        if (result.success === false) toast.error(result.message || "Impossible de modifier le destinataire.")
                        else toast.success("Destinataire mis à jour.")
                      },
                      onError: () => toast.error("Impossible de modifier le destinataire."),
                    })
                  }
                  className={
                    pointsRecipient === option
                      ? "rounded-full bg-[#A35A2A] px-3 py-1.5 text-xs font-semibold text-white"
                      : "rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#65676B] hover:bg-gray-50"
                  }
                >
                  {option === "subscriber" ? "Abonnés" : option === "owner" ? "Propriétaire" : "Aucun"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2D2D2D]">Liens sociaux</h3>
              <Button variant="outline" onClick={() => setShowSocialForm((value) => !value)} className="rounded-full px-3 py-1 text-xs">
                {showSocialForm ? <EyeOff size={13} aria-hidden className="mr-1" /> : <Eye size={13} aria-hidden className="mr-1" />}
                {showSocialForm ? "Masquer" : "Modifier"}
              </Button>
            </div>
            {showSocialForm && (
              <div className="mt-3 space-y-2">
                {(["facebook", "instagram", "twitter", "linkedin", "youtube", "vk"] as const).map((key) => (
                  <input
                    key={key}
                    value={links[key]}
                    onChange={(e) => setLink(key, e.target.value)}
                    placeholder={`Lien ${key}`}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20"
                  />
                ))}
                <div className="flex justify-end">
                  <Button onClick={handleSaveSocial} disabled={savingSocial} className="rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F]">
                    {savingSocial ? <Loader2 size={15} className="animate-spin" /> : "Enregistrer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}