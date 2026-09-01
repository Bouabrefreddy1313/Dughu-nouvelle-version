/**
 * Types du domaine Authentification.
 *
 * Unité du contrat consommé par l'interface après normalisation côté route
 * interne /api. Ces types correspondent à la réponse des routes /api/login,
 * /api/register, /api/logout, /api/auth/me, /api/auth/google, /api/otp/* et
 * /api/password/*.
 */

export interface AuthUser {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  username: string
  avatar: string
  image: string
  cover: string
  bio: string
  _count: { posts: number; followers: number; following: number }
  followers: unknown[]
  following: unknown[]
  onboardingCompleted: boolean
  dughu: { userId: string; token?: string; username?: string }
}

export interface LoginPayload {
  login: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  gender: string
  phone: string
  country_code: string
  ref?: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  user?: AuthUser
  redirect?: string
}

export interface RegisterResponse {
  success: boolean
  message?: string
  email?: string
  redirect?: string
}

export interface MessageResponse {
  success: boolean
  message?: string
}

export interface OtpVerifyPayload {
  email: string
  otp: string
}

export interface OtpResendPayload {
  email: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  otp: string
  password: string
  password_confirmation: string
}