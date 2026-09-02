import { NextRequest, NextResponse } from "next/server"
import { capsuleEnabled, replyToCapsuleComment, replyToCapsuleReply, likeCapsuleComment } from "@/lib/capsule-service"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export const dynamic = "force-dynamic"

/**
 * POST /api/capsules/[id]/comments/[commentId] — actions sur un commentaire.
 * Body : { action: "reply" | "replyReply" | "like", content?, userId? }.
 * Encapsule POST /replyCapsuleComment, /replyCapsuleReply et /toggleLike/capsule/comment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    if (!capsuleEnabled) {
      return NextResponse.json({ success: false, message: "L'API Dughu n'est pas configurée." }, { status: 500 })
    }
    const { id, commentId } = await params
    const body = await req.json().catch(() => ({}))
    let userId = String(body?.userId || body?.user_id || "")
    if (!userId) userId = await getDughuUserIdFromCookies()
    if (!commentId) {
      return NextResponse.json({ success: false, message: "commentId requis." }, { status: 422 })
    }
    if (!id) {
      return NextResponse.json({ success: false, message: "capsuleId requis." }, { status: 422 })
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: "ID Dughu requis." }, { status: 404 })
    }
    const action = String(body?.action || "reply")
    if (action === "like") {
      const replyId = body?.replyId ? String(body.replyId) : undefined
      const result = await likeCapsuleComment(id, commentId, userId, replyId)
      return NextResponse.json({ success: true, ...result })
    }
    const content = String(body?.content || body?.reply || "").trim()
    if (!content) {
      return NextResponse.json({ success: false, message: "content requis." }, { status: 422 })
    }
    if (action === "replyReply") {
      const result = await replyToCapsuleReply(id, commentId, userId, content)
      return NextResponse.json({ success: true, ...result })
    }
    const result = await replyToCapsuleComment(id, commentId, userId, content)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("CAPSULE COMMENT ACTION ERROR:", error)
    const message = error instanceof Error ? error.message : "Erreur lors de l'action sur le commentaire."
    return NextResponse.json({ success: false, message }, { status: 502 })
  }
}
