import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { isSearchEnabled, searchAll } from "@/services/search/search.server"

export const dynamic = "force-dynamic"

// Route Handler allégé (lot 6 — Recherche) : lecture requête → session →
// service serveur → NextResponse. La normalisation vit dans search.mapper.ts.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || ""

  if (query.length < 2) {
    return NextResponse.json({ success: true, results: [] })
  }

  if (query.length > 100) {
    return NextResponse.json(
      { success: false, message: "Votre recherche est trop longue." },
      { status: 400 }
    )
  }

  if (!isSearchEnabled()) {
    return NextResponse.json(
      { success: false, message: "La recherche est temporairement indisponible." },
      { status: 503 }
    )
  }

  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Vous devez être connecté pour effectuer une recherche." },
        { status: 401 }
      )
    }

    const results = await searchAll(query, userId)
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("GLOBAL SEARCH ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Impossible d’effectuer la recherche. Veuillez réessayer." },
      { status: 502 }
    )
  }
}
