/**
 * Instance Axios CLIENTE — utilisée UNIQUEMENT par les services frontend.
 *
 * Responsabilités :
 *  - baseURL interne /api ;
 *  - withCredentials: true (session portée par cookies httpOnly) ;
 *  - timeout explicite ;
 *  - header Accept ;
 *  - transformation cohérente des erreurs en ApiError ;
 *  - prise en charge d'AbortSignal via les options de requête.
 *
 * Interdits : aucun secret, aucune clé API, aucun accès direct à
 * DUGHU_API_KEY, aucun token lu depuis localStorage/sessionStorage, aucun
 * toast ni composant React, et aucune redirection automatique globale sur
 * un 401 (la décision de rediriger appartient au domaine d'authentification).
 */

import axios from "axios"
import { ApiError } from "@/lib/api/api-error"

/** baseURL interne : le navigateur n'appelle jamais Dughu directement. */
export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
})

const STATUS_MESSAGES: Record<number, string> = {
  400: "Requête invalide.",
  401: "Votre session a expiré. Veuillez vous reconnecter.",
  403: "Vous n'avez pas la permission d'effectuer cette action.",
  404: "Ressource introuvable.",
  422: "Les données fournies sont invalides.",
  429: "Trop de requêtes. Veuillez patienter quelques instants.",
  500: "Une erreur interne est survenue. Veuillez réessayer dans quelques instants.",
  502: "Une erreur interne est survenue. Veuillez réessayer dans quelques instants.",
  503: "Le serveur est indisponible. Veuillez réessayer dans quelques instants.",
}

const GENERIC_MESSAGE = "Une erreur est survenue. Veuillez réessayer."

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

/** Lit un éventuel message français déjà approuvé dans le corps de réponse. */
function messageFromBody(data: unknown): string {
  const body = record(data)
  return typeof body.message === "string" && body.message ? body.message : ""
}

function apiErrorFromHttpError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const err = record(error)
  const response = record(err.response)
  const status = typeof response.status === "number" ? response.status : undefined
  const data = record(response.data)
  const code = typeof err.code === "string" ? err.code : undefined
  const isCanceled = code === "ERR_CANCELED" || axios.isCancel(error)
  const isTimeout = code === "ECONNABORTED" || code === "ETIMEDOUT"
  const isNetwork = !isCanceled && status === undefined && Object.keys(response).length === 0

  const message =
    messageFromBody(data) ||
    (isCanceled ? "La requête a été annulée." : "") ||
    (isTimeout ? "La requête a expiré. Veuillez réessayer." : "") ||
    (isNetwork ? "Impossible de contacter le serveur. Veuillez vérifier votre connexion." : "") ||
    (status !== undefined ? STATUS_MESSAGES[status] || GENERIC_MESSAGE : "") ||
    GENERIC_MESSAGE

  return new ApiError(message, { status, code: isCanceled ? "ERR_CANCELED" : code, cause: error })
}

apiClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(apiErrorFromHttpError(err))
)

export default apiClient