import { NextRequest, NextResponse } from "next/server"
import { fetchBoostPrice } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** POST /api/pages/boost-price { days } → prix d'un boost (POST /boostPrice). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const days = Math.min(Math.max(Number(body?.days) || 1, 1), 30)
    const price = await fetchBoostPrice(days)
    return NextResponse.json({ success: true, ...price })
  } catch (error) {
    console.error("PAGES BOOST PRICE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de calculer le prix du boost."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}