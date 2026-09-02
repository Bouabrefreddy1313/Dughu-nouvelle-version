import { NextRequest, NextResponse } from "next/server"
import { fetchPageStats } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { ApiError } from "@/lib/api/api-error"

export const dynamic = "force-dynamic"

/** GET /api/pages/[id]/stats?filter=all|day|week|month — statistiques (réservé admin). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const userId = String(req.nextUrl.searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())
    const filter = String(req.nextUrl.searchParams.get("filter") || "all")
    if (!pageId || !userId) return NextResponse.json({ success: false, message: "Paramètres requis." }, { status: 422 })
    const stats = await fetchPageStats(pageId, userId, filter)
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("PAGES STATS ERROR:", error)
    const isForbidden = error instanceof ApiError && error.status === 403
    return NextResponse.json(
      { success: false, message: isForbidden ? "Accès réservé aux administrateurs de l'espace." : "Impossible de charger les statistiques." },
      { status: isForbidden ? 403 : 500 }
    )
  }
}