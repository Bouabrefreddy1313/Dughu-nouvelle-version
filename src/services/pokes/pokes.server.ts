/**
 * Service SERVEUR du domaine Pokes — utilisé UNIQUEMENT par les Route Handlers
 * /api/pokes. Il appelle l'API Dughu avec l'instance Axios serveur (token
 * X-AppApiToken côté serveur uniquement), normalise les réponses via le
 * mappeur et ne retourne que des modèles métier.
 *
 * Endpoints Dughu (sémantique vérifiée sur apitest) :
 *  - GET  /pokes?user_id=X            → pokes REÇUS par X (user = expéditeur) ;
 *  - GET  /pokes/sent?user_id=X       → pokes ENVOYÉS par X (user = destinataire) ;
 *  - POST /pokes                      → envoyer un poke (user_id, received_user_id) ;
 *  - POST /pokes/{pokeId}/poke-back   → répondre à un poke (user_id, received_user_id
 *                                       = l'expéditeur original du poke).
 */

import { dughuServerForm, dughuServerGet } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import { mapPoke, mapPokesList } from "@/services/pokes/pokes.mapper"
import type { Poke, PokesResponse } from "@/types/pokes/pokes.types"

export type PokesBox = "received" | "sent"

/** Liste des pokes (reçus ou envoyés) — lecture idempotente : retry possible. */
export async function fetchPokes(box: PokesBox, userId: string): Promise<PokesResponse> {
  if (!userId) {
    return { success: false, message: "Identifiant utilisateur requis.", pokes: [] }
  }
  try {
    const path = box === "sent" ? "pokes/sent" : "pokes"
    const raw = await dughuServerGet(path, { user_id: userId }, { retry: true })
    if ((raw as { success?: unknown })?.success === false) {
      return {
        success: false,
        message: box === "sent" ? "Impossible de charger vos pokes envoyés." : "Impossible de charger vos pokes reçus.",
        pokes: [],
      }
    }
    return { success: true, pokes: mapPokesList(raw) }
  } catch (error) {
    throw new ApiError(box === "sent" ? "Impossible de charger vos pokes envoyés." : "Impossible de charger vos pokes reçus.", {
      cause: error,
    })
  }
}

/** Envoie un poke de `userId` vers `receivedUserId`. Mutation : aucun retry. */
export async function sendPoke(userId: string, receivedUserId: string): Promise<Poke> {
  if (!userId || !receivedUserId) {
    throw new ApiError("Identifiant utilisateur requis pour envoyer un poke.", { status: 422 })
  }
  try {
    const raw = await dughuServerForm("pokes", {
      user_id: userId,
      received_user_id: receivedUserId,
    })
    if ((raw as { success?: unknown })?.success === false) {
      throw new ApiError("L'API Dughu a refusé l'envoi du poke.", { status: 502 })
    }
    // L'API renvoie le poke créé (parfois sans `user` complet) : on le
    // normalise et on complète la contrepartie si nécessaire.
    const poke = mapPoke((raw as { result?: unknown })?.result ?? raw)
    if (!poke) throw new ApiError("Réponse invalide lors de l'envoi du poke.", { status: 502 })
    if (!poke.user.id) poke.user.id = receivedUserId
    poke.senderId = poke.senderId || userId
    poke.receiverId = poke.receiverId || receivedUserId
    return poke
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible d'envoyer le poke.", { cause: error })
  }
}

/**
 * Répond à un poke (poke-back) : `userId` répond au poke `pokeId` en piquant
 * `receivedUserId` (l'expéditeur original). Mutation : aucun retry.
 */
export async function pokeBack(pokeId: string, userId: string, receivedUserId: string): Promise<Poke> {
  if (!pokeId || !userId || !receivedUserId) {
    throw new ApiError("Paramètres requis pour répondre à un poke.", { status: 422 })
  }
  try {
    const raw = await dughuServerForm(`pokes/${encodeURIComponent(pokeId)}/poke-back`, {
      user_id: userId,
      received_user_id: receivedUserId,
    })
    if ((raw as { success?: unknown })?.success === false) {
      throw new ApiError("L'API Dughu a refusé le poke de réponse.", { status: 502 })
    }
    const poke = mapPoke((raw as { result?: unknown })?.result ?? raw)
    if (!poke) throw new ApiError("Réponse invalide lors du poke de réponse.", { status: 502 })
    if (!poke.user.id) poke.user.id = receivedUserId
    poke.senderId = poke.senderId || userId
    poke.receiverId = poke.receiverId || receivedUserId
    return poke
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de répondre à ce poke.", { cause: error })
  }
}
