"use client"

/**
 * Onglet « Pokes reçus » — liste des pokes reçus par l'utilisateur connecté
 * (GET /api/pokes?box=received). Devant chaque nom : bouton « Répondre » qui
 * envoie un poke en retour (POST /api/pokes/:pokeId/poke-back) avec mise à
 * jour optimiste (le poke répondu quitte la liste immédiatement).
 */

import { useState } from "react"
import { toast } from "sonner"
import PokeRow from "./PokeRow"
import { PokesEmpty, PokesError, PokesSkeleton } from "./PokesStates"
import { usePokeBack } from "@/hooks/pokes/use-pokes"
import type { Poke } from "@/types/pokes/pokes.types"

interface ReceivedPokesTabProps {
  pokes: Poke[]
  loading: boolean
  error: unknown
  onRetry: () => void
  dughuUserId: string | undefined
}

export default function ReceivedPokesTab({ pokes, loading, error, onRetry, dughuUserId }: ReceivedPokesTabProps) {
  const pokeBackMutation = usePokeBack(dughuUserId)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handlePokeBack = async (poke: Poke) => {
    setPendingId(poke.id)
    try {
      await pokeBackMutation.mutateAsync({ pokeId: poke.id, receivedUserId: poke.user.id })
      toast.success(`Vous avez répondu à ${poke.user.name} ! 🎉`)
    } catch {
      // Rollback déjà effectué par le hook : le poke réapparaît dans la liste.
      toast.error("Impossible de répondre à ce poke. Veuillez réessayer.")
    } finally {
      setPendingId(null)
    }
  }

  if (loading && pokes.length === 0) return <PokesSkeleton />
  if (error) {
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger vos pokes reçus."
    return <PokesError message={message} onRetry={onRetry} />
  }
  if (pokes.length === 0) {
    return (
      <PokesEmpty
        title="Aucun poke reçu pour le moment"
        text="Dès qu'un utilisateur vous enverra un poke, il apparaîtra ici et vous pourrez lui répondre."
      />
    )
  }

  return (
    <ul role="tabpanel" aria-label="Pokes reçus" className="space-y-3">
      {pokes.map((poke) => (
        <PokeRow
          key={poke.id}
          poke={poke}
          actionLabel="Répondre"
          pending={pendingId === poke.id || (pokeBackMutation.isPending && pokeBackMutation.variables?.pokeId === poke.id)}
          onAction={handlePokeBack}
        />
      ))}
    </ul>
  )
}
