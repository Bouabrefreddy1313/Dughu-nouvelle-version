/**
 * Mappeur du domaine Retrouvailles — normalise les réponses BRUTES de l'API
 * Dughu (`GET /retrouvailles`) en modèles métier. Vivant côté serveur (et
 * réutilisé par les tests) ; jamais d'appel réseau ici.
 */

import type {
  RetrouvaillePerson,
  RetrouvaillesSuggestionGroup,
  RetrouvaillesTab,
} from "@/types/retrouvailles/retrouvailles.types"

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
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

function readNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Extrait un tableau d'utilisateurs depuis une valeur brute. */
function toUserArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    const users: UnknownRecord[] = []
    for (const entry of value) {
      if (entry && typeof entry === "object") users.push(record(entry))
    }
    return users
  }
  const obj = record(value)
  // formes possibles : { users: [...] }, { data: [...] }, { user: {...} }
  if (Array.isArray(obj.users)) return toUserArray(obj.users)
  if (Array.isArray(obj.data)) return toUserArray(obj.data)
  if (obj.user && typeof obj.user === "object") return [record(obj.user)]
  return []
}

/** Normalise un objet utilisateur Dughu → RetrouvaillePerson. */
export function normalizeRetrouvaillePerson(raw: unknown, fallbackLabel?: string): RetrouvaillePerson | null {
  const obj = record(raw)
  const id = firstString(obj.user_id, obj.id, obj.userId, obj.ID)
  if (!id) return null

  const firstName = firstString(obj.first_name, obj.firstName)
  const lastName = firstString(obj.last_name, obj.lastName, obj.name)
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Utilisateur Dughu"

  const affinityLabel = firstString(obj.affinity_label, obj.affinityLabel) || fallbackLabel || ""
  const affinityReasons = Array.isArray(obj.affinity_reasons)
    ? obj.affinity_reasons.filter((r): r is string => typeof r === "string")
    : []
  const affinityScore = readNumber(obj.affinity_score)
  const mutualFriendsCount = readNumber(obj.mutual_friends_count)

  return {
    id,
    name,
    username: firstString(obj.username) || null,
    avatar: firstString(obj.avatar, obj.profile_photo_url, obj.profilePhotoUrl) || null,
    cover: firstString(obj.cover, obj.cover_url) || null,
    school: firstString(obj.school, obj.ecole) || null,
    city: firstString(obj.city, obj.ville, obj.address) || null,
    affinity:
      affinityLabel || affinityReasons.length > 0 || affinityScore > 0
        ? { label: affinityLabel, reasons: affinityReasons, score: affinityScore, mutualFriendsCount }
        : null,
  }
}

/**
 * Normalise la réponse de l'API Dughu pour l'onglet Suggestions.
 * `data` = objet avec des blocs (user_mutual_friends, friends, user_school…).
 * Les clés sont transformées en libellés lisibles.
 */
export function normalizeSuggestionGroups(raw: unknown): RetrouvaillesSuggestionGroup[] {
  const obj = record(raw)
  const data = record(obj.data)

  const LABELS: Record<string, string> = {
    friends: "Amis Dughu",
    user_mutual_friends: "Amis en commun",
    user_school: "Même école",
    user_entreprise: "Même entreprise",
    user_address: "Même ville",
    user_domaine: "Même domaine d'activité",
    user_centres_interet: "Centres d'intérêt",
    user_competences: "Compétences",
    user_lieux_frequentes: "Lieux fréquentés",
  }

  const groups: RetrouvaillesSuggestionGroup[] = []
  for (const [key, value] of Object.entries(data)) {
    const users = toUserArray(value)
    if (users.length === 0) continue
    const label = LABELS[key] || "Suggestions"
    const persons = users
      .map((user) => normalizeRetrouvaillePerson(user, label))
      .filter((p): p is RetrouvaillePerson => p !== null)
    if (persons.length > 0) groups.push({ label, persons })
  }
  return groups
}

/** Normalise une liste plate (onglet Contacts : data = tableau). */
export function normalizeRetrouvaillePersons(raw: unknown, fallbackLabel?: string): RetrouvaillePerson[] {
  const users = toUserArray(record(raw).data ?? raw)
  return users
    .map((user) => normalizeRetrouvaillePerson(user, fallbackLabel))
    .filter((p): p is RetrouvaillePerson => p !== null)
}

/** Normalise la réponse pour l'onglet Anciens (data.users = tableau de tableaux). */
export function normalizeAlumniPersons(raw: unknown): RetrouvaillePerson[] {
  const obj = record(raw)
  const data = record(obj.data)
  const users = Array.isArray(data.users) ? data.users : []
  return users
    .flatMap((entry) => toUserArray(entry))
    .map((user) => normalizeRetrouvaillePerson(user))
    .filter((p): p is RetrouvaillePerson => p !== null)
}

/** Extrait l'onglet renvoyé par l'API (pour re-synchroniser l'URL). */
export function normalizeTab(raw: unknown): RetrouvaillesTab {
  return firstString(raw && typeof raw === "object" ? (raw as UnknownRecord).tab : "") as RetrouvaillesTab
}