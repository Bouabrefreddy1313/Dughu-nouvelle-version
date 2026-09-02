import { NextRequest, NextResponse } from "next/server"
import { fetchPageDetail } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** GET /api/pages/[id] — détail d'une page (encapsule POST /show/pages). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const userId = String(req.nextUrl.searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())

    if (!pageId) return NextResponse.json({ success: false, message: "Identifiant de page requis." }, { status: 422 })
    if (!userId) return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })

    const result = await fetchPageDetail(userId, pageId)
    return NextResponse.json(result, { status: result.success ? 200 : 404 })
  } catch (error) {
    console.error("PAGES DETAIL ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger l'espace."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}