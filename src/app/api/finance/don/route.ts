import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { donateToFinance } from "@/services/finance/finance.server"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/**
 * POST /api/finance/don
 * Effectue un don de points à une campagne de financement (multipart/form-data)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getDughuUserIdFromCookies()
    const incomingData = await request.formData()

    const fundingId = String(incomingData.get("funding_id") || "").trim()
    const points = String(incomingData.get("points") || "").trim()
    const recipientId = String(incomingData.get("recipient_id") || "").trim()
    let userId = String(incomingData.get("user_id") || "").trim()

    if (!userId && sessionUserId) {
      userId = sessionUserId
    }

    if (!fundingId) {
      return NextResponse.json(
        { success: false, message: "Identifiant de financement manquant." },
        { status: 422 }
      )
    }

    if (!points || isNaN(Number(points)) || Number(points) <= 0) {
      return NextResponse.json(
        { success: false, message: "Veuillez entrer un nombre de points valide." },
        { status: 422 }
      )
    }

    if (!recipientId) {
      return NextResponse.json(
        { success: false, message: "Destinataire du don manquant." },
        { status: 422 }
      )
    }

    if (userId && recipientId === userId) {
      return NextResponse.json(
        { success: false, message: "Vous ne pouvez pas faire un don à votre propre demande." },
        { status: 422 }
      )
    }

    const forwardedData = new FormData()
    forwardedData.set("funding_id", fundingId)
    forwardedData.set("points", points)
    forwardedData.set("recipient_id", recipientId)
    if (userId) forwardedData.set("user_id", userId)

    const result = await donateToFinance(forwardedData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("FINANCE DONATE ERROR:", error)
    const status = error instanceof ApiError && error.status ? error.status : 500
    const message = error instanceof Error ? error.message : "Impossible d'effectuer le don."
    return NextResponse.json({ success: false, message }, { status })
  }
}
