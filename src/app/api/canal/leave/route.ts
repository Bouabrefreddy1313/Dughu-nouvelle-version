/**
 * POST /api/canal/leave
 * Quitter un canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { leaveCanal } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const canalId = String(body?.canalId || body?.canal_id || "")
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!canalId) {
      return NextResponse.json({ success: false, message: "Identifiant canal requis." }, { status: 400 })
    }

    const result = await leaveCanal(userId, canalId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL LEAVE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de quitter le canal."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
