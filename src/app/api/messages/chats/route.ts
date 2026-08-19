import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError } from "@/lib/dughu"
import { normalizeChats } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId") || ""
  if (!userId) {
    return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 422 })
  }

  try {
    const raw = await dughuApi.getUserChats(userId)
    return NextResponse.json({ success: true, chats: normalizeChats(raw, userId) })
  } catch (error) {
    console.error("CHATS ERROR:", error)
    const status = error instanceof DughuApiError ? error.status : 502
    return NextResponse.json({ success: false, message: "Impossible de charger les conversations." }, { status })
  }
}
