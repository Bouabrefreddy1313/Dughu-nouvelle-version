import { NextRequest, NextResponse } from "next/server"
import { likePage } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/like — like / unlike (POST /likePage). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    if (!userId) return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })

    const result = await likePage(pageId, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES LIKE ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de liker cet espace." }, { status: 500 })
  }
}