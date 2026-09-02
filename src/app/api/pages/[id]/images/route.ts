import { NextRequest, NextResponse } from "next/server"
import { fetchPageImages } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** GET /api/pages/[id]/images?page=N — galerie de la page (imagePage). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1)
    const result = await fetchPageImages(String(id || ""), page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES IMAGES ERROR:", error)
    return NextResponse.json({ success: false, images: [], hasMore: false, message: "Impossible de charger la galerie." }, { status: 500 })
  }
}