import { NextRequest, NextResponse } from "next/server"
import { fetchPagePosts } from "@/services/pages/pages.server"

export const dynamic = "force-dynamic"

/**
 * GET /api/pages/[id]/posts?page=N — publications d'un espace spécifique.
 * Les posts sont normalisés avec mapPosts (format PostCard complet : auteur,
 * réactions, compteurs) pour affichage direct dans SpaceDetailPage.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await ctx.params
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1)
    const result = await fetchPagePosts(String(id || ""), page)
    return NextResponse.json(result)
  } catch (error) {
    console.error("PAGES POSTS ERROR:", error)
    return NextResponse.json({ success: false, posts: [], hasMore: false, message: "Impossible de charger les publications." }, { status: 500 })
  }
}