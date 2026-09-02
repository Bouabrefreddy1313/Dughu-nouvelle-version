import { NextRequest, NextResponse } from "next/server"
import { toggleVerification } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** POST /api/pages/[id]/toggle-verification — bascule admin/modération (toggleVerificationPage). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    if (!pageId || !userId) return NextResponse.json({ success: false, message: "Session et page requises." }, { status: 401 })
    const result = await toggleVerification(userId, pageId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES TOGGLE VERIFY ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de basculer la vérification." }, { status: 500 })
  }
}