/**
 * Types du domaine Finance de Dughu.
 */

export interface FinanceAuthor {
  id: string
  name: string
  avatar: string
  username?: string
}

export interface FinanceCampaign {
  id: string
  title: string
  description: string
  /** Montant objectif demandé en points */
  amount: number
  /** Montant déjà collecté en points */
  collectedAmount: number
  /** Objectif en points */
  targetPoints: number
  /** Points collectés */
  collectedPoints: number
  /** Nombre total de dons */
  donationsCount: number
  /** URL de l'image de couverture / illustration */
  image: string
  /** Date de création (ex: "06 February 2026") */
  createdAt: string
  /** ID du créateur de la demande */
  userId: string
  /** Auteur de la demande */
  author: FinanceAuthor
  /** Pourcentage de progression calculé (0 - 100). null si aucun objectif */
  progressPercent: number | null
  /** Vrai si l'objectif est atteint (collecté >= objectif et objectif > 0) */
  isGoalReached: boolean
}

export interface FinanceQueryParams {
  category?: string
  q?: string
  sort_by?: string
  page?: number
}

export interface CreateFinanceInput {
  title: string
  description: string
  amount: number | string
  image?: File | null
  userId?: string
  financeId?: string
}

export interface FinanceDonationInput {
  fundingId: string
  points: number | string
  recipientId: string
  userId?: string
}

export interface FinanceListResponse {
  success: boolean
  finances: FinanceCampaign[]
  message?: string
}

export interface FinanceDetailResponse {
  success: boolean
  finance: FinanceCampaign | null
  message?: string
}

export interface FinanceMutationResponse {
  success: boolean
  message: string
  financeId?: string
}
