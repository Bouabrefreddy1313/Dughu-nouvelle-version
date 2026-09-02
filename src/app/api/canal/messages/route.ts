/**
 * POST /api/canal/messages         — liste paginée des messages d'un canal
 * POST /api/canal/messages/:canalId — envoyer un message (multipart)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { showCanalMessages } from "@/services/canal/canal.server"
import type { CanalMessagesResponse } from "@/types/canal/canal.types"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const body = await req.json().catch(() => ({}))
    const canalId = String(body?.canalId || body?.canal_id || "")
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<CanalMessagesResponse>(
        { success: false, message: "Session requise.", messages: [], hasMore: false, page: 1 },
        { status: 401 }
      )
    }
    if (!canalId) {
      return NextResponse.json<CanalMessagesResponse>(
        { success: false, message: "Identifiant canal requis.", messages: [], hasMore: false, page: 1 },
        { status: 400 }
      )
    }

    const result = await showCanalMessages(canalId, userId, page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL MESSAGES ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les messages."
    return NextResponse.json<CanalMessagesResponse>(
      { success: false, message, messages: [], hasMore: false, page: 1 },
      { status: 500 }
    )
  }
}
