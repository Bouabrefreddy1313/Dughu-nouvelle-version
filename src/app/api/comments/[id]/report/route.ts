import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId, reason } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId requis." }, { status: 422 })
    }

    const comment = await prisma.comment.findUnique({ where: { id } }).catch(() => null)
    if (comment && comment.userId === userId) {
      return NextResponse.json({ success: false, message: "Vous ne pouvez pas signaler votre propre commentaire." }, { status: 422 })
    }

    const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } })
    for (const admin of admins) {
      void prisma.notification.create({
        data: {
          userId: admin.id,
          type: "report_comment",
          content: comment
            ? `Un commentaire a été signalé: ${reason || ""}`
            : `Un commentaire (ID ${id}) a été signalé: ${reason || ""}`,
        },
      })
    }

    return NextResponse.json({ success: true, message: "Commentaire signalé." })
  } catch (error) {
    console.error("REPORT COMMENT ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}