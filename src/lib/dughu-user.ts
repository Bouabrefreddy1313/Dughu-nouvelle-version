// Résolution de l'ID utilisateur Dughu côté serveur — 100% API, aucun miroir local.
//
// La base locale (Prisma) et NextAuth sont supprimés : la session est portée
// exclusivement par les cookies `dughu_token` / `dughu_user_id` posés par les
// routes /api/login et /api/auth/google. On ne consulte plus jamais la base.
//
// Ce module est réservé aux routes API (il lit les cookies) : ne pas l'importer
// dans un composant client.

import { dughu, dughuApi, pick } from "@/lib/dughu"

export interface LocalUserRef {
  email?: string | null
  username?: string | null
}

/** Lit l'identifiant Dughu depuis le cookie de session (source de vérité). */
export async function getDughuUserIdFromCookies(): Promise<string> {
  const cookiesModule = await import("next/headers")
  const store = await cookiesModule.cookies()
  const v = store.get("dughu_user_id")?.value || ""
  return /^\d+$/.test(v) ? v : ""
}

/** Lit le token Dughu depuis le cookie de session (source de vérité). */
export async function getDughuTokenFromCookies(): Promise<string> {
  const cookiesModule = await import("next/headers")
  const store = await cookiesModule.cookies()
  return store.get("dughu_token")?.value || ""
}

/**
 * Résout l'ID Dughu d'un identifiant. Sous le nouveau flux "token Dughu", le
 * frontend fournit directement l'ID Dughu numérique (cookie `dughu_user_id` ou
 * paramètre), on n'a donc plus de couche locale. Cette fonction ne fait aucune
 * lecture en base : elle interroge l'API Dughu par email/username en dernier
 * recours.
 */
export async function resolveDughuUserId(identifier: string | number | LocalUserRef | null | undefined): Promise<string> {
  if (!dughu.enabled || !identifier) return ""
  // ID Dughu numérique fourni directement (cookie/paramètre/frontend)
  if (typeof identifier === "string" && /^\d+$/.test(identifier)) return identifier
  if (typeof identifier === "number") return String(identifier)

  let candidates: string[] = []
  if (typeof identifier === "object") {
    candidates = [identifier.email || "", identifier.username || ""].filter(Boolean)
  } else {
    candidates = [String(identifier)]
  }
  const numeric = candidates.find((c) => /^\d+$/.test(c))
  if (numeric) return numeric
  if (!candidates.length) return ""

  for (const candidate of candidates) {
    try {
      const raw = await dughuApi.getUser(candidate, "0")
      const obj = raw?.user ?? raw?.data ?? raw?.profile ?? raw?.result ?? raw
      const id = String(pick(obj, "user_id", "userId", "id", "ID") || "")
      if (id) return id
    } catch {
      // candidat introuvable → on tente le suivant
    }
  }
  return ""
}

/**
 * Rétro-compat : résolution d'un identifiant "local". Comme il n'y a plus de
 * base locale, on renvoie tel quel si c'est déjà un ID numérique, sinon on lit
 * le cookie de session.
 */
export async function resolveDughuUserIdFromLocalId(localUserId?: string | null): Promise<string> {
  if (localUserId && /^\d+$/.test(String(localUserId))) return String(localUserId)
  return getDughuUserIdFromCookies()
}