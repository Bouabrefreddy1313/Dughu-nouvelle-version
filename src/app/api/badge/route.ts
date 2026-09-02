import { NextResponse } from "next/server"
import { fetchBadgeCatalogue } from "@/services/badges/badges.server"
import { userMessage } from "@/lib/api/api-error"

/**
 * Catalogue complet des badges Dughu — encapsule GET /badge (API Dughu) à
 * travers le service serveur (instance Axios serveur, token jamais exposé).
 */
export async function GET() {
  try {
    const data = await fetchBadgeCatalogue()
    return NextResponse.json(data)
  } catch (error) {
    console.error("BADGE CATALOGUE ERROR:", error)
    return NextResponse.json(
      { success: false, message: userMessage(error, "Impossible de charger le catalogue des badges.") },
      { status: 500 }
    )
  }
}
