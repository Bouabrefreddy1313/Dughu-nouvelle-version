import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }

    const existing = await prisma.pinnedPost.findFirst({
      where: { postId, userId },
    })

    if (existing) {
      await prisma.pinnedPost.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, pinned: false })
    }

    await prisma.pinnedPost.create({
      data: { postId, userId, active: true },
    })
    return NextResponse.json({ success: true, pinned: true })
  } catch (error) {
    console.error("PIN ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
