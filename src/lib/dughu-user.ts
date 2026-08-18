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
import { dughu, dughuApi, pick, normalizeUser } from "@/lib/dughu"

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
  // Nouveau flux "token Dughu" : le username peut être directement un ID Dughu
  // numérique (aucune consultation API nécessaire).
  if (localUser.username && /^\d+$/.test(String(localUser.username))) return String(localUser.username)
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
  // Nouveau flux "token Dughu" : l'identifiant fourni par le frontend est déjà
  // l'ID Dughu numérique → pas de consultation locale nécessaire.
  if (/^\d+$/.test(String(localUserId))) return String(localUserId)
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
// ── Synchronisation du miroir local depuis l'API Dughu ──────────────────────
//
// Dughu est la source de vérité : c'est elle qui alimente les pages profil
// (cf. /api/profile). Le miroir local Prisma alimente quant à lui l'accueil,
// les sidebars et les réponses /api/auth/*. Sans synchronisation, les deux
// divergent (nom, username, photos différents entre l'accueil et le profil).

const SYNC_DEFAULT_AVATAR = "/images/avatar.png"
const SYNC_DEFAULT_COVER = "/images/group/default-cover.jpg"
const SYNC_TTL_MS = 60 * 60 * 1000 // re-synchronise au plus une fois par heure et par utilisateur
const lastSyncAt = new Map<string, number>()

/** Indique si l'utilisateur local doit être re-synchronisé (garde TTL mémoire). */
export function shouldSyncLocalUser(localUserId: string): boolean {
  const at = lastSyncAt.get(localUserId) || 0
  return Date.now() - at >= SYNC_TTL_MS
}

function toDateOrNull(v: any): Date | null {
  if (v === null || v === undefined || v === "") return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

/** Construit le diff des champs texte (sans avatar/cover) entre local et Dughu. */
function buildTextPatch(localUser: any, u: any): Record<string, any> {
  const data: Record<string, any> = {}
  const set = (key: string, value: any) => {
    if (value === undefined || value === null || value === "") return
    if (localUser[key] !== value) data[key] = value
  }

  set("firstName", u.firstName || null)
  set("lastName", u.lastName || null)
  set("name", u.name || null)
  set("bio", u.bio || null)
  set("gender", u.gender || null)
  set("phone", u.phone || null)
  const birthdate = toDateOrNull(u.birthdate)
  if (birthdate && (!localUser.birthdate || localUser.birthdate.getTime() !== birthdate.getTime())) {
    data.birthdate = birthdate
  }
  return data
}

/**
 * Aligne le miroir local (Prisma) sur les données fraîches de l'API Dughu.
 *
 * - Récupère le profil via getSpecificUser/{dughuUserId}/0 (la réponse de
 *   login est souvent incomplète : pas d'avatar/cover).
 * - N'écrit que les champs réellement différents (évite de bumper updatedAt
 *   inutilement et de perturber la garde TTL).
 * - Miroir strict : si Dughu n'a pas d'avatar/cover, le local prend les
 *   valeurs par défaut pour afficher exactement la même chose que le profil.
 * - Ne modifie rien si l'API Dughu est injoignable (pas de wipe sur erreur).
 * - username/slug : mis à jour uniquement s'ils ne sont pas déjà pris par un
 *   autre compte local (unicité Prisma).
 *
 * Retourne l'utilisateur local à jour (ou l'existant si aucun changement /
 * erreur), ou null si l'utilisateur local est introuvable.
 */
export async function syncLocalUserFromDughu(
  localUserId: string,
  dughuUserId: string,
  fallbackProfile?: Record<string, any> | null
): Promise<any> {
  lastSyncAt.set(localUserId, Date.now())
  if (!dughu.enabled || !localUserId || !dughuUserId) return null

  const localUser = await prisma.user
    .findUnique({ where: { id: localUserId } })
    .catch(() => null)
  if (!localUser) return null

  // Profil frais depuis Dughu ; on ne synchronise avatar/cover que si la
  // donnée est fraîche (le profil de repli issu du login peut les omettre).
  let profile: any = null
  try {
    const raw = await dughuApi.getUser(dughuUserId, "0")
    profile = raw?.user ?? raw?.data ?? raw?.profile ?? raw?.result ?? raw ?? null
  } catch (err) {
    console.error("DUGHU SYNC FETCH ERROR:", err)
  }

  if (!profile) {
    // Repli partiel (API injoignable) : champs texte uniquement, jamais
    // avatar/cover, et seulement si un profil de login a été fourni.
    if (fallbackProfile) {
      const u = normalizeUser(fallbackProfile)
      if (u) {
        const data = buildTextPatch(localUser, u)
        if (Object.keys(data).length > 0) {
          const updated = await prisma.user
            .update({ where: { id: localUserId }, data })
            .catch((e: unknown) => {
              console.error("DUGHU SYNC UPDATE ERROR:", e)
              return null
            })
          return updated || localUser
        }
      }
    }
    return localUser
  }

  const u = normalizeUser(profile)
  if (!u) return localUser

  const data = buildTextPatch(localUser, u)

  // username/slug : uniquement si libres côté local (unicité Prisma).
  const username = String(u.username || "")
  if (username && username !== localUser.username) {
    const owner = await prisma.user.findUnique({ where: { username } }).catch(() => null)
    const slugOwner = await prisma.user.findUnique({ where: { slug: username } }).catch(() => null)
    if ((!owner || owner.id === localUserId) && (!slugOwner || slugOwner.id === localUserId)) {
      data.username = username
      data.slug = username
    } else {
      console.warn(`DUGHU SYNC: username "${username}" déjà pris localement, conservé "${localUser.username}"`)
    }
  }

  // Avatar / cover : miroir strict (défauts compris) pour que l'accueil
  // affiche exactement ce que montre la page profil.
  const avatar = String(u.avatar || SYNC_DEFAULT_AVATAR)
  const cover = String(u.cover || SYNC_DEFAULT_COVER)
  if (avatar && localUser.avatar !== avatar) {
    data.avatar = avatar
    if (!localUser.image) data.image = avatar
  }
  if (cover && localUser.cover !== cover) {
    data.cover = cover
  }

  if (Object.keys(data).length === 0) return localUser

  const updated = await prisma.user
    .update({ where: { id: localUserId }, data })
    .catch((e: unknown) => {
      console.error("DUGHU SYNC UPDATE ERROR:", e)
      return null
    })
  return updated || localUser
}

/** Synchronisation résolvant l'ID Dughu depuis l'email/username local. */
export async function syncLocalUserByRef(localUserRef: LocalUserRef & { id: string }): Promise<any> {
  const dughuUserId = await resolveDughuUserId(localUserRef)
  if (!dughuUserId) return null
  return syncLocalUserFromDughu(localUserRef.id, dughuUserId, null)
}
