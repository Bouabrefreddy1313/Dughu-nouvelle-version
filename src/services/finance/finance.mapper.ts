/**
 * Mappers défensifs pour le domaine Finance de Dughu.
 * Transforme les réponses de l'API externe en modèles fiables pour le frontend.
 */

import type {
  FinanceAuthor,
  FinanceCampaign,
  FinanceListResponse,
  FinanceDetailResponse,
} from "@/types/finance/finance.types"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return isNaN(value) ? fallback : value
  if (typeof value === "string") {
    const cleaned = value.replace(/[\s,]/g, "")
    const parsed = Number(cleaned)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

function formatDate(dateStr: unknown, timeStr?: unknown): string {
  if (typeof timeStr === "string" && timeStr.trim()) {
    return timeStr.trim()
  }
  if (!dateStr || typeof dateStr !== "string") return ""
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d)
  } catch {
    return String(dateStr)
  }
}

function normalizeImageUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return ""
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed
  }
  return `/${trimmed}`
}

/**
 * Normalise un enregistrement brut d'une campagne de financement.
 */
export function normalizeFinanceCampaign(raw: unknown): FinanceCampaign {
  const item = asRecord(raw)
  const id = String(item.id || item.finance_id || item.funding_id || "")

  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : "Demande de financement"

  const description =
    typeof item.description === "string"
      ? item.description
      : typeof item.desc === "string"
      ? item.desc
      : typeof item.about === "string"
      ? item.about
      : ""

  // Montant cible demandé en FCFA (champs amount dans l'API backend)
  const amount = parseNumber(item.amount ?? item.goal ?? item.target_amount ?? item.montant)

  // Objectif en points (champs points dans l'API backend)
  const targetPoints = parseNumber(
    item.target_points ?? item.points_target ?? item.points_goal ?? item.goal_points ?? item.points
  )

  // Donateurs / dons associés (l'API backend renvoie "donnateur" ou "donations")
  const rawDonnateur = asRecord(item.donnateur ?? item.donations ?? item.dons)
  const donnateurList = Array.isArray(rawDonnateur.data)
    ? (rawDonnateur.data as unknown[])
    : Array.isArray(item.donations)
    ? (item.donations as unknown[])
    : []

  // Nombre de dons
  let donationsCount = parseNumber(
    item.donations_count ??
      item.total_donations ??
      item.dons_count ??
      rawDonnateur.total ??
      donnateurList.length
  )

  // Somme des montants et points collectés depuis la liste des dons si présents
  let collectedAmount = parseNumber(
    item.collected_amount ?? item.raised_amount ?? item.amount_raised ?? item.montant_collecte ?? item.collected
  )
  let collectedPoints = parseNumber(
    item.collected_points ?? item.points_collected ?? item.points_raised
  )

  if (donnateurList.length > 0) {
    let sumAmount = 0
    let sumPoints = 0
    for (const d of donnateurList) {
      const rec = asRecord(d)
      sumAmount += parseNumber(rec.amount ?? rec.montant, 0)
      sumPoints += parseNumber(rec.points ?? rec.pts, 0)
    }
    if (collectedAmount === 0 && sumAmount > 0) collectedAmount = sumAmount
    if (collectedPoints === 0 && sumPoints > 0) collectedPoints = sumPoints
  }

  const image = normalizeImageUrl(item.image ?? item.cover_image ?? item.photo ?? item.picture)
  const createdAt = formatDate(item.created_at ?? item.date ?? item.createdAt, item.time)

  // Auteur
  const rawAuthor = asRecord(item.user ?? item.author ?? item.creator ?? item.owner)
  const userId = String(item.user_id ?? item.userId ?? rawAuthor.user_id ?? rawAuthor.id ?? "")
  const authorName = String(
    `${rawAuthor.first_name || ""} ${rawAuthor.last_name || ""}`.trim() ||
      rawAuthor.name ||
      rawAuthor.username ||
      "Membre Dughu"
  )
  const authorAvatar = normalizeImageUrl(
    rawAuthor.avatar ?? rawAuthor.profile_picture ?? rawAuthor.profile_photo_url ?? rawAuthor.image
  )

  const author: FinanceAuthor = {
    id: userId || String(rawAuthor.user_id || rawAuthor.id || ""),
    name: authorName,
    avatar: authorAvatar,
    username: typeof rawAuthor.username === "string" ? rawAuthor.username : undefined,
  }

  // Calcul du pourcentage de progression
  // Si montant objectif fixé > 0, on se base sur le montant en FCFA (ou points si montant est 0)
  let progressPercent: number | null = null
  let isGoalReached = false

  if (amount > 0) {
    const pct = (collectedAmount / amount) * 100
    progressPercent = Math.min(Math.max(pct, 0), 100)
    isGoalReached = collectedAmount >= amount
  } else if (targetPoints > 0) {
    const pct = (collectedPoints / targetPoints) * 100
    progressPercent = Math.min(Math.max(pct, 0), 100)
    isGoalReached = collectedPoints >= targetPoints
  } else {
    // Si objectif/objectif total valent 0, considérer qu'il n'y a pas d'objectif fixé
    progressPercent = null
    isGoalReached = false
  }

  return {
    id,
    title,
    description,
    amount,
    collectedAmount,
    targetPoints,
    collectedPoints,
    donationsCount,
    image,
    createdAt,
    userId,
    author,
    progressPercent,
    isGoalReached,
  }
}

/**
 * Normalise la réponse d'une liste de financements.
 * Prend en compte la structure réelle de l'API Dughu : root.result.data
 */
export function normalizeFinanceList(raw: unknown): FinanceListResponse {
  const root = asRecord(raw)
  let list: unknown[] = []

  const resultObj = asRecord(root.result)
  const dataObj = asRecord(root.data)

  if (Array.isArray(raw)) {
    list = raw
  } else if (Array.isArray(resultObj.data)) {
    // Structure standard Dughu : { result: { data: [...] } }
    list = resultObj.data as unknown[]
  } else if (Array.isArray(root.result)) {
    list = root.result as unknown[]
  } else if (Array.isArray(dataObj.data)) {
    list = dataObj.data as unknown[]
  } else if (Array.isArray(root.data)) {
    list = root.data as unknown[]
  } else if (Array.isArray(root.finances)) {
    list = root.finances as unknown[]
  } else if (Array.isArray(root.fundings)) {
    list = root.fundings as unknown[]
  }

  const finances = list
    .filter((it) => it !== null && typeof it === "object")
    .map(normalizeFinanceCampaign)

  return {
    success: typeof root.success === "boolean" ? root.success : true,
    finances,
    message: typeof root.message === "string" ? root.message : undefined,
  }
}

/**
 * Normalise la réponse du détail d'un financement.
 * Prend en compte la structure réelle de l'API Dughu : root.result
 */
export function normalizeFinanceDetail(raw: unknown): FinanceDetailResponse {
  const root = asRecord(raw)

  const candidate =
    root.result ||
    root.finance ||
    root.funding ||
    root.data ||
    (root.id ? root : null)

  if (!candidate || typeof candidate !== "object") {
    return {
      success: false,
      finance: null,
      message: typeof root.message === "string" ? root.message : "Demande de financement introuvable.",
    }
  }

  return {
    success: typeof root.success === "boolean" ? root.success : true,
    finance: normalizeFinanceCampaign(candidate),
    message: typeof root.message === "string" ? root.message : undefined,
  }
}
