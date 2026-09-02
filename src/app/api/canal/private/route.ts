/**
 * POST /api/canal/private
 * Accéder à un canal privé via son code d'invitation.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { accessPrivateCanal } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const inviteCode = String(body?.inviteCode || body?.invite_code || "").trim()
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!inviteCode) {
      return NextResponse.json({ success: false, message: "Code d'invitation requis." }, { status: 422 })
    }

    const result = await accessPrivateCanal(userId, inviteCode)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL PRIVATE ACCESS ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Code d'invitation invalide."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
