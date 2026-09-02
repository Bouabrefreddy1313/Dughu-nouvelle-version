/**
 * POST /api/canal/status
 * Activer / désactiver un canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { updateCanalStatus } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const canalId = String(body?.canalId || body?.canal_id || "")
    const isActive = Boolean(body?.isActive ?? body?.is_active)
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!canalId) {
      return NextResponse.json({ success: false, message: "Identifiant canal requis." }, { status: 400 })
    }

    const result = await updateCanalStatus(userId, canalId, isActive)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL STATUS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de mettre à jour le statut."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
