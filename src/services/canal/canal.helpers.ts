/**
 * Helpers du domaine Canal.
 *
 * - Builders de FormData pour les uploads multipart (canal, message).
 * - Normalisation des booléens/statuts (string vs number vs boolean).
 * - Construction de query params pour la pagination.
 * - Wrapper d'erreur réutilisable (pattern identique pages.service.ts).
 *
 * Aucun import React, aucun toast, aucun accès aux instances Axios ici.
 */

import { ApiError } from "@/lib/api/api-error"
import type { CanalFormValues, CanalMessagePayload } from "@/types/canal/canal.types"

/* ─────────────────────────────── Erreurs ───────────────────────────────── */

/**
 * Wraps une erreur inconnue en ApiError avec un message de fallback français.
 * Pattern identique à `toServiceApiError` dans pages.service.ts.
 */
export function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/* ─────────────────────────────── Normalisation ─────────────────────────── */

/**
 * Normalise un booléen vers 0 / 1 (attendu par certains endpoints Dughu).
 * Ex. : `is_active`, `accept`.
 */
export function normalizeBool(value: boolean): number {
  return value ? 1 : 0
}

/**
 * Normalise une valeur quelconque en string sûre.
 * Si la valeur est undefined ou null, retourne le fallback.
 */
export function normalizeString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback
  return String(value)
}

/* ─────────────────────────────── Pagination ────────────────────────────── */

/**
 * Construit les query params de pagination.
 * Ajoute uniquement `page` si > 1 (convention Dughu : page 1 implicite).
 */
export function buildPaginationParams(
  page: number,
  extra: Record<string, string | number | undefined> = {}
): Record<string, string | number | undefined> {
  return {
    ...(page > 1 ? { page } : {}),
    ...extra,
  }
}

/* ─────────────────────────────── FormData builders ─────────────────────── */

/**
 * Construit un FormData multipart pour créer ou modifier un canal.
 * POST /canal — champs : user_id, canal_id?, name, description, category_id,
 * type, is_active, logo (file)?, cover (file)?
 */
export function buildCanalFormData(userId: string, values: CanalFormValues): FormData {
  const fd = new FormData()
  fd.append("user_id", userId)
  if (values.canalId) fd.append("canal_id", values.canalId)
  fd.append("name", values.name)
  fd.append("description", values.description)
  fd.append("category_id", values.categoryId)
  fd.append("type", values.type)
  // is_active : l'API attend un string "0" ou "1"
  fd.append("is_active", String(normalizeBool(values.isActive)))
  if (values.logo instanceof File) fd.append("logo", values.logo)
  if (values.cover instanceof File) fd.append("cover", values.cover)
  return fd
}

/**
 * Construit un FormData multipart pour envoyer ou modifier un message.
 * POST /sendCanalMessage/:canal_id et POST /updateCanalMessage/:message_id.
 * Champs : user_id, text?, media (file)?
 */
export function buildMessageFormData(payload: CanalMessagePayload): FormData {
  const fd = new FormData()
  fd.append("user_id", payload.userId)
  if (payload.text) fd.append("text", payload.text)
  if (payload.media instanceof File) fd.append("media", payload.media)
  return fd
}
