import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_COVER = "/images/group/default-cover.jpg"

export async function GET() {
  try {
    const token =
      (await (import("next/headers").then((m) => m.cookies())))?.get("next-auth.session-token")?.value ||
      (await (import("next/headers").then((m) => m.cookies())))?.get("__Secure-next-auth.session-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }

    const session = await prisma.session.findUnique({ where: { sessionToken: token } })
    if (!session || new Date(session.expires) < new Date()) {
      return NextResponse.json({ success: false, message: "Session expirée." }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 })
    }

    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } }),
    ])

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar || "/images/avatar.png",
        image: user.image || "/images/avatar.png",
        cover: user.cover || DEFAULT_COVER,
        bio: user.bio,
        dughuId: user.dughuId || null,
        dughu: user.dughuId
          ? { userId: user.dughuId, username: user.username || "", token: "" }
          : null,
        _count: {
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        },
        followers: [],
        following: [],
      },
    })
  } catch (error) {
    console.error("AUTH ME ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}