"use client"

// Bouton "Continuer avec Google" basé sur Google Identity Services (GIS).
// Le navigateur obtient un Google ID token (credential), que l'on transmet à
// /api/auth/google : l'API Dughu vérifie le token, renvoie l'utilisateur Dughu,
// et la route crée la session locale. Même finalisation que le login classique.

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
const GSI_SRC = "https://accounts.google.com/gsi/client"

type CredentialResponse = { credential?: string }

type GoogleIdApi = {
  initialize: (config: Record<string, unknown>) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

export default function GoogleSignInButton({ width = 356 }: { width?: number }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptError, setScriptError] = useState(false)

  // Finalisation de la connexion (identique au login classique)
  const handleCredential = useCallback(
    async (res: CredentialResponse) => {
      if (!res.credential) {
        toast.error("Connexion Google annulée.")
        return
      }
      try {
        const r = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: res.credential }),
        })
        const data = await r.json()
        if (!r.ok || !data.success) {
          toast.error(data.message || "Échec de la connexion Google")
          return
        }
        toast.success("Connexion réussie !")
        const nextUrl = data.user?.onboardingCompleted ? "/home" : "/onboarding/profile"
        router.replace(data.redirect || nextUrl)
      } catch {
        toast.error("Erreur réseau")
      }
    },
    [router]
  )

  useEffect(() => {
    if (!CLIENT_ID) return

    const render = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
      })
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "left",
        width,
        locale: "fr",
      })
    }

    if (window.google?.accounts?.id) {
      render()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    const script = existing || document.createElement("script")
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = render
    script.onerror = () => setScriptError(true)
    if (!existing) document.head.appendChild(script)
  }, [handleCredential, width])

  // Client ID non configuré ou script GIS inaccessible → bouton de repli
  if (!CLIENT_ID || scriptError) {
    return (
      <button
        type="button"
        onClick={() =>
          toast.error(
            CLIENT_ID
              ? "Impossible de charger Google Sign-In. Vérifiez votre connexion."
              : "Connexion Google non configurée (NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant)."
          )
        }
        className="w-full h-11 rounded-full border border-gray-200 bg-white text-gray-500 font-medium flex items-center justify-center gap-2 cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continuer avec Google
      </button>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full min-h-[44px] items-center justify-center"
      aria-label="Continuer avec Google"
    />
  )
}
