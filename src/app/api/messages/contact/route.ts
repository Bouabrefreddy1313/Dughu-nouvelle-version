import { NextRequest, NextResponse } from "next/server"
import { dughuApi, DughuApiError } from "@/lib/dughu"
import { normalizeChatContact } from "@/lib/messages"

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId") || ""
  if (!userId) {
    return NextResponse.json({ success: false, message: "Contact requis." }, { status: 422 })
  }

  try {
    const raw = await dughuApi.getChatContact(userId)
    return NextResponse.json({ success: true, contact: normalizeChatContact(raw) })
  } catch (error) {
    console.error("CHAT CONTACT ERROR:", error)
    const status = error instanceof DughuApiError ? error.status : 502
    return NextResponse.json({ success: false, message: "Impossible de charger ce contact." }, { status })
  }
}
