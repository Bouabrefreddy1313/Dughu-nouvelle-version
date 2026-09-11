/**
 * GET /api/processedNotifications
 * Alias direct miroir pour la collection Postman :
 * GET {{local_dughu}}/processedNotifications?user_id=23443&canal_id=21
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { getProcessedNotifications } from "@/services/canal/canal.server"
import type { CanalNotificationsResponse } from "@/types/canal/canal.types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const canalId = String(searchParams.get("canal_id") || searchParams.get("canalId") || "")
    const userId =
      String(searchParams.get("user_id") || searchParams.get("userId") || "") ||
      (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<CanalNotificationsResponse>(
        { success: false, message: "Session requise ou paramètre user_id manquant.", notifications: [], hasMore: false, page: 1 },
        { status: 401 }
      )
    }

    const result = await getProcessedNotifications(userId, canalId, page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("API ALIAS PROCESSED NOTIFICATIONS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les notifications."
    return NextResponse.json<CanalNotificationsResponse>(
      { success: false, message, notifications: [], hasMore: false, page: 1 },
      { status: 500 }
    )
  }
}
