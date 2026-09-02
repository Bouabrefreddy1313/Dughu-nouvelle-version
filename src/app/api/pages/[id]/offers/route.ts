import { NextRequest, NextResponse } from "next/server"
import { createOffer, fetchPageOffers } from "@/services/pages/pages.server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/** GET /api/pages/[id]/offers?page=N — offres de la page (getPageOffers). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const userId = String(req.nextUrl.searchParams.get("user_id") || "") || (await getDughuUserIdFromCookies())
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1)
    if (!userId) return NextResponse.json({ success: false, offers: [], hasMore: false, message: "Session requise." }, { status: 401 })
    const result = await fetchPageOffers(pageId, userId, page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES OFFERS ERROR:", error)
    return NextResponse.json({ success: false, offers: [], hasMore: false, message: "Impossible de charger les offres." }, { status: 500 })
  }
}

/** POST /api/pages/[id]/offers — créer une offre (POST /offers). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const pageId = String(id || "")
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())
    if (!pageId || !userId) return NextResponse.json({ success: false, message: "Session et page requises." }, { status: 401 })

    const result = await createOffer({
      userId,
      pageId,
      description: String(body?.description || ""),
      discountType: String(body?.discountType || "discount_percent"),
      discountPercent: Number(body?.discountPercent) || 0,
      expireDate: String(body?.expireDate || ""),
      expireTime: String(body?.expireTime || ""),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES OFFER CREATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de créer l'offre." }, { status: 500 })
  }
}