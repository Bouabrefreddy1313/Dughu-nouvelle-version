import { NextRequest, NextResponse } from "next/server"
import { boostPage } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/boost { days } — booster une page (POST /boostPage). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    const days = Math.min(Math.max(Number(body?.days) || 7, 1), 30)

    if (!pageId || !userId) return NextResponse.json({ success: false, message: "Session et page requises." }, { status: 401 })
    const result = await boostPage(pageId, userId, days)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES BOOST ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de booster cet espace." }, { status: 500 })
  }
}