/**
 * Instance Axios SERVEUR — utilisée UNIQUEMENT par les services serveur
 * (relations.server.ts…) appelés depuis les Route Handlers.
 *
 * NB SERVER-ONLY : ce module lit des secrets (DUGHU_API_KEY) et n'est jamais
 * importable depuis un composant client ou un hook. Ne JAMAIS l'importer dans
 * le navigateur. (Le paquet « server-only » n'étant pas installé dans ce
 * projet, la protection repose sur la discipline d'import.)
 *
 * Responsabilités :
 *  - baseURL Dughu depuis une configuration serveur validée (env.ts) ;
 *  - ajout de X-AppApiToken côté serveur uniquement ;
 *  - timeout explicite ;
 *  - gestion des réponses invalides et erreurs normalisées (ApiError) ;
 *  - retry limité UNIQUEMENT pour les opérations idempotentes (lectures) ;
 *    jamais de retry sur une mutation.
 *  - aucun secret renvoyé au navigateur.
 */

import axios from "axios"
import { dughuServerConfig } from "@/lib/config/env"
import { ApiError } from "@/lib/api/api-error"

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const dughuServer = axios.create({
  baseURL: dughuServerConfig.apiBaseUrl,
  timeout: dughuServerConfig.timeoutMs,
  headers: {
    Accept: "application/json",
    "X-AppApiToken": dughuServerConfig.apiToken,
  },
})

function toServerApiError(error: unknown): ApiError {
  const err = record(error)
  const response = record(err.response)
  const status = typeof response.status === "number" ? response.status : undefined
  const code = typeof err.code === "string" ? err.code : undefined
  // Message technique, destiné aux logs / au mapping des Route Handlers ; il
  // n'est jamais exposé tel quel à l'utilisateur par les services.
  const message = `Dughu API${status ? ` ${status}` : ""}${code ? ` (${code})` : ""}`
  return new ApiError(message, { status, code, cause: error })
}

/** Vrai pour les erreurs réseau / timeout : seules ces erreurs justifient un retry. */
function isRetryable(error: ApiError): boolean {
  return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.status === undefined
}

export interface ExecuteOptions {
  /** Active un retry limité. À n'utiliser QUE pour des lectures idempotentes. */
  retry?: boolean
  /** En-têtes HTTP supplémentaires (ex. Authorization: Bearer <token>) */
  headers?: Record<string, string>
}

async function execute<T>(config: Parameters<typeof dughuServer.request<T>>[0], options: ExecuteOptions = {}): Promise<T> {
  if (!dughuServerConfig.enabled) {
    throw new ApiError("API Dughu non configurée", { status: 500 })
  }

  const retryEnabled = options.retry === true
  let attempt = 0

  while (true) {
    try {
      const res = await dughuServer.request<T>({
        ...config,
        headers: {
          ...(config.headers || {}),
          ...(options.headers || {}),
        },
      })
      return res.data
    } catch (error) {
      const apiError = toServerApiError(error)
      const canRetry = retryEnabled && isRetryable(apiError) && attempt < dughuServerConfig.retryTimes
      if (!canRetry) throw apiError
      attempt += 1
      await sleep(dughuServerConfig.retrySleepMs * attempt)
    }
  }
}

/** GET vers l'API Dughu — lecture idempotente : retry possible. */
export function dughuServerGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: ExecuteOptions
): Promise<T> {
  return execute<T>({ method: "GET", url: path, params }, options)
}

/**
 * POST form-urlencoded vers l'API Dughu — par défaut MUTATION (aucun retry).
 * Utilisé par les endpoints Dughu qui attendent des champs de formulaire
 * (ex. pokes) plutôt que du multipart.
 */
export function dughuServerForm<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>,
  options?: ExecuteOptions
): Promise<T> {
  const data = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") data.set(key, String(value))
  }
  return execute<T>({ method: "POST", url: path, data }, options)
}


/**
 * POST multipart vers l'API Dughu — par défaut MUTATION (aucun retry).
 * Avec FormData, on laisse Axios construire automatiquement le Content-Type
 * et sa boundary : on ne définit JAMAIS un header Content-Type manuel ici.
 */
export function dughuServerMultipart<T = unknown>(
  path: string,
  formData: FormData,
  options?: ExecuteOptions
): Promise<T> {
  return execute<T>({ method: "POST", url: path, data: formData }, options)
}

/** POST JSON vers l'API Dughu — mutation sans retry automatique. */
export function dughuServerJson<T = unknown>(
  path: string,
  data: Record<string, unknown>,
  options?: ExecuteOptions
): Promise<T> {
  return execute<T>({
    method: "POST",
    url: path,
    data,
    headers: { "Content-Type": "application/json" },
  }, options)
}

/** DELETE vers l'API Dughu — mutation sans retry automatique. */
export function dughuServerDelete<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: ExecuteOptions
): Promise<T> {
  return execute<T>({ method: "DELETE", url: path, params }, options)
}

