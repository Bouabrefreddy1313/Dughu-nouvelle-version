import { NextRequest, NextResponse } from "next/server"
import { ApiError } from "@/lib/api/api-error"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import {
  getPrivacySettings,
  isPrivacySettings,
  savePrivacySettings,
} from "@/services/profile/profile.server"

function errorResponse(error: unknown, fallback: string) {
  console.error("PROFILE PRIVACY ERROR:", error instanceof Error ? error.message : "Erreur inconnue")
  const status = error instanceof ApiError && error.status === 422 ? 422 : 502
  return NextResponse.json({ success: false, message: fallback }, { status })
}

export async function GET() {
  const userId = await getDughuUserIdFromCookies()
  if (!userId) {
    return NextResponse.json({ success: false, message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })
  }
  try {
    const data = await getPrivacySettings(userId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return errorResponse(error, "Impossible de charger vos paramètres de confidentialité.")
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getDughuUserIdFromCookies()
  if (!userId) {
    return NextResponse.json({ success: false, message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: "La requête est invalide." }, { status: 400 })
  }
  if (!isPrivacySettings(body)) {
    return NextResponse.json({ success: false, message: "Les paramètres de confidentialité sont invalides." }, { status: 422 })
  }

  try {
    const data = await savePrivacySettings(userId, body)
    return NextResponse.json({ success: true, message: "Paramètres de confidentialité mis à jour avec succès.", data })
  } catch (error) {
    return errorResponse(error, "Impossible d'enregistrer vos paramètres de confidentialité.")
  }
}
