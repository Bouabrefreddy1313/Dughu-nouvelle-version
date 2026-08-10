import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    const existing = await prisma.savedPost.findUnique({
      where: { postId_userId: { postId, userId } },
    })

    if (existing) {
      await prisma.savedPost.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, saved: false })
    }

    await prisma.savedPost.create({ data: { postId, userId } })
    return NextResponse.json({ success: true, saved: true })
  } catch (error) {
    console.error("SAVE ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
