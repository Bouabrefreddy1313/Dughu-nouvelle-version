import { NextRequest, NextResponse } from "next/server"
import { fetchInvitableFriends } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** GET /api/pages/[id]/invites — amis invitables (POST /invitePageList). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const userId = String(req.nextUrl.searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())
    if (!pageId || !userId) return NextResponse.json({ success: false, friends: [], message: "Session et page requises." }, { status: 401 })
    const friends = await fetchInvitableFriends(userId, pageId)
    return NextResponse.json({ success: true, friends })
  } catch (error) {
    console.error("PAGES INVITES ERROR:", error)
    return NextResponse.json({ success: false, friends: [], message: "Impossible de charger les amis invitables." }, { status: 500 })
  }
}