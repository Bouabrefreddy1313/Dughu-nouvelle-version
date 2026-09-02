"use client"

/**
 * Panneau « Offres » d'un espace — liste (GET /getPageOffers) + création
 * (POST /offers : description, discount_type, discount_percent,
 * expire_date, expire_time). Gestion réservée aux admins.
 */

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCreateOffer, usePageOffers } from "@/hooks/pages/use-pages"
import { PageEmpty, PageSkeleton } from "./PageStates"

interface OffersPanelProps {
  pageId: string
  canManage: boolean
}

export default function OffersPanel({ pageId, canManage }: OffersPanelProps) {
  const offersQuery = usePageOffers(pageId)
  const createMutation = useCreateOffer(pageId)
  const [formOpen, setFormOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState("discount_percent")
  const [discountPercent, setDiscountPercent] = useState(10)
  const [expireDate, setExpireDate] = useState("")
  const [expireTime, setExpireTime] = useState("12:00")

  const offers = offersQuery.data?.offers ?? []
  const loading = offersQuery.isLoading

  const handleCreate = async () => {
    if (!description.trim()) {
      toast.error("Une description est requise.")
      return
    }
    try {
      const result = await createMutation.mutateAsync({
        description: description.trim(),
        discountType,
        discountPercent,
        expireDate,
        expireTime,
      })
      if (result.success === false) {
        toast.error(result.message || "Impossible de créer l'offre.")
        return
      }
      toast.success("Offre créée ! 🎉")
      setFormOpen(false)
      setDescription("")
    } catch {
      toast.error("Impossible de créer l'offre.")
    }
  }

  if (loading && offers.length === 0) return <PageSkeleton rows={2} />

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#2D2D2D]">
              <Tag size={15} className="text-[#A35A2A]" /> Créer une offre
            </h3>
            <Button variant="outline" onClick={() => setFormOpen((open) => !open)} className="rounded-full px-3 py-1 text-xs">
              <Plus size={14} aria-hidden className="mr-1" />
              {formOpen ? "Fermer" : "Nouvelle offre"}
            </Button>
          </div>
          {formOpen && (
            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Description de l'offre…"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#2D2D2D]">
                  Type
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                    <option value="discount_percent">Pourcentage</option>
                    <option value="discount_amount">Montant</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[#2D2D2D]">
                  Remise ({discountType === "discount_percent" ? "%" : "montant"})
                  <input type="number" min={0} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#A35A2A]" />
                </label>
                <label className="block text-xs font-semibold text-[#2D2D2D]">
                  Date d'expiration
                  <input type="date" value={expireDate} onChange={(e) => setExpireDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#A35A2A]" />
                </label>
                <label className="block text-xs font-semibold text-[#2D2D2D]">
                  Heure d'expiration
                  <input type="time" value={expireTime} onChange={(e) => setExpireTime(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#A35A2A]" />
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F]">
                  {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : "Créer l'offre"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {offers.length === 0 ? (
        <PageEmpty title="Aucune offre" text="Les offres promotionnelles de cet espace apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F5EFE8] px-2.5 py-1 text-xs font-bold text-[#A35A2A]">
                  {offer.discountType === "discount_percent" ? `-${offer.discountPercent}%` : `-${offer.discountAmount}`}
                </span>
                <span className="text-sm font-semibold text-[#2D2D2D]">Offre {offer.id}</span>
              </div>
              <p className="mt-2 text-sm text-[#65676B]">{offer.description || "Aucune description."}</p>
              {!!offer.discountedItems && <p className="mt-1 text-xs text-[#8A8D91]">Articles concernés : {offer.discountedItems}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}