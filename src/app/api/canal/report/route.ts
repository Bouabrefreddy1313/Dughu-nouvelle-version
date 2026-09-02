/**
 * POST /api/canal/report
 * Signaler un canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { reportCanal } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const canalId = String(body?.canalId || body?.canal_id || "")
    const reason = String(body?.reason || "")
    const reasonId = String(body?.reasonId || body?.reason_id || "")
    const text = String(body?.text || "")
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!canalId || !reason) {
      return NextResponse.json({ success: false, message: "Canal et motif requis." }, { status: 422 })
    }

    const result = await reportCanal({ canalId, reason, reasonId, text, userId })
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL REPORT ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'envoyer le signalement."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
