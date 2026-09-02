import { NextRequest, NextResponse } from "next/server"
import { fetchPageLikes } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/** GET /api/pages/[id]/likes — personnes ayant liké la page (getPageLikes). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const result = await fetchPageLikes(String(id || ""))
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES LIKES ERROR:", error)
    return NextResponse.json({ success: false, likes: [], message: "Impossible de charger les likes." }, { status: 500 })
  }
}