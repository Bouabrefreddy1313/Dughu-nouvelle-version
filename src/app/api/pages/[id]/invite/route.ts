import { NextRequest, NextResponse } from "next/server"
import { inviteFriend } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/invite { friendId } — inviter un ami (page/inviteFriend). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    const friendId = String(body?.friendId || body?.friend_id || "")

    if (!pageId || !userId || !friendId) return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    const result = await inviteFriend(userId, pageId, friendId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES INVITE ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible d'envoyer l'invitation." }, { status: 500 })
  }
}