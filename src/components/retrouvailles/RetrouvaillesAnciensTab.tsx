"use client"

// ── RetrouvaillesAnciensTab — onglet « Anciens » ────────────────────────────
// Formulaire de recherche (école / université, promotion début/fin, ville),
// puis résultats avec bouton « Fraterniser ».

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRetrouvailles } from "@/hooks/retrouvailles/use-retrouvailles"
import RetrouvaillePersonCard from "./RetrouvaillePersonCard"
import { RetrouvaillesSkeletons, RetrouvaillesEmpty, RetrouvaillesError } from "./RetrouvaillesStates"

interface RetrouvaillesAnciensTabProps {
  userId: string
}

export default function RetrouvaillesAnciensTab({ userId }: RetrouvaillesAnciensTabProps) {
  const [school, setSchool] = useState("")
  const [ville, setVille] = useState("")
  const [promotionStart, setPromotionStart] = useState("")
  const [promotionEnd, setPromotionEnd] = useState("")
  const [searched, setSearched] = useState(false)

  // La requête vit ICI : toujours active (le refetch sur critères fonctionne) ;
  // l'affichage des résultats est contrôlé par `searched`.
  const query = useRetrouvailles("anciens", {
    userId,
    ville: ville || undefined,
    school: school || undefined,
    promotionStart: promotionStart || undefined,
    promotionEnd: promotionEnd || undefined,
    enabled: !!userId,
  })

  const sentIds = new Set<string>()

  const submit = () => {
    setSearched(true)
    // Force le refetch (même si les critères n'ont pas changé depuis le
    // dernier appel) pour relancer la recherche des anciens.
    void query.refetch()
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:grid-cols-2"
      >
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-[12px] font-semibold text-[#2D2D2D]">École / Université</span>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Ex. Esatic, Université FHB…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2D2D] outline-none focus:ring-2 focus:ring-[#A35A2A]/30"
          />
        </label>
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-[12px] font-semibold text-[#2D2D2D]">Ville</span>
          <input
            type="text"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Ex. Abidjan, Bouaké…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2D2D] outline-none focus:ring-2 focus:ring-[#A35A2A]/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-[#2D2D2D]">Promotion : début</span>
          <input
            type="number"
            min={1950}
            max={2100}
            value={promotionStart}
            onChange={(e) => setPromotionStart(e.target.value)}
            placeholder="Ex. 2018"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2D2D] outline-none focus:ring-2 focus:ring-[#A35A2A]/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-[#2D2D2D]">Promotion : fin</span>
          <input
            type="number"
            min={1950}
            max={2100}
            value={promotionEnd}
            onChange={(e) => setPromotionEnd(e.target.value)}
            placeholder="Ex. 2021"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2D2D] outline-none focus:ring-2 focus:ring-[#A35A2A]/30"
          />
        </label>
        <Button type="submit" className="col-span-2 gap-1.5 bg-[#A35A2A] text-white hover:bg-[#8a4d23]">
          <Search size={15} aria-hidden />
          Rechercher
        </Button>
      </form>

      {!searched ? (
        <RetrouvaillesEmpty label="Renseignez les critères puis lancez la recherche pour retrouver vos anciens." />
      ) : query.isLoading || query.isFetching ? (
        <RetrouvaillesSkeletons />
      ) : query.isError ? (
        <RetrouvaillesError
          message={query.error instanceof Error ? query.error.message : "Impossible de charger les anciens."}
          onRetry={() => query.refetch()}
        />
      ) : (query.data?.persons?.length ?? 0) === 0 ? (
        <RetrouvaillesEmpty label="Aucun ancien trouvé avec ces critères. Essayez d'élargir la recherche." />
      ) : (
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-[#65676B]">
            {query.data?.persons?.length ?? 0} ancien(s) retrouvé(s)
          </p>
          <ul className="space-y-2.5">
            {query.data?.persons?.map((person) => (
              <RetrouvaillePersonCard key={person.id} person={person} authUserId={userId} sentIds={sentIds} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}