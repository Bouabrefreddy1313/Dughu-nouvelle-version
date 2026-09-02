/**
 * Types du domaine Pokes.
 *
 * Modèles métier normalisés (jamais la réponse brute de l'API Dughu : les
 * champs sensibles — e-mail, tokens, géolocalisation — ne sortent jamais du
 * serveur). La normalisation défensive vit dans pokes.mapper.ts / pokes.server.ts.
 */

/** Utilisateur (contrepartie d'un poke) — champs affichables uniquement. */
export interface PokeUser {
  id: string
  name: string
  username: string
  avatar: string
}

/** Poke normalisé. `user` = l'autre utilisateur (expéditeur si reçu, destinataire si envoyé). */
export interface Poke {
  id: string
  senderId: string
  receiverId: string
  user: PokeUser
  /** Date ISO (created_at de l'API, sinon dt). */
  createdAt: string
}

/** Réponse d'une liste de pokes (reçus ou envoyés). */
export interface PokesResponse {
  success: boolean
  message?: string
  pokes: Poke[]
}

/** Réponse d'une mutation (envoi de poke / poke-back). */
export interface PokeActionResponse {
  success: boolean
  message?: string
  poke?: Poke
}
