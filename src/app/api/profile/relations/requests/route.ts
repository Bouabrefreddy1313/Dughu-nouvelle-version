import { NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getRelationRequestsForUser, RELATION_TYPES } from "@/services/relations/relations.server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const authUserId = await getDughuUserIdFromCookies()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, message: "Vous devez être connecté pour consulter vos demandes." },
        { status: 401 }
      )
    }

    const result = await getRelationRequestsForUser(authUserId)

    if (result.unavailableTypes.length === RELATION_TYPES.length) {
      return NextResponse.json(
        { success: false, message: "Impossible de charger vos demandes de relations." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      requests: result.requests,
      unavailableTypes: result.unavailableTypes,
    })
  } catch (error) {
    console.error("RELATION REQUESTS ERROR:", error instanceof Error ? error.message : "Erreur inconnue")
    return NextResponse.json(
      { success: false, message: "Impossible de charger vos demandes de relations." },
      { status: 500 }
    )
  }
}
