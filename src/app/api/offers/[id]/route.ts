import { NextRequest, NextResponse } from "next/server"
import { fetchOfferDetail } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** GET /api/offers/[id] — détail d'une offre (GET /offers/show/{id}). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const offer = await fetchOfferDetail(String(id || ""))
    if (!offer) return NextResponse.json({ success: false, message: "Offre introuvable." }, { status: 404 })
    return NextResponse.json({ success: true, offer })
  } catch (error) {
    console.error("OFFERS DETAIL ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de charger l'offre." }, { status: 500 })
  }
}