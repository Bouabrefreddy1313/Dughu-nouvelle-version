import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughuApi, normalizeUser } from "@/lib/dughu"
import { resolveDughuUserId, shouldSyncLocalUser, syncLocalUserFromDughu } from "@/lib/dughu-user"

const DEFAULT_COVER = "/images/group/default-cover.jpg"

export async function GET() {
  try {
    const cookies = await (await import("next/headers")).cookies()
    const dughuToken = cookies.get("dughu_token")?.value
    const dughuUserIdCookie = cookies.get("dughu_user_id")?.value
    const legacyToken =
      cookies.get("next-auth.session-token")?.value ||
      cookies.get("__Secure-next-auth.session-token")?.value

    // ── Flux 1 : token Dughu en cookie (source de vérité) ──
    if (dughuUserIdCookie && /^\d+$/.test(String(dughuUserIdCookie))) {
      const dughuUserId = String(dughuUserIdCookie)
      const userObj = await dughuApi
        .getUser(dughuUserId, dughuUserId)
        .then((raw) => normalizeUser(raw?.user || raw?.data || raw?.profile || raw?.result || raw))
        .catch(() => null)
      if (!userObj) {
        // Token/ID invalide → non connecté.
        return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
      }

      const username = userObj.username || ""
      const avatar = userObj.avatar || "/images/avatar.png"
      const cover = userObj.cover || DEFAULT_COVER

      // Miroir local best-effort (resynchronise nom/username/avatar/cover si un
      // compte local correspondant existe — ne bloque jamais l'authentification).
      if (userObj.email) {
        const localUser = await prisma.user.findUnique({ where: { email: userObj.email } }).catch(() => null)
        if (localUser?.id && shouldSyncLocalUser(localUser.id)) {
          await syncLocalUserFromDughu(localUser.id, dughuUserId, null).catch(() => null)
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: dughuUserId,
          email: userObj.email || "",
          name: userObj.name || username || "Utilisateur",
          firstName: userObj.firstName || "",
          lastName: userObj.lastName || "",
          username,
          avatar,
          image: avatar,
          cover,
          bio: userObj.bio || "",
          _count: { posts: 0, followers: 0, following: 0 },
          followers: [],
          following: [],
          dughu: { userId: dughuUserId, username },
        },
      })
    }

    // ── Flux 2 : session locale héritée (compat, avant la migration token) ──
    if (!legacyToken) {
      return NextResponse.json({ success: false, message: "Non connecté." }, { status: 401 })
    }
    const session = await prisma.session.findUnique({ where: { sessionToken: legacyToken } })
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
    // de la colonne dughuId).
    let dughuInfo: { userId: string; username?: string } | null = null
    try {
      const dughuUserId = await resolveDughuUserId({ email: user.email, username: user.username })
      if (dughuUserId) {
        dughuInfo = { userId: dughuUserId, username: user.username || undefined }
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
