import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, toggleCapsuleLike, toggleCapsuleDislike } from "@/lib/capsule-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * POST /api/capsules/[id]/react — like / dislike une capsule.
 * Body : { action: "like" | "dislike", userId? }.
 * Encapsule GET /toggleLikeShort et /toggleDislikeShort (Dughu).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    let userId = String(body?.userId || body?.user_id || "")
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!id) {
      return NextResponse.json({ success: false, message: "capsuleId requis." }, { status: 422 })
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    const action = String(body?.action || "like")
    if (action === "dislike") {
      const result = await toggleCapsuleDislike(id, userId)
      return NextResponse.json({ success: true, ...result })
    }
    const result = await toggleCapsuleLike(id, userId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("CAPSULE REACT ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur de réaction."
    return NextResponse.json({ success: false, message }, { status: 502 })
  }
}
