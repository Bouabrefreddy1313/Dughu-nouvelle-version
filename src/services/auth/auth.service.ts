/**
 * Service FRONTEND du domaine Authentification.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour les
 * routes d'authentification internes /api/*. Il ne connaît pas React, ne
 * déclenche aucun toast, ne fait aucune redirection et transforme les erreurs
 * techniques en ApiError cohérentes.
 *
 * Règle de comportement : sur une réponse HTTP du serveur (erreur d'identifiants,
 * session invalide, code OTP refusé…), le service retourne un objet typé avec
 * `success: false` et le message du serveur — les pages conservent leur logique
 * d'affichage. Seules les erreurs de transport/réseau/timeout (sans réponse
 * HTTP) sont rejetées en ApiError, pour que les pages gardent leurs replis.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  AuthResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  MessageResponse,
  OtpResendPayload,
  OtpVerifyPayload,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
} from "@/types/auth/auth.types"

/**
 * Convertit une ApiError de réponse HTTP en résultat `success: false` avec le
 * message serveur (déjà approuvé). Les erreurs de transport sont rejetées.
 */
function responseToFailure(error: unknown, fallback: string): { success: false; message: string } {
  if (error instanceof ApiError && error.status) {
    return { success: false, message: error.message || fallback }
  }
  throw error
}

/** Convertit une ApiError de réponse HTTP en `success: false` sans utilisateur. */
function isMissingUser(error: unknown): boolean {
  return error instanceof ApiError && error.status !== undefined
}

export async function login(payload: LoginPayload, signal?: AbortSignal): Promise<AuthResponse> {
  try {
    const res = await apiClient.post<AuthResponse>("/login", payload, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Erreur de connexion")
    return failure
  }
}

export async function register(payload: RegisterPayload, signal?: AbortSignal): Promise<RegisterResponse> {
  try {
    const res = await apiClient.post<RegisterResponse>("/register", payload, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Erreur lors de l'inscription")
    return failure
  }
}

export async function loginWithGoogle(token: string, signal?: AbortSignal): Promise<AuthResponse> {
  try {
    const res = await apiClient.post<AuthResponse>("/auth/google", { token }, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Échec de la connexion Google")
    return failure
  }
}

export async function me(signal?: AbortSignal): Promise<AuthResponse> {
  try {
    const res = await apiClient.get<AuthResponse>("/auth/me", { signal })
    return res.data
  } catch (error) {
    if (isMissingUser(error)) return { success: false, user: undefined }
    throw error
  }
}

export async function logout(signal?: AbortSignal): Promise<MessageResponse> {
  try {
    const res = await apiClient.post<MessageResponse>("/logout", undefined, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Déconnecté")
    return failure
  }
}

export async function verifyOtp(payload: OtpVerifyPayload, signal?: AbortSignal): Promise<MessageResponse> {
  try {
    const res = await apiClient.post<MessageResponse>("/otp/verify", payload, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Code invalide")
    return failure
  }
}

export async function resendOtp(payload: OtpResendPayload, signal?: AbortSignal): Promise<MessageResponse> {
  try {
    const res = await apiClient.post<MessageResponse>("/otp/resend", payload, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Impossible d'envoyer le code")
    return failure
  }
}

export async function forgotPassword(payload: ForgotPasswordPayload, signal?: AbortSignal): Promise<MessageResponse> {
  try {
    const res = await apiClient.post<MessageResponse>("/password/forgot", payload, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Erreur lors de l'envoi")
    return failure
  }
}

export async function resetPassword(payload: ResetPasswordPayload, signal?: AbortSignal): Promise<MessageResponse> {
  try {
    const res = await apiClient.post<MessageResponse>("/password/reset", payload, { signal })
    return res.data
  } catch (error) {
    const failure = responseToFailure(error, "Erreur lors de la réinitialisation")
    return failure
  }
}

export type { AuthUser }