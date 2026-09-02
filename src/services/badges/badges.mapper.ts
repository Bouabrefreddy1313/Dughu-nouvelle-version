/**
 * Mappeur du domaine Badges — normalise les réponses BRUTES de l'API Dughu
 * (`GET /badge` et `GET /badge/{userId}`) en modèles métier. Vivant côté
 * serveur (et réutilisé par les tests) ; jamais d'appel réseau ici.
 *
 * Normalisation défensive : la forme exacte de la réponse Dughu n'étant pas
 * contractuelle, plusieurs variantes de champs sont explorées.
 */

import type { BadgeItem } from "@/types/points/points.types"

type UnknownRecord = Record<string, unknown>

export function badgeRecord(value: unknown): UnknownRecord {
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

/** Extrait un tableau de badges depuis les enveloppes possibles d'une réponse. */
function toBadgeArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.filter((e): e is UnknownRecord => e !== null && typeof e === "object")
  }
  const obj = badgeRecord(value)
  for (const key of ["result", "data", "badges", "list", "items", "results", "user_badges"]) {
    const nested = obj[key]
    if (Array.isArray(nested)) {
      return (nested as unknown[]).filter(
        (e): e is UnknownRecord => e !== null && typeof e === "object"
      )
    }
  }
  // Cas imbriqué : { result: { user_id: ..., badges: [...] } }.
  const nestedResult = badgeRecord(obj.result ?? obj.data)
  for (const key of ["badges", "user_badges", "items", "list"]) {
    const deep = nestedResult[key]
    if (Array.isArray(deep)) {
      return (deep as unknown[]).filter(
        (e): e is UnknownRecord => e !== null && typeof e === "object"
      )
    }
  }
  return []
}

/** Normalise un badge brut → BadgeItem. */
export function normalizeBadge(raw: unknown): BadgeItem | null {
  const obj = badgeRecord(raw)
  // Certains retours imbriquent le badge sous `badge` / `data`.
  const inner = badgeRecord(obj.badge ?? obj.data)
  const source = Object.keys(inner).length > 0 ? inner : obj

  const id = firstString(source.id, source.ID, source.badge_id, source.badgeId)
  const name = firstString(source.name, source.title, source.label, source.libelle, source.libellé)
  if (!id && !name) return null

  const icon = firstString(source.icon, source.emoji, source.image, source.logo, source.photo, source.url)

  return {
    id: id || name,
    name: name || "Badge Dughu",
    category: firstString(source.category, source.categorie, source.catégorie, source.type).toLowerCase(),
    description: firstString(source.description, source.desc, source.subtitle, source.text),
    icon,
    earnedAt: firstString(source.earned_at, source.earnedAt, source.obtained_at, source.created_at, source.createdAt, source.date) || null,
  }
}

/** Normalise une liste brute de badges. */
export function normalizeBadgeList(raw: unknown): BadgeItem[] {
  return toBadgeArray(raw)
    .map((badge) => normalizeBadge(badge))
    .filter((b): b is BadgeItem => b !== null)
}
