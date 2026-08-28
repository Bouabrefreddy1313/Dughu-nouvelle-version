import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { normalizeGlobalSearch } from "@/lib/global-search"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

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

  if (!dughu.enabled) {
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

    const raw = await dughuApi.searchAll({ query, user_id: userId, page: 1 })
    return NextResponse.json({ success: true, results: normalizeGlobalSearch(raw) })
  } catch (error) {
    console.error("GLOBAL SEARCH ERROR:", error)
    return NextResponse.json(
      { success: false, message: "Impossible d’effectuer la recherche. Veuillez réessayer." },
      { status: 502 }
    )
  }
}
