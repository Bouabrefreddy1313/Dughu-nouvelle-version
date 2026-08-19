import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError } from "@/lib/dughu"
import { normalizeMessages } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const userId = params.get("userId") || ""
  const targetUserId = params.get("targetUserId") || ""
  if (!userId || !targetUserId) {
    return NextResponse.json({ success: false, message: "Interlocuteurs requis." }, { status: 422 })
  }

  try {
    const raw = await dughuApi.getConversationMessages(userId, targetUserId)
    return NextResponse.json({ success: true, messages: normalizeMessages(raw, userId) })
  } catch (error) {
    console.error("CONVERSATION ERROR:", error)
    const status = error instanceof DughuApiError ? error.status : 502
    return NextResponse.json({ success: false, message: "Impossible de charger les messages." }, { status })
  }
}
