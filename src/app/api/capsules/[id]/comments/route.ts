import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, fetchCapsuleComments, addCapsuleComment } from "@/lib/capsule-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * GET /api/capsules/[id]/comments — commentaires d'une capsule (POST /fetchComments Dughu).
 * Query : userId?.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: true, comments: [] })
    }
    const { id } = await params
    const { searchParams } = new URL(req.url)
    let userId = searchParams.get("userId") || (await getDughuUserIdFromCookies())
    if (!userId) userId = "0"
    if (!id) {
      return NextResponse.json({ success: false, message: "capsuleId requis." }, { status: 422 })
    }
    const comments = await fetchCapsuleComments(id, userId)
    return NextResponse.json({ success: true, comments })
  } catch (error) {
    console.error("CAPSULE COMMENTS ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement des commentaires." }, { status: 500 })
  }
}

/**
 * POST /api/capsules/[id]/comments — ajoute un commentaire (POST /storeComment/capsule Dughu).
 * Body : { content, userId? }.
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
    const content = String(body?.content || body?.comment || "").trim()
    if (!id || !content) {
      return NextResponse.json({ success: false, message: "capsuleId et content requis." }, { status: 422 })
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    const result = await addCapsuleComment(id, userId, content)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("CAPSULE COMMENT ADD ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur lors de l'ajout du commentaire."
    return NextResponse.json({ success: false, message }, { status: 502 })
  }
}
