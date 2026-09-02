import { NextRequest, NextResponse } from "next/server"
import { updatePointsRecipient } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/points-recipient { recipient } — qui reçoit les points. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const recipientRaw = String(body?.recipient || "")
    const recipient = recipientRaw === "subscriber" || recipientRaw === "owner" || recipientRaw === "none" ? recipientRaw : "subscriber"
    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    const result = await updatePointsRecipient(pageId, recipient)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES POINTS RECIPIENT ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de mettre à jour le destinataire des points." }, { status: 500 })
  }
}