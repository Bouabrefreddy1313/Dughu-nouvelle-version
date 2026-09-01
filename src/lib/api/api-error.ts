/**
 * Type d'erreur commun à l'application.
 *
 * Utilisé aussi bien par l'instance Axios cliente que par l'instance Axios
 * serveur. Il encapsule :
 *  - un message utilisateur (français, jamais d'erreur technique brute) ;
 *  - un status HTTP éventuel ;
 *  - un code éventuel (ex. code Axios) ;
 *  - une cause technique éventuelle, NON exposée dans l'interface.
 *
 * Règle : ne jamais montrer AxiosError, « Failed to fetch », stack trace ni
 * message backend brut à l'utilisateur.
 */

export interface ApiErrorOptions {
  status?: number
  code?: string
  cause?: unknown
}

export class ApiError extends Error {
  status?: number
  code?: string
  cause?: unknown

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = "ApiError"
    this.status = options.status
    this.code = options.code
    this.cause = options.cause
  }
}

/**
 * Extrait un message sûr à destination de l'utilisateur depuis une erreur.
 * N'expose jamais de détail technique : si l'erreur n'est pas une ApiError
 * (message déjà approuvé), on retombe sur un libellé générique.
 */
export function userMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback
  if (error instanceof Error) return error.message || fallback
  return fallback
}