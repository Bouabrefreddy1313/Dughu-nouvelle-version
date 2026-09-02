"use client"

/**
 * Onglet « Pokes envoyés » — liste des pokes envoyés par l'utilisateur
 * connecté (GET /api/pokes?box=sent, endpoint Dughu /pokes/sent?user_id=X).
 * Le `user` de chaque poke est le destinataire. Action possible : re-poker.
 */

import { useState } from "react"
import { toast } from "sonner"
import PokeRow from "./PokeRow"
import { PokesEmpty, PokesError, PokesSkeleton } from "./PokesStates"
import { useSendPoke } from "@/hooks/pokes/use-pokes"
import type { Poke } from "@/types/pokes/pokes.types"

interface SentPokesTabProps {
  pokes: Poke[]
  loading: boolean
  error: unknown
  onRetry: () => void
  dughuUserId: string | undefined
}

export default function SentPokesTab({ pokes, loading, error, onRetry, dughuUserId }: SentPokesTabProps) {
  const sendMutation = useSendPoke(dughuUserId)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const handlePokeAgain = async (poke: Poke) => {
    setPendingKey(poke.id)
    try {
      await sendMutation.mutateAsync(poke.user.id)
      toast.success(`Poke envoyé à ${poke.user.name} ! 🎉`)
    } catch {
      toast.error("Impossible d'envoyer le poke. Veuillez réessayer.")
    } finally {
      setPendingKey(null)
    }
  }

  if (loading && pokes.length === 0) return <PokesSkeleton />
  if (error) {
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger vos pokes envoyés."
    return <PokesError message={message} onRetry={onRetry} />
  }
  if (pokes.length === 0) {
    return (
      <PokesEmpty
        title="Aucun poke envoyé pour le moment"
        text="Rendez-vous dans l'onglet « Suggestions » pour envoyer votre premier poke."
      />
    )
  }

  return (
    <ul role="tabpanel" aria-label="Pokes envoyés" className="space-y-3">
      {pokes.map((poke) => (
        <PokeRow
          key={poke.id}
          poke={poke}
          actionLabel="Re-poker"
          actionTone="secondary"
          pending={pendingKey === poke.id}
          onAction={handlePokeAgain}
        />
      ))}
    </ul>
  )
}
