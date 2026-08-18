import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi } from "@/lib/dughu"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({ userId: "", isReply: false }))
    const { userId, isReply } = body

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
    }

    // ── Mode Dughu API : les commentaires Dughu ont un ID numérique ──
    if (dughu.enabled && /^\d+$/.test(String(id))) {
      try {
        const raw = isReply
          ? await dughuApi.destroyReply(id)
          : await dughuApi.destroyComment(id)
        if (raw?.success || (raw && Object.keys(raw).length === 0)) {
          return NextResponse.json({ success: true })
        }
        return NextResponse.json({ success: false, message: raw?.message || "Erreur de suppression (API Dughu)." }, { status: 502 })
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU DESTROY COMMENT ERROR:", err)
        return NextResponse.json({ success: false, message: "Erreur de suppression (API Dughu)." }, { status: 502 })
      }
    }

    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      return NextResponse.json({ success: false, message: "Commentaire introuvable." }, { status: 404 })
    }

    // Seul l'auteur du commentaire peut le supprimer
    if (comment.userId !== userId) {
      return NextResponse.json({ success: false, message: "Vous ne pouvez supprimer que vos propres commentaires." }, { status: 403 })
    }

    // Supprimer aussi les likes et les réponses associées (cascade)
    await prisma.commentLike.deleteMany({ where: { commentId: id } })
    await prisma.comment.deleteMany({ where: { parentId: id } })
    await prisma.comment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}