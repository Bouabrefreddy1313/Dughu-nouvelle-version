"use client"

/**
 * Onglet « Suggestions » — suggestions de personnes à poker, dérivées de la
 * liste des pokes reçus (endpoint Dughu /pokes?user_id=X : les expéditeurs y
 * sont fournis avec leur profil). Les doublons sont dédupliqués par
 * utilisateur (le poke le plus récent fait foi) et triés du plus récent au
 * plus ancien. Action : « Poker » → POST /api/pokes (endpoint Dughu POST
 * /pokes { user_id, received_user_id }).
 */

import { useMemo, useState } from "react"
import { toast } from "sonner"
import PokeRow from "./PokeRow"
import { PokesEmpty, PokesError, PokesSkeleton } from "./PokesStates"
import { useSendPoke } from "@/hooks/pokes/use-pokes"
import type { Poke } from "@/types/pokes/pokes.types"

interface SuggestionsTabProps {
  /** Pokes reçus (source des suggestions : les expéditeurs). */
  pokes: Poke[]
  loading: boolean
  error: unknown
  onRetry: () => void
  dughuUserId: string | undefined
}

export default function SuggestionsTab({ pokes, loading, error, onRetry, dughuUserId }: SuggestionsTabProps) {
  const sendMutation = useSendPoke(dughuUserId)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  // Déduplication par utilisateur : une seule suggestion par personne.
  const suggestions = useMemo(() => {
    const byUser = new Map<string, Poke>()
    for (const poke of pokes) {
      const key = poke.user.id || poke.senderId
      if (!key) continue
      const existing = byUser.get(key)
      if (!existing || poke.createdAt > existing.createdAt) byUser.set(key, poke)
    }
    return [...byUser.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [pokes])

  const handlePoke = async (poke: Poke) => {
    setPendingUserId(poke.user.id)
    try {
      await sendMutation.mutateAsync(poke.user.id)
      toast.success(`Poke envoyé à ${poke.user.name} ! 🎉`)
    } catch {
      toast.error("Impossible d'envoyer le poke. Veuillez réessayer.")
    } finally {
      setPendingUserId(null)
    }
  }

  if (loading && pokes.length === 0) return <PokesSkeleton />
  if (error) {
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les suggestions."
    return <PokesError message={message} onRetry={onRetry} />
  }
  if (suggestions.length === 0) {
    return (
      <PokesEmpty
        title="Aucune suggestion pour le moment"
        text="Les personnes qui vous envoient des pokes apparaîtront ici — vous pourrez leur renvoyer un poke en un clic."
      />
    )
  }

  return (
    <ul role="tabpanel" aria-label="Suggestions de pokes" className="space-y-3">
      {suggestions.map((poke) => (
        <PokeRow
          key={poke.user.id || poke.id}
          poke={poke}
          actionLabel="Poker"
          pending={pendingUserId === poke.user.id}
          onAction={handlePoke}
        />
      ))}
    </ul>
  )
}
