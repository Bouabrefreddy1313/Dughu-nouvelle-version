import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    // Suppression des stories expirées
    await prisma.story.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    const where: Prisma.StoryWhereInput = { expiresAt: { gt: new Date() } }

    if (userId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      const followingIds = follows.map((f) => f.followingId)
      where.userId = { in: [...followingIds, userId] }
    }

    const stories = await prisma.story.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, username: true, avatar: true } },
      },
    })

    return NextResponse.json({ success: true, stories })
  } catch (error) {
    console.error("STORIES ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, image, text, bgColor, type } = body

    if (!userId) {
      return NextResponse.json({ success: false, message: "Utilisateur requis." }, { status: 401 })
    }
    if (!image && !text) {
      return NextResponse.json({ success: false, message: "Image ou texte requis." }, { status: 422 })
    }

    const story = await prisma.story.create({
      data: {
        userId,
        image,
        text,
        bgColor,
        type: type || (image ? "image" : "text"),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })

    return NextResponse.json({ success: true, story }, { status: 201 })
  } catch (error) {
    console.error("CREATE STORY ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
