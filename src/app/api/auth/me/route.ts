import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveDughuUserId, shouldSyncLocalUser, syncLocalUserFromDughu } from "@/lib/dughu-user"

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

    let user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 })
    }

    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } }),
    ])

    // ID Dughu résolu à la demande (plus stocké en base depuis la suppression
    // de la colonne dughuId) : le frontend récupère ainsi toujours
    // user.dughu.userId, même si son cache localStorage a été perdu.
    let dughuInfo: { userId: string; username?: string } | null = null
    try {
      const dughuUserId = await resolveDughuUserId({ email: user.email, username: user.username })
      if (dughuUserId) {
        dughuInfo = { userId: dughuUserId, username: user.username || undefined }
        // Re-synchronisation du miroir local depuis Dughu (source de vérité)
        // au plus une fois par heure et par utilisateur : les sessions déjà
        // ouvertes convergent sans re-login (nom, username, avatar, cover).
        if (shouldSyncLocalUser(user.id)) {
          const synced = await syncLocalUserFromDughu(user.id, dughuUserId, null)
          if (synced) user = synced
        }
      }
    } catch (err) {
      console.error("AUTH ME DUGHU RESOLVE ERROR:", err)
    }
    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 })
    }

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
        _count: {
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        },
        followers: [],
        following: [],
        dughu: dughuInfo,
      },
    })
  } catch (error) {
    console.error("AUTH ME ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur interne." }, { status: 500 })
  }
}