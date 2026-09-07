import type {
  AffiliateDetails,
  AffiliatePagination,
  AffiliateUser,
} from "@/types/affiliate/affiliate.types"

type UnknownRecord = Record<string, unknown>

export function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

/** Formate la date d'inscription en texte lisible français (ex : 30 juin 2025 ou Juin 2025) */
export function formatRegisterDate(rawUser: UnknownRecord): string | null {
  const registered = firstString(rawUser.registered)
  const createdAt = firstString(rawUser.created_at, rawUser.createdAt)
  const joined = rawUser.joined

  if (createdAt) {
    try {
      const d = new Date(createdAt)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      }
    } catch {}
  }

  if (typeof joined === "number" && joined > 0) {
    try {
      const d = new Date(joined * 1000)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      }
    } catch {}
  }

  if (registered) {
    // Si c'est un format mois/année ex "6/2025"
    if (/^\d{1,2}\/\d{4}$/.test(registered)) {
      const [m, y] = registered.split("/").map(Number)
      const d = new Date(y, m - 1, 1)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      }
    }
    return registered
  }

  return null
}

/**
 * Normalise les détails d'affiliation (lien de parrainage et profil)
 * issus de GET /getSpecificUser/{userId}/{userId}
 */
export function normalizeAffiliateDetails(raw: unknown, fallbackUserId = ""): AffiliateDetails {
  const root = record(raw)
  const user = record(root.result ?? root.data ?? root.user ?? root)

  const id = firstString(user.user_id, user.id, fallbackUserId)
  const firstName = firstString(user.first_name, user.prenom)
  const lastName = firstString(user.last_name, user.nom)
  const username = firstString(user.username) || null
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim()
  const name = combinedName || firstString(user.name, username, "Utilisateur")

  const avatar =
    firstString(user.avatar, user.profile_photo_url, user.image, user.photo) ||
    "/images/avatar.png"

  const shareLink = firstString(
    user.shareLink,
    user.share_link,
    user.referral_link,
    user.referralLink
  )

  return {
    userId: id,
    name,
    username,
    avatar,
    shareLink,
  }
}

/**
 * Normalise un utilisateur inscrit via parrainage
 */
export function normalizeAffiliateUser(raw: unknown): AffiliateUser | null {
  const obj = record(raw)
  if (Object.keys(obj).length === 0) return null

  const id = firstString(obj.user_id, obj.id, obj.userId)
  if (!id) return null

  const firstName = firstString(obj.first_name, obj.prenom)
  const lastName = firstString(obj.last_name, obj.nom)
  const username = firstString(obj.username) || null
  const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim()
  const name = combinedName || firstString(obj.name, username, "Utilisateur")

  const avatar =
    firstString(obj.avatar, obj.profile_photo_url, obj.image, obj.photo) ||
    "/images/avatar.png"

  const registeredDate = formatRegisterDate(obj)
  const rawDate = firstString(obj.created_at, obj.registered) || null

  return {
    id,
    name,
    username,
    avatar,
    registeredDate,
    rawDate,
  }
}

/**
 * Normalise la réponse de GET /getAffiliateUsers/{userId}?page={page}
 */
export function normalizeAffiliateUsers(raw: unknown): {
  users: AffiliateUser[]
  pagination: AffiliatePagination
} {
  const root = record(raw)
  const result = root.result ?? root.data ?? root

  // Si c'est un tableau direct (cas de l'état vide : "result": [])
  if (Array.isArray(result)) {
    const users = result
      .map((item) => normalizeAffiliateUser(item))
      .filter((u): u is AffiliateUser => u !== null)
    return {
      users,
      pagination: {
        currentPage: 1,
        lastPage: 1,
        total: users.length,
        perPage: 10,
      },
    }
  }

  // Cas pagination Laravel : "result": { current_page: 1, data: [...], total: 10, ... }
  const paginator = record(result)
  const dataList = Array.isArray(paginator.data) ? paginator.data : []
  const users = dataList
    .map((item) => normalizeAffiliateUser(item))
    .filter((u): u is AffiliateUser => u !== null)

  const currentPage = Number(paginator.current_page) || 1
  const lastPage = Math.max(Number(paginator.last_page) || 1, currentPage)
  const total = Number.isFinite(Number(paginator.total)) ? Number(paginator.total) : users.length
  const perPage = Number(paginator.per_page) || 10

  return {
    users,
    pagination: {
      currentPage,
      lastPage,
      total,
      perPage,
    },
  }
}
