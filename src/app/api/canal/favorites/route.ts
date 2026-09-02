/**
 * GET  /api/canal/favorites — liste paginée des canaux favoris
 * POST /api/canal/favorites — ajouter / retirer un canal des favoris
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import { listFavoriteCanals, toggleFavoriteCanal } from "@/services/canal/canal.server"
import type { CanalsListResponse } from "@/types/canal/canal.types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const categoryId = String(searchParams.get("categoryId") || "")
    const userId = String(searchParams.get("userId") || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json<CanalsListResponse>(
        { success: false, message: "Session requise.", canals: [], hasMore: false, page: 1 },
        { status: 401 }
      )
    }

    const result = await listFavoriteCanals(userId, { page, categoryId: categoryId || undefined })
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL FAVORITES LIST ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les favoris."
    return NextResponse.json<CanalsListResponse>(
      { success: false, message, canals: [], hasMore: false, page: 1 },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const canalId = String(body?.canalId || body?.canal_id || "")
    const action = (body?.action === "remove" ? "remove" : "add") as "add" | "remove"
    const userId = String(body?.userId || body?.user_id || "") || (await getDughuUserIdFromCookies())

    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise." }, { status: 401 })
    }
    if (!canalId) {
      return NextResponse.json({ success: false, message: "Identifiant canal requis." }, { status: 400 })
    }

    const result = await toggleFavoriteCanal(userId, canalId, action)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL TOGGLE FAVORITE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de modifier les favoris."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
