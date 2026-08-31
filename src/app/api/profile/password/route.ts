import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, DughuApiError } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

interface PasswordBody {
  actualPassword?: unknown
  password?: unknown
  password_confirmation?: unknown
}

function apiMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback
  const source = data as { message?: unknown; messages?: unknown; errors?: unknown }
  const candidates: unknown[] = [source.message]

  if (Array.isArray(source.messages)) candidates.push(...source.messages)
  if (source.errors && typeof source.errors === "object") {
    for (const value of Object.values(source.errors as Record<string, unknown>)) {
      if (Array.isArray(value)) candidates.push(...value)
      else candidates.push(value)
    }
  }

  const message = candidates.find((value) => typeof value === "string" && value.trim())
  return typeof message === "string" && message.length <= 300 ? message : fallback
}

export async function POST(request: NextRequest) {
  try {
    let body: PasswordBody
    try {
      body = await request.json() as PasswordBody
    } catch {
      return NextResponse.json({ success: false, message: "La requête est invalide." }, { status: 400 })
    }

    const { actualPassword, password, password_confirmation: confirmation } = body
    if (typeof actualPassword !== "string" || typeof password !== "string" || typeof confirmation !== "string") {
      return NextResponse.json({ success: false, message: "Tous les champs sont requis." }, { status: 422 })
    }
    if (!actualPassword || !password || !confirmation) {
      return NextResponse.json({ success: false, message: "Tous les champs sont requis." }, { status: 422 })
    }
    if (actualPassword.length > 256 || password.length > 256 || confirmation.length > 256) {
      return NextResponse.json({ success: false, message: "Un mot de passe saisi est trop long." }, { status: 422 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 422 })
    }
    if (password !== confirmation) {
      return NextResponse.json({ success: false, message: "Les nouveaux mots de passe ne correspondent pas." }, { status: 422 })
    }
    if (actualPassword === password) {
      return NextResponse.json({ success: false, message: "Le nouveau mot de passe doit être différent de l'ancien." }, { status: 422 })
    }

    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })
    }
    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "Impossible de modifier votre mot de passe pour le moment." }, { status: 503 })
    }

    const formData = new FormData()
    formData.append("user_id", userId)
    formData.append("actualPassword", actualPassword)
    formData.append("password", password)
    formData.append("password_confirmation", confirmation)

    const result = await dughuApi.updatePassword(formData)
    if (result && typeof result === "object" && result.success === false) {
      return NextResponse.json(
        { success: false, message: apiMessage(result, "Impossible de modifier votre mot de passe.") },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, message: "Votre mot de passe a été modifié." })
  } catch (error) {
    // Ne jamais journaliser le corps de la requête : il contient les mots de passe.
    console.error("PROFILE PASSWORD ERROR:", error instanceof Error ? error.message : "Erreur inconnue")
    if (error instanceof DughuApiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502
      return NextResponse.json(
        { success: false, message: apiMessage(error.data, "Impossible de modifier votre mot de passe.") },
        { status }
      )
    }
    return NextResponse.json(
      { success: false, message: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}

