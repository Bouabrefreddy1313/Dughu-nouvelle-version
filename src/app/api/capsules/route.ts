import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, fetchCapsuleFeed, fetchFollowingCapsules, createCapsule, CAPSULE_PAGE_SIZE } from "@/lib/capsule-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * GET /api/capsules — feed des capsules (POST /fetchShorts Dughu).
 * Query : userId, page, perPage, filter ("all" | "following").
 */
export async function GET(req: NextRequest) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: true, capsules: [], pagination: { page: 1, perPage: CAPSULE_PAGE_SIZE, total: 0, hasMore: false } })
    }
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())
    const filter = searchParams.get("filter") || "all"
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)
    const perPage = Math.max(parseInt(searchParams.get("perPage") || String(CAPSULE_PAGE_SIZE), 10) || CAPSULE_PAGE_SIZE, 1)
    if (!userId) {
      return NextResponse.json({ success: true, capsules: [], pagination: { page, perPage, total: 0, hasMore: false } })
    }
    if (filter === "following") {
      const data = await fetchFollowingCapsules(userId, { page, perPage })
      return NextResponse.json({ success: true, ...data })
    }
    const data = await fetchCapsuleFeed(userId, { page, perPage })
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error("CAPSULES FEED ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement des capsules." }, { status: 500 })
  }
}

/**
 * POST /api/capsules — crée une capsule (POST /store/capsule Dughu, multipart).
 * Champs : userId (ou cookie), video (fichier), caption.
 */
export async function POST(req: NextRequest) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const formData = await req.formData()
    let userId = String(formData.get("userId") || formData.get("user_id") || "")
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    formData.set("user_id", userId)
    const result = await createCapsule(formData)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("CAPSULE CREATE ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur lors de la création de la capsule."
    return NextResponse.json({ success: false, message }, { status: 502 })
  }
}
