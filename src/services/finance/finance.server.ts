/**
 * Service SERVEUR du domaine Finance — utilisé UNIQUEMENT par les Route Handlers Next.js
 * (/api/finance/*). Il appelle l'API Dughu avec l'instance Axios serveur protégée,
 * normalise les réponses et renvoie des modèles typés et sécurisés.
 */

import {
  dughuServerGet,
  dughuServerMultipart,
  dughuServerDelete,
} from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import {
  normalizeFinanceList,
  normalizeFinanceDetail,
} from "@/services/finance/finance.mapper"
import type {
  FinanceQueryParams,
  FinanceListResponse,
  FinanceDetailResponse,
  FinanceMutationResponse,
} from "@/types/finance/finance.types"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

/**
 * Récupère la liste globale des financements (Parcourir).
 * Endpoint Dughu : GET /finance
 */
export async function getFinanceList(
  params: FinanceQueryParams = {}
): Promise<FinanceListResponse> {
  try {
    const query: Record<string, string | number | undefined> = {}
    if (params.category) query.category = params.category
    if (params.q) query.q = params.q
    if (params.sort_by) query.sort_by = params.sort_by
    if (params.page) query.page = params.page

    const raw = await dughuServerGet<unknown>("/finance", query, { retry: true })
    return normalizeFinanceList(raw)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de récupérer la liste des financements.", { cause: error })
  }
}

/**
 * Récupère les financements d'un utilisateur spécifique (Mes demandes).
 * Endpoint Dughu : GET /financeUser/{userId}
 */
export async function getUserFinanceList(
  userId: string,
  params: FinanceQueryParams = {}
): Promise<FinanceListResponse> {
  if (!userId) {
    throw new ApiError("Identifiant utilisateur manquant.", { status: 422 })
  }

  try {
    const query: Record<string, string | number | undefined> = {}
    if (params.category) query.category = params.category
    if (params.q) query.q = params.q
    if (params.sort_by) query.sort_by = params.sort_by
    if (params.page) query.page = params.page

    const raw = await dughuServerGet<unknown>(
      `/financeUser/${encodeURIComponent(userId)}`,
      query,
      { retry: true }
    )
    return normalizeFinanceList(raw)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de récupérer vos demandes de financement.", { cause: error })
  }
}

/**
 * Récupère le détail d'un financement.
 * Endpoint Dughu : GET /showFinance/{id}
 */
export async function getFinanceDetail(id: string): Promise<FinanceDetailResponse> {
  if (!id) {
    throw new ApiError("Identifiant de financement manquant.", { status: 422 })
  }

  try {
    const raw = await dughuServerGet<unknown>(
      `/showFinance/${encodeURIComponent(id)}`,
      undefined,
      { retry: true }
    )
    return normalizeFinanceDetail(raw)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger les détails du financement.", { cause: error })
  }
}

/**
 * Crée ou modifie une demande de financement.
 * Endpoint Dughu : POST /finance (multipart/form-data)
 */
export async function saveFinance(formData: FormData): Promise<FinanceMutationResponse> {
  try {
    const raw = await dughuServerMultipart<unknown>("/finance", formData)
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Demande enregistrée avec succès."
    const financeId = String(rec.finance_id || rec.id || rec.funding_id || "")

    return {
      success,
      message,
      financeId: financeId || undefined,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible d'enregistrer la demande de financement.", { cause: error })
  }
}

/**
 * Supprime une demande de financement.
 * Endpoint Dughu : DELETE /finance/{id}
 */
export async function deleteFinance(id: string): Promise<FinanceMutationResponse> {
  if (!id) {
    throw new ApiError("Identifiant de financement manquant.", { status: 422 })
  }

  try {
    const raw = await dughuServerDelete<unknown>(`/finance/${encodeURIComponent(id)}`)
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Demande supprimée avec succès."

    return {
      success,
      message,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de supprimer la demande de financement.", { cause: error })
  }
}

/**
 * Effectue un don pour une demande de financement.
 * Endpoint Dughu : POST /finance/don (multipart/form-data)
 */
export async function donateToFinance(formData: FormData): Promise<FinanceMutationResponse> {
  try {
    const raw = await dughuServerMultipart<unknown>("/finance/don", formData)
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Don effectué avec succès ! Merci pour votre soutien."

    return {
      success,
      message,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible d'effectuer le don. Veuillez vérifier votre solde de points.", { cause: error })
  }
}
