/**
 * Service CLIENT du domaine Finance.
 *
 * Seul module frontend autorisé à appeler les routes internes /api/finance/*.
 * Utilise l'instance Axios cliente (apiClient), ne connaît pas React et
 * transforme les erreurs en ApiError.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  FinanceQueryParams,
  FinanceListResponse,
  FinanceDetailResponse,
  FinanceMutationResponse,
  CreateFinanceInput,
  FinanceDonationInput,
} from "@/types/finance/finance.types"

const FALLBACK_ERROR = "Une erreur est survenue lors de l'opération de financement."

/**
 * Récupère la liste des financements généraux (Parcourir).
 */
export async function fetchFinanceList(
  params: FinanceQueryParams = {},
  signal?: AbortSignal
): Promise<FinanceListResponse> {
  try {
    const qs = new URLSearchParams()
    if (params.category) qs.set("category", params.category)
    if (params.q) qs.set("q", params.q)
    if (params.sort_by) qs.set("sort_by", params.sort_by)
    if (params.page) qs.set("page", String(params.page))

    const res = await apiClient.get<FinanceListResponse>(
      `/finance${qs.toString() ? `?${qs.toString()}` : ""}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Récupère la liste des financements de l'utilisateur connecté (Mes demandes).
 */
export async function fetchUserFinanceList(
  userId: string,
  params: FinanceQueryParams = {},
  signal?: AbortSignal
): Promise<FinanceListResponse> {
  if (!userId) {
    return { success: true, finances: [] }
  }

  try {
    const qs = new URLSearchParams()
    if (params.category) qs.set("category", params.category)
    if (params.q) qs.set("q", params.q)
    if (params.sort_by) qs.set("sort_by", params.sort_by)
    if (params.page) qs.set("page", String(params.page))

    const res = await apiClient.get<FinanceListResponse>(
      `/finance/user/${encodeURIComponent(userId)}${qs.toString() ? `?${qs.toString()}` : ""}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Récupère le détail d'un financement.
 */
export async function fetchFinanceDetail(
  id: string,
  signal?: AbortSignal
): Promise<FinanceDetailResponse> {
  try {
    const res = await apiClient.get<FinanceDetailResponse>(
      `/finance/${encodeURIComponent(id)}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Crée ou met à jour une demande de financement (multipart/form-data).
 */
export async function submitFinance(
  input: CreateFinanceInput
): Promise<FinanceMutationResponse> {
  try {
    const formData = new FormData()
    formData.set("title", input.title.trim())
    formData.set("description", input.description.trim())
    formData.set("amount", String(input.amount).trim())
    if (input.userId) formData.set("user_id", input.userId)
    if (input.financeId) formData.set("finance_id", input.financeId)
    if (input.image) formData.set("image", input.image)

    const res = await apiClient.post<FinanceMutationResponse>("/finance", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Supprime une demande de financement.
 */
export async function deleteFinance(id: string): Promise<FinanceMutationResponse> {
  try {
    const res = await apiClient.delete<FinanceMutationResponse>(
      `/finance/${encodeURIComponent(id)}`
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Effectue un don de points.
 */
export async function donateToFinance(
  input: FinanceDonationInput
): Promise<FinanceMutationResponse> {
  try {
    const formData = new FormData()
    formData.set("funding_id", input.fundingId)
    formData.set("points", String(input.points))
    formData.set("recipient_id", input.recipientId)
    if (input.userId) formData.set("user_id", input.userId)

    const res = await apiClient.post<FinanceMutationResponse>("/finance/don", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}
