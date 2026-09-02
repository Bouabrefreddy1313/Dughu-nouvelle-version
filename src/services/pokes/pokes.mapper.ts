/**
 * Mappeur du domaine Pokes — normalisation défensive de la réponse brute de
 * l'API Dughu vers les modèles métier (src/types/pokes/pokes.types.ts).
 *
 * ⚠️ Seuls les champs affichables sont conservés : e-mail, tokens mobiles et
 * autres données sensibles présents dans la réponse brute ne sortent JAMAIS
 * du serveur.
 */

import type { Poke, PokeUser } from "@/types/pokes/pokes.types"

/* eslint-disable @typescript-eslint/no-explicit-any */

function pick(source: any, keys: string[]): any {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function toIsoDate(...values: any[]): string {
  for (const value of values) {
    if (typeof value === "string" && value) {
      // Format "YYYY-MM-DD HH:mm:ss" : normalisé en ISO pour Date().
      const iso = value.includes("T") ? value : value.replace(" ", "T")
      const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`)
      if (!Number.isNaN(date.getTime())) return date.toISOString()
      const fallback = new Date(value)
      if (!Number.isNaN(fallback.getTime())) return fallback.toISOString()
    }
  }
  return ""
}

/** Normalise l'utilisateur embarqué dans un poke (expéditeur ou destinataire). */
export function mapPokeUser(raw: any): PokeUser {
  const id = String(pick(raw, ["user_id", "userId", "id"]) ?? "")
  const fullName = [pick(raw, ["first_name"]), pick(raw, ["last_name"])]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .trim()
  const username = String(pick(raw, ["username", "pseudo"]) ?? "")
  return {
    id,
    name: fullName || username || "Utilisateur",
    username,
    avatar: String(pick(raw, ["avatar", "profile_photo_path", "profile_photo_url"]) || "/images/avatar.png"),
  }
}

/** Normalise un poke brut (forme : { id, send_user_id, received_user_id, user, ... }). */
export function mapPoke(raw: any): Poke | null {
  if (!raw || typeof raw !== "object") return null
  const id = String(pick(raw, ["id", "poke_id"]) ?? "")
  if (!id) return null
  return {
    id,
    senderId: String(pick(raw, ["send_user_id", "sender_id", "sendUserId"]) ?? ""),
    receiverId: String(pick(raw, ["received_user_id", "receiver_id", "receivedUserId"]) ?? ""),
    user: mapPokeUser(raw?.user ?? raw?.sender ?? raw?.receiver),
    createdAt: toIsoDate(raw?.created_at, raw?.dt, raw?.updated_at),
  }
}

/** Normalise une liste de pokes ({ result: [...] } ou tableau brut). */
export function mapPokesList(raw: any): Poke[] {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.result) ? raw.result : Array.isArray(raw?.data) ? raw.data : []
  return list
    .map((item: any) => mapPoke(item))
    .filter((poke: Poke | null): poke is Poke => poke !== null)
}
