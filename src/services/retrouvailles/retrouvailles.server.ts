/**
 * Service SERVEUR du domaine Retrouvailles — utilisé UNIQUEMENT par le Route
 * Handler /api/retrouvailles. Il appelle l'API Dughu `GET /retrouvailles` avec
 * l'instance Axios serveur (jamais de secret ni de token exposé au navigateur),
 * normalise les réponses via le mappeur et ne retourne que des modèles métier.
 */

import { dughuServerGet } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import {
  normalizeAlumniPersons,
  normalizeRetrouvaillePersons,
  normalizeSuggestionGroups,
  normalizeTab,
} from "@/services/retrouvailles/retrouvailles.mapper"
import type {
  RetrouvaillePerson,
  RetrouvaillesResponse,
  RetrouvaillesTab,
} from "@/types/retrouvailles/retrouvailles.types"

/**
 * Nombre maximal de numéros transmis à l'API Dughu en UNE requête. Sentinelle
 * anti « 431 Request Header Fields Too Large » : plus la query string est
 * longue, plus le reverse proxy (nginx) risque de la rejeter. Un lot de 100
 * reste très confortable (l'API accepte ≥ 500 en direct).
 */
export const MAX_CONTACTS_PER_REQUEST = 100

type RetrouvaillesParams =
  | { tab: "suggestions"; userId: string }
  | { tab: "contacts"; userId: string; phoneNumbers: string[] }
  | { tab: "anciens"; userId: string; ville?: string; school?: string; promotionStart?: string; promotionEnd?: string }

function toSearchParams(params: RetrouvaillesParams): Record<string, string | number | undefined> {
  const p: Record<string, string | number | undefined> = {
    tab: params.tab,
    user_id: params.userId,
  }
  if (params.tab === "contacts") {
    // L'API Dughu attend `phone_numbers` sous forme de tableau JSON.
    p.phone_numbers = JSON.stringify(params.phoneNumbers)
  }
  if (params.tab === "anciens") {
    if (params.ville) p.ville = params.ville
    if (params.school) p.school = params.school
    if (params.promotionStart) p.promotion_start = params.promotionStart
    if (params.promotionEnd) p.promotion_end = params.promotionEnd
  }
  return p
}

/** Données de la réponse brute Dughu (structure stable au niveau racine). */
interface DughuRetrouvaillesData {
  success?: unknown
  tab?: unknown
  data?: unknown
}

/** Appelle l'API Dughu et jette une ApiError cohérente en cas d'échec. */
async function requestDughu(params: RetrouvaillesParams): Promise<DughuRetrouvaillesData> {
  if (!params.userId) {
    return { success: true, tab: params.tab, data: {} }
  }
  try {
    const raw = await dughuServerGet<DughuRetrouvaillesData>("retrouvailles", toSearchParams(params), { retry: true })
    const obj = (raw ?? {}) as DughuRetrouvaillesData
    if (obj?.success === false) {
      throw new ApiError("Impossible de charger les retrouvailles.", { status: 500 })
    }
    return obj
  } catch (error) {
    throw new ApiError("Impossible de charger les retrouvailles.", { cause: error })
  }
}

/** Normalise la réponse brute d'un appel unique en modèle métier. */
function normalizeResponse(raw: DughuRetrouvaillesData, expected: RetrouvaillesTab): RetrouvaillesResponse {
  const tab: RetrouvaillesTab = normalizeTab(raw) || expected
  if (tab === "suggestions") {
    return { success: true, tab, groups: normalizeSuggestionGroups(raw) }
  }
  if (tab === "anciens") {
    return { success: true, tab, persons: normalizeAlumniPersons(raw) }
  }
  return { success: true, tab, persons: normalizeRetrouvaillePersons(raw) }
}

/**
 * Interroge l'API Dughu `/retrouvailles` et normalise la réponse selon l'onglet.
 * Lecture idempotente : retry limité possible.
 */
export async function fetchRetrouvailles(params: RetrouvaillesParams): Promise<RetrouvaillesResponse> {
  return normalizeResponse(await requestDughu(params), params.tab)
}

/**
 * Onglet Contacts — traite les numéros par LOTS (MAX_CONTACTS_PER_REQUEST) pour
 * ne jamais surcharger la query string, fusionne les résultats et déduplique
 * par id. Les lots sont traités par groupes de CONCURRENCE pour raccourcir le
 * temps total (un import volumineux de un seul tenant serait trop lent).
 */
export async function fetchRetrouvaillesContacts(
  userId: string,
  phoneNumbers: string[]
): Promise<RetrouvaillesResponse> {
  const unique = [...new Set(phoneNumbers.map((n) => String(n).trim()).filter(Boolean))]
  if (!userId || unique.length === 0) {
    return { success: true, tab: "contacts", persons: [] }
  }

  const batches: string[][] = []
  for (let i = 0; i < unique.length; i += MAX_CONTACTS_PER_REQUEST) {
    batches.push(unique.slice(i, i + MAX_CONTACTS_PER_REQUEST))
  }

  // Concurrence modérée : on ne lance pas toutes les requêtes en même temps
  // (risque de surcharge API), mais 3 en parallèle suffisent à rendre le temps
  // total raisonnable pour un gros fichier VCF.
  const CONCURRENCY = 3
  const seen = new Set<string>()
  const merged: RetrouvaillePerson[] = []
  const storePersons = (response: RetrouvaillesResponse) => {
    for (const person of response.persons ?? []) {
      if (!seen.has(person.id)) {
        seen.add(person.id)
        merged.push(person)
      }
    }
  }

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const group = batches.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      group.map(async (batch) =>
        normalizeResponse(
          await requestDughu({ tab: "contacts", userId, phoneNumbers: batch }),
          "contacts"
        )
      )
    )
    for (const response of results) storePersons(response)
  }

  return { success: true, tab: "contacts", persons: merged }
}