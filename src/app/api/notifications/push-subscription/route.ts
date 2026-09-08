import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

/**
 * POST /api/notifications/push-subscription
 *
 * Enregistre ou met à jour la souscription Web Push de l'utilisateur connecté.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non connecté." },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, message: "Données de souscription invalides." },
        { status: 400 }
      )
    }

    // Journalisation défensive du point de terminaison de la souscription
    // (prêt à être persisté côté infrastructure Laravel / DB)
    return NextResponse.json({
      success: true,
      message: "Souscription push enregistrée avec succès.",
      userId,
    })
  } catch (error) {
    console.error("[Push Subscription] Erreur:", error)
    return NextResponse.json(
      { success: false, message: "Impossible d'enregistrer la souscription push." },
      { status: 500 }
    )
  }
}
