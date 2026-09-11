/**
 * GET /api/canal/notifications/processed
 * Notifications traitées d'un canal.
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
    const canalId = String(searchParams.get("canalId") || searchParams.get("canal_id") || "")
    const userId =
      String(searchParams.get("userId") || searchParams.get("user_id") || "") ||
      (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<CanalNotificationsResponse>(
        { success: false, message: "Session requise.", notifications: [], hasMore: false, page: 1 },
        { status: 401 }
      )
    }

    const result = await getProcessedNotifications(userId, canalId, page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL PROCESSED NOTIFICATIONS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les notifications."
    return NextResponse.json<CanalNotificationsResponse>(
      { success: false, message, notifications: [], hasMore: false, page: 1 },
      { status: 500 }
    )
  }
}
