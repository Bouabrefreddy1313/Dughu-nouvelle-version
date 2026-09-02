/**
 * POST /api/canal/polls/vote
 * Voter pour une option d'un sondage de canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { votePoll } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const optionId = String(body?.optionId || body?.option_id || "")
    const pollId = String(body?.pollId || body?.poll_id || "")
    const canalId = String(body?.canalId || body?.canal_id || "")
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!optionId || !pollId) {
      return NextResponse.json({ success: false, message: "Option et sondage requis." }, { status: 422 })
    }

    const result = await votePoll({ optionId, pollId, userId, canalId })
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL POLL VOTE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'enregistrer le vote."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
