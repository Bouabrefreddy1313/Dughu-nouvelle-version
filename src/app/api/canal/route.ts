/**
 * GET  /api/canal?scope=...  — liste des canaux (découverte, mine, joined, suggestions, byCategory)
 * POST /api/canal            — créer ou mettre à jour un canal (multipart)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"
import {
  getAllCanals,
  getCanalsByCategory,
  getJoinedCanals,
  getMyCanals,
  getSuggestCanals,
  createOrUpdateCanal,
} from "@/services/canal/canal.server"
import type { CanalsListResponse } from "@/types/canal/canal.types"

export const dynamic = "force-dynamic"

type CanalScope = "all" | "mine" | "joined" | "suggestions" | "byCategory"
const SCOPES: CanalScope[] = ["all", "mine", "joined", "suggestions", "byCategory"]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const scopeParam = String(searchParams.get("scope") || "all")
    const scope: CanalScope = SCOPES.includes(scopeParam as CanalScope) ? (scopeParam as CanalScope) : "all"
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const userId = String(searchParams.get("userId") || "") || (await getDughuUserIdFromCookies())
    const categoryId = String(searchParams.get("categoryId") || "")
    const q = String(searchParams.get("q") || "")
    const sortBy = String(searchParams.get("sortBy") || "")

    if (!userId) {
      return NextResponse.json<CanalsListResponse>(
        { success: false, message: "Identifiant utilisateur requis.", canals: [], hasMore: false, page: 1 },
        { status: 401 }
      )
    }

    let result: CanalsListResponse

    switch (scope) {
      case "mine":
        result = await getMyCanals(userId, { page, categoryId: categoryId || undefined, q: q || undefined, sortBy: sortBy || undefined })
        break
      case "joined":
        result = await getJoinedCanals(userId, { page, categoryId: categoryId || undefined })
        break
      case "suggestions":
        result = await getSuggestCanals(userId, { page, categoryId: categoryId || undefined })
        break
      case "byCategory":
        result = await getCanalsByCategory(categoryId, userId, page)
        break
      default:
        result = await getAllCanals(userId, { page, categoryId: categoryId || undefined })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL LIST ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de charger les canaux."
    return NextResponse.json<CanalsListResponse>(
      { success: false, message, canals: [], hasMore: false, page: 1 },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session requise pour créer un canal." }, { status: 401 })
    }

    const formData = await req.formData()
    const name = String(formData.get("name") || "").trim()
    if (!name) {
      return NextResponse.json({ success: false, message: "Le nom du canal est requis." }, { status: 422 })
    }

    // Injecter user_id côté serveur (ne pas faire confiance au body client)
    formData.set("user_id", userId)

    const result = await createOrUpdateCanal(formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("CANAL CREATE ERROR:", error)
    const message = error instanceof Error && error.message ? error.message : "Impossible de créer le canal."
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
