import { NextRequest, NextResponse } from "next/server"
import { getNotificationsServer } from "@/services/notifications/notifications.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { userMessage } from "@/lib/api/api-error"

/**
 * GET /api/notifications?filter={filter}&page={page}&userId={userId}
 *
 * Récupère les notifications d'un utilisateur via GET /getNotifications/{userId}.
 * Le paramètre filter est dynamique ("all", "poke", etc.).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get("filter") || "all"
    const page = Number(searchParams.get("page")) || 1

    const userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non connecté." },
        { status: 401 }
      )
    }

    const data = await getNotificationsServer({
      userId,
      filter,
      page,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return NextResponse.json(
      {
        success: false,
        message: userMessage(error, "Impossible de récupérer vos notifications."),
      },
      { status: 500 }
    )
  }
}
