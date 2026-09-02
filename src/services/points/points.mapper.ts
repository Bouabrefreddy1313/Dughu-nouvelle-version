/**
 * Mappeur du domaine Points — normalise la réponse BRUTE de l'API Dughu
 * (`GET /pointsHistory`) en modèle métier. Vivant côté serveur (et réutilisé
 * par les tests) ; jamais d'appel réseau ici.
 *
 * La forme exacte de la réponse Dughu n'étant pas contractuelle, la
 * normalisation est défensive : plusieurs variantes de champs sont explorées
 * (comme dans retrouvailles.mapper.ts).
 */

import type {
  PointsHistoryEntry,
  PointsHistoryEntryType,
} from "@/types/points/points.types"

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

/** Détermine le sens d'un mouvement (gain ou perte) de façon défensive. */
function resolveType(raw: UnknownRecord, amount: number): PointsHistoryEntryType {
  const type = firstString(raw.type, raw.kind, raw.movement, raw.sens).toLowerCase()
  if (["perte", "loss", "debit", "débit", "debit_points", "penalite", "pénalité", "penalty", "negative", "minus"].includes(type)) {
    return "perte"
  }
  if (["gain", "credit", "crédit", "bonus", "positive", "plus", "earn", "earning"].includes(type)) {
    return "gain"
  }
  // Dernier recours : le signe du montant brut.
  return amount < 0 ? "perte" : "gain"
}

/** Normalise une entrée brute de l'historique. */
export function normalizePointsHistoryEntry(raw: unknown, index: number): PointsHistoryEntry | null {
  const obj = record(raw)
  if (Object.keys(obj).length === 0) return null

  const rawAmount = Number(obj.points ?? obj.value ?? obj.amount ?? obj.montant ?? obj.solde ?? 0)
  const amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0
  const type = resolveType(obj, rawAmount)

  const description = firstString(
    obj.description,
    obj.label,
    obj.libelle,
    obj.libellé,
    obj.title,
    obj.reason,
    obj.motif,
    obj.activity,
    obj.activite
  )

  const id = firstString(obj.id, obj.ID, obj.entry_id, obj.history_id)
  const date = firstString(obj.date, obj.created_at, obj.createdAt, obj.datetime, obj.timestamp)

  return {
    id: id || `entry-${index}`,
    date: date || null,
    type,
    description: description || "Activité sur Dughu",
    points: amount,
  }
}

/** Extrait un tableau depuis les enveloppes possibles d'une réponse Dughu. */
function toEntryArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.filter((e): e is UnknownRecord => e !== null && typeof e === "object")
  }
  const obj = record(value)

  // Format Laravel paginator de /pointsHistory/{userId} :
  // { recordsTotal, recordsFiltered, result: { current_page, data: [...] } }
  const paginator = record(obj.result ?? obj.data)
  const paginatorData = paginator.data
  if (Array.isArray(paginatorData)) {
    return paginatorData.filter((e): e is UnknownRecord => e !== null && typeof e === "object")
  }

  for (const key of ["history", "entries", "points", "list", "items", "results"]) {
    if (Array.isArray(obj[key])) {
      return (obj[key] as unknown[]).filter(
        (e): e is UnknownRecord => e !== null && typeof e === "object"
      )
    }
  }
  return []
}

/** Méta de pagination normalisée (repli : une seule page de 10). */
export function normalizePointsHistoryMeta(raw: unknown, entryCount: number) {
  const obj = record(raw)
  const paginator = record(obj.result ?? obj.data)

  // recordsFiltered tient compte de la recherche serveur s'il est fourni.
  const filtered = Number(obj.recordsFiltered)
  const resultTotal = Number(paginator.total)
  const total =
    Number.isFinite(filtered) && filtered >= 0
      ? filtered
      : Number.isFinite(resultTotal) && resultTotal >= 0
        ? resultTotal
        : entryCount

  const perPage = Number(paginator.per_page)
  const currentPage = Number(paginator.current_page)
  const lastPage = Number(paginator.last_page)

  return {
    total,
    currentPage: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : 10,
  }
}

/**
 * Normalise la réponse brute de l'API Dughu `GET /pointsHistory/{userId}`.
 * Retourne les mouvements et la méta de pagination.
 */
export function normalizePointsHistory(raw: unknown): {
  entries: PointsHistoryEntry[]
  meta: ReturnType<typeof normalizePointsHistoryMeta>
} {
  const entries = toEntryArray(raw)
    .map((entry, index) => normalizePointsHistoryEntry(entry, index))
    .filter((e): e is PointsHistoryEntry => e !== null)
  return { entries, meta: normalizePointsHistoryMeta(raw, entries.length) }
}
