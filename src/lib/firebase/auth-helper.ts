import { signInWithCustomToken } from "firebase/auth"
import { auth } from "./client"
import { apiClient } from "@/lib/api/client/axios-instance"

let pendingAuthPromise: Promise<boolean> | null = null
let authUnavailable = false

/**
 * Assure que le SDK client Firebase est connecté avec l'UID de l'utilisateur courant.
 * Appelle `/api/auth/firebase-token` et connecte Firebase Auth avec `signInWithCustomToken`.
 * Si Firebase Auth n'est pas activé sur le projet Firebase, évite les requêtes et logs répétés.
 */
export async function ensureFirebaseAuth(expectedUserId: string): Promise<boolean> {
  if (typeof window === "undefined" || !expectedUserId || authUnavailable) return false

  // Déjà connecté avec le bon UID ?
  if (auth.currentUser && auth.currentUser.uid === expectedUserId) {
    return true
  }

  // Évite les requêtes concurrentes simultanées
  if (pendingAuthPromise) {
    return pendingAuthPromise
  }

  pendingAuthPromise = (async () => {
    try {
      const res = await apiClient.get<{ success: boolean; token?: string }>("/auth/firebase-token")
      if (res.data?.success && res.data?.token) {
        await signInWithCustomToken(auth, res.data.token)
        return true
      }
      return false
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string }
      if (fbErr?.code === "auth/configuration-not-found") {
        authUnavailable = true
      } else {
        console.warn("Échec de l'authentification Firebase personnalisée:", err)
      }
      return false
    } finally {
      pendingAuthPromise = null
    }
  })()

  return pendingAuthPromise
}
