/**
 * POST /api/canal/polls
 * Créer un sondage dans un canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { createPoll } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const canalId = String(body?.canalId || body?.canal_id || "")
    const question = String(body?.question || "").trim()
    const options = Array.isArray(body?.options) ? body.options : []
    const allowMultiple = Boolean(body?.allowMultiple ?? body?.allow_multiple)
    const closesAt = body?.closesAt ? String(body.closesAt) : undefined
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!canalId || !question) {
      return NextResponse.json({ success: false, message: "Canal et question requis." }, { status: 422 })
    }

    const result = await createPoll(canalId, {
      question,
      options,
      allowMultiple,
      closesAt,
      userId,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL POLL CREATE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de créer le sondage."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
