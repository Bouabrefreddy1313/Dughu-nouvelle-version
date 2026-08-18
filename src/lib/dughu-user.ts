// Résolution de l'ID utilisateur Dughu côté serveur.
//
// Contexte : la colonne `dughuId` a été supprimée de la base locale afin que
// les comptes créés sur Dughu v1 (Laravel) puissent se connecter à Dughu v2
// (Next.js) et voir leurs infos sans miroir préalable. L'ID Dughu n'est donc
// plus stocké en base : il est résolu à la demande via l'API Dughu, d'abord
// par email puis par username.
//
// Ce module est réservé aux routes API (il importe Prisma) : ne pas l'importer
// dans un composant client.

import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, pick } from "@/lib/dughu"

export interface LocalUserRef {
  email?: string | null
  username?: string | null
}

// Petit cache mémoire (TTL 5 min) pour éviter de rappeler l'API Dughu à chaque
// requête quand le frontend n'a pas fourni `dughuUserId`.
const CACHE_TTL_MS = 5 * 60 * 1000
const resolveCache = new Map<string, { id: string; at: number }>()

function readCache(key: string): string | null {
  const cached = resolveCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.id
  if (cached) resolveCache.delete(key)
  return null
}

/** Résout l'ID Dughu d'un utilisateur local via l'API Dughu (email puis username). */
export async function resolveDughuUserId(localUser: LocalUserRef | null | undefined): Promise<string> {
  if (!dughu.enabled || !localUser) return ""
  const identifiers = [localUser.email || "", localUser.username || ""].filter(Boolean)
  for (const identifier of identifiers) {
    const cacheKey = `id:${identifier}`
    const cached = readCache(cacheKey)
    if (cached !== null) return cached

    try {
      const raw = await dughuApi.getUser(identifier, "0")
      const obj = raw?.user ?? raw?.data ?? raw?.profile ?? raw?.result ?? raw
      const id = String(pick(obj, "user_id", "userId", "id", "ID") || "")
      if (id) {
        resolveCache.set(cacheKey, { id, at: Date.now() })
        return id
      }
    } catch {
      // Identifiant introuvable côté Dughu → on essaie le suivant.
    }
  }
  return ""
}

/** Résout l'ID Dughu depuis l'ID local (User.id en base Prisma). */
export async function resolveDughuUserIdFromLocalId(localUserId: string | null | undefined): Promise<string> {
  if (!localUserId) return ""
  const cacheKey = `local:${localUserId}`
  const cached = readCache(cacheKey)
  if (cached !== null) return cached

  const localUser = await prisma.user
    .findUnique({ where: { id: localUserId }, select: { email: true, username: true } })
    .catch(() => null)
  const id = await resolveDughuUserId(localUser)
  if (id) resolveCache.set(cacheKey, { id, at: Date.now() })
  return id
}
