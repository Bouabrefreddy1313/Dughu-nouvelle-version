/**
 * POST /api/canal/messages/[canalId]/[messageId]/reactions
 * Ajouter / mettre à jour une réaction sur un message de canal.
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { reactCanalMessage } from "@/services/canal/canal.server"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ canalId: string; messageId: string }> }
) {
  try {
    const { canalId, messageId } = await params
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    const reaction = String(body?.reaction || "")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!reaction) {
      return NextResponse.json({ success: false, message: "Réaction requise." }, { status: 422 })
    }

    const result = await reactCanalMessage(canalId, messageId, userId, reaction)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL REACTION ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible d'ajouter la réaction."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
