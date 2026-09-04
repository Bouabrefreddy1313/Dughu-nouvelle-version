import { NextRequest, NextResponse } from "next/server"
import { fetchPointsHistory } from "@/services/points/points.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { userMessage } from "@/lib/api/api-error"

/**
 * Historique des points de l'utilisateur — encapsule GET /pointsHistory/{userId}
 * (API Dughu) à travers le service serveur (instance Axios serveur, token jamais
 * exposé). `userId` est l'ID Dughu numérique (ex. /api/pointsHistory?userId=23443) ;
 * à défaut, il est lu depuis le cookie de session.
 *
 * Paramètres relayés (capacités réelles de l'API) :
 *  - `page` : pagination Laravel (10 entrées/page fixe) ;
 *  - `search` : recherche serveur (recordsFiltered).
 * La période et le tri sont gérés côté client (non supportés par l'API).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())
    if (!userId) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const data = await fetchPointsHistory({
      userId,
      page: Number(searchParams.get("page")) || 1,
      search: searchParams.get("search") || undefined,
      source: searchParams.get("source") || undefined,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error("POINTS HISTORY ERROR:", error)
    return NextResponse.json(
      { success: false, message: userMessage(error, "Impossible de charger l'historique des points.") },
      { status: 500 }
    )
  }
}
