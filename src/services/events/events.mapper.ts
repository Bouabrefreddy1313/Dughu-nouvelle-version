/**
 * Mappers défensifs pour le domaine Événements de Dughu.
 */

import type {
  DughuEvent,
  EventOrganizer,
  EventsListResponse,
  EventDetailResponse,
  InvitedUser,
  EventInvitedListResponse,
} from "@/types/events/events.types"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

function normalizeImageUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return ""
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  const cleanPath = trimmed.replace(/^\/+/, "")
  return `https://dughuprod.s3.amazonaws.com/${cleanPath}`
}

function parseBoolean(val: unknown): boolean {
  return val === true || val === 1 || val === "1" || val === "true"
}

/**
 * Normalise un événement brut retourné par l'API backend.
 */
export function normalizeEvent(raw: unknown): DughuEvent {
  const item = asRecord(raw)
  const id = String(item.id || item.event_id || "")

  const name =
    typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : "Événement sans titre"

  const location =
    typeof item.location === "string"
      ? item.location
      : typeof item["event-locat"] === "string"
      ? (item["event-locat"] as string)
      : ""

  const description =
    typeof item.description === "string"
      ? item.description
      : typeof item["event-description"] === "string"
      ? (item["event-description"] as string)
      : ""

  const startDate = String(item.start_date || item["event-start-date"] || "")
  const startTime = String(item.start_time || item["event-start-time"] || "")
  const endDate = String(item.end_date || item["event-end-date"] || "")
  const endTime = String(item.end_time || item["event-end-time"] || "")

  const posterId = String(item.poster_id || item.user_id || "")
  const rawCover = item.coverPath || item.cover_path || item.cover || item.image || item.picture
  const resolvedCover = normalizeImageUrl(rawCover)
  const cover = resolvedCover
  const coverPath = resolvedCover

  const createdAt = String(item.created_at || "")
  const updatedAt = String(item.updated_at || "")

  // Calcul du statut passé si non renseigné
  let isPassed = parseBoolean(item.isPassed ?? item.is_passed)
  if (!isPassed && (endDate || startDate)) {
    try {
      const dateToCheck = endDate ? `${endDate}T${endTime || "23:59:59"}` : `${startDate}T${startTime || "23:59:59"}`
      const parsed = new Date(dateToCheck)
      if (!isNaN(parsed.getTime()) && parsed.getTime() < Date.now()) {
        isPassed = true
      }
    } catch {
      // Ignorer
    }
  }

  const isInterested = parseBoolean(item.isInterested ?? item.is_interested)
  const isGoing = parseBoolean(item.isGoing ?? item.is_going)

  // Organisateur
  const rawUser = asRecord(item.user || item.organizer || item.poster)
  const organizerName = String(
    `${rawUser.first_name || ""} ${rawUser.last_name || ""}`.trim() ||
      rawUser.name ||
      rawUser.username ||
      "Organisateur"
  )
  const organizerAvatar =
    normalizeImageUrl(
      rawUser.avatar || rawUser.profile_picture || rawUser.profile_photo_url || rawUser.image
    ) || "/images/avatar.png"

  const organizer: EventOrganizer = {
    id: String(rawUser.user_id || rawUser.id || posterId),
    name: organizerName,
    avatar: organizerAvatar,
    username: typeof rawUser.username === "string" ? rawUser.username : undefined,
  }

  const shareLink = typeof item.shareLink === "string" ? item.shareLink : undefined
  const shareFacebook = typeof item.sharefacebook === "string" ? item.sharefacebook : undefined
  const shareTwitter = typeof item.sharetwitter === "string" ? item.sharetwitter : undefined
  const shareLinkedin = typeof item.sharelinkedin === "string" ? item.sharelinkedin : undefined
  const shareWhatsapp = typeof item.sharewhatsapp === "string" ? item.sharewhatsapp : undefined

  return {
    id,
    name,
    location,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    posterId,
    cover,
    coverPath,
    createdAt,
    updatedAt,
    isPassed,
    isInterested,
    isGoing,
    organizer,
    shareLink,
    shareFacebook,
    shareTwitter,
    shareLinkedin,
    shareWhatsapp,
    interestedCount: typeof item.interested_count === "number" ? item.interested_count : undefined,
    goingCount: typeof item.going_count === "number" ? item.going_count : undefined,
  }
}

/**
 * Normalise la réponse de la liste des événements.
 */
export function normalizeEventsList(raw: unknown): EventsListResponse {
  const root = asRecord(raw)
  let list: unknown[] = []

  const resultObj = asRecord(root.result)
  const dataObj = asRecord(root.data)

  if (Array.isArray(raw)) {
    list = raw
  } else if (Array.isArray(resultObj.data)) {
    list = resultObj.data as unknown[]
  } else if (Array.isArray(root.result)) {
    list = root.result as unknown[]
  } else if (Array.isArray(dataObj.data)) {
    list = dataObj.data as unknown[]
  } else if (Array.isArray(root.data)) {
    list = root.data as unknown[]
  } else if (Array.isArray(root.events)) {
    list = root.events as unknown[]
  }

  const events = list
    .filter((it) => it !== null && typeof it === "object")
    .map(normalizeEvent)

  // Prioriser l'affichage des événements à venir (!isPassed) en tête de liste
  events.sort((a, b) => {
    // 1. Les événements à venir passent avant les événements passés
    if (!a.isPassed && b.isPassed) return -1
    if (a.isPassed && !b.isPassed) return 1

    // 2. Pour les événements à venir : les plus proches chronologiquement en premier (croissant)
    if (!a.isPassed && !b.isPassed) {
      const timeA = new Date(`${a.startDate}T${a.startTime || "00:00:00"}`).getTime() || 0
      const timeB = new Date(`${b.startDate}T${b.startTime || "00:00:00"}`).getTime() || 0
      return timeA - timeB
    }

    // 3. Pour les événements passés : les plus récents d'abord (décroissant)
    const timeA = new Date(`${a.startDate}T${a.startTime || "00:00:00"}`).getTime() || 0
    const timeB = new Date(`${b.startDate}T${b.startTime || "00:00:00"}`).getTime() || 0
    return timeB - timeA
  })

  const total = typeof resultObj.total === "number" ? resultObj.total : events.length
  const currentPage = typeof resultObj.current_page === "number" ? resultObj.current_page : 1
  const lastPage = typeof resultObj.last_page === "number" ? resultObj.last_page : 1

  return {
    success: typeof root.success === "boolean" ? root.success : true,
    events,
    total,
    currentPage,
    lastPage,
    message: typeof root.message === "string" ? root.message : undefined,
  }
}

/**
 * Normalise le détail d'un événement.
 */
export function normalizeEventDetail(raw: unknown): EventDetailResponse {
  const root = asRecord(raw)

  const candidate =
    root.result ||
    root.event ||
    root.data ||
    (root.id ? root : null)

  if (!candidate || typeof candidate !== "object") {
    return {
      success: false,
      event: null,
      message: typeof root.message === "string" ? root.message : "Événement introuvable.",
    }
  }

  return {
    success: typeof root.success === "boolean" ? root.success : true,
    event: normalizeEvent(candidate),
    message: typeof root.message === "string" ? root.message : undefined,
  }
}

/**
 * Normalise la liste des amis invités (POST /listInvitedEvents).
 */
export function normalizeInvitedUsers(raw: unknown): EventInvitedListResponse {
  const root = asRecord(raw)
  let list: unknown[] = []

  const resultObj = asRecord(root.result)
  if (Array.isArray(resultObj.data)) {
    list = resultObj.data as unknown[]
  } else if (Array.isArray(root.result)) {
    list = root.result as unknown[]
  } else if (Array.isArray(root.data)) {
    list = root.data as unknown[]
  }

  const invitedUsers: InvitedUser[] = list
    .filter((it) => it !== null && typeof it === "object")
    .map((it) => {
      const rec = asRecord(it)
      const user = asRecord(rec.user || rec)
      const name = String(
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.name ||
          user.username ||
          "Utilisateur"
      )
      const avatar = normalizeImageUrl(
        user.avatar || user.profile_picture || user.profile_photo_url || user.image
      )
      return {
        id: String(user.user_id || user.id || ""),
        name,
        avatar,
        username: typeof user.username === "string" ? user.username : undefined,
      }
    })

  return {
    success: typeof root.success === "boolean" ? root.success : true,
    invitedUsers,
    message: typeof root.message === "string" ? root.message : undefined,
  }
}
