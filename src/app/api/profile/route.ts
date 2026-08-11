import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, DughuApiError, normalizeUser, parseCounts, mapPhotos, mapFriends, pick } from "@/lib/dughu"

const DEFAULT_COVER = "/images/group/default-cover.jpg"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const slug = searchParams.get("slug")
    const currentUserId = searchParams.get("currentUserId")

    if (!userId && !slug) {
      return NextResponse.json({ success: false, message: "Identifiant requis." }, { status: 422 })
    }

    // ── Mode Dughu API (lorsque DUGHU_API_KEY est renseigné) ──
    if (dughu.enabled) {
      try {
        // Résoudre l'utilisateur local pour obtenir son dughuId
        const localUser = userId
          ? await prisma.user.findUnique({
              where: { id: userId },
              select: { dughuId: true },
            })
          : await prisma.user.findFirst({
              where: {
                OR: [{ username: slug as string }, { slug: slug as string }],
              },
              select: { dughuId: true },
            })

        // L'ID du visiteur connecté côté Dughu
        let viewerDughuId = "0"
        if (currentUserId) {
          const viewer = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { dughuId: true },
          })
          viewerDughuId = viewer?.dughuId || "0"
        }

        // Seulement si l'utilisateur a un compte Dughu
        if (localUser?.dughuId) {
          const raw = await dughuApi.getUser(localUser.dughuId, viewerDughuId)
          const userObj = normalizeUser(raw?.user || raw?.data || raw?.profile || raw)
          if (!userObj) {
            throw new DughuApiError("Profil Dughu introuvable", 404)
          }

          const details = parseCounts(raw?.details ?? raw?.user?.details ?? userObj.details)
          const username = userObj.username || userObj.slug || ""
          const [photos, friends] = await Promise.all([
            username ? dughuApi.getUserPhotos(username, 1).then(mapPhotos).catch(() => []) : Promise.resolve([]),
            dughuApi.getUserFriends(userObj.id).then(mapFriends).catch(() => []),
          ])

          const isFollowing =
            !!pick(raw, "is_following", "isFollowing", "follow_status", "followStatus") ||
            !!userObj.isFollowing

          return NextResponse.json({
            success: true,
            user: {
              ...userObj,
              name: userObj.name,
              avatar: userObj.avatar,
              cover: userObj.cover,
            },
            info: {
              email: userObj.email,
              phone: userObj.phone,
              phoneNumber: userObj.phone,
              country: null,
              gender: userObj.gender,
              birthdate: userObj.birthdate,
              joined: pick(raw, "createdAt", "created_at", "dateCreation", "joined") || "",
              registered: pick(raw, "createdAt", "created_at", "dateCreation", "registered") || "",
            },
            stats: {
              posts: details.posts,
              followers: details.followers,
              following: details.following,
              friends: details.friends,
            },
            friends,
            recentFollowers: [],
            photos,
            groups: [],
            pages: { owned: [], liked: [] },
            isFollowing,
          })
        }
        // Pas de dughuId → fallback sur les données locales Prisma
      } catch (err) {
        if (err instanceof Error && err.message.includes("DUGHU_API_KEY manquant")) throw err
        console.error("DUGHU PROFILE ERROR:", err)
        // fallback sur les données locales Prisma
      }
    }

    // Résolution de l'utilisateur
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          include: {
            country: { select: { id: true, name: true, code: true, indicatif: true } },
          },
        })
      : await prisma.user.findFirst({
          where: {
            OR: [{ username: slug as string }, { slug: slug as string }],
          },
          include: {
            country: { select: { id: true, name: true, code: true, indicatif: true } },
          },
        })

    if (!user) {
      return NextResponse.json({ success: false, message: "Profil introuvable." }, { status: 404 })
    }

    // Stats
    const [postsCount, followersCount, followingCount] = await Promise.all([
      prisma.post.count({ where: { authorId: user.id } }),
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
    ])

    // Amis = abonnements mutuels
    const followingRows = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    })
    const followingIds = followingRows.map((f) => f.followingId)
    const friendRows = followingIds.length
      ? await prisma.follow.findMany({
          where: { followingId: user.id, followerId: { in: followingIds } },
          select: { followerId: true },
        })
      : []
    const friendIds = friendRows.map((f) => f.followerId)
    const friendsCount = friendIds.length

    const friends = friendIds.length
      ? await prisma.user.findMany({
          where: { id: { in: friendIds } },
          select: { id: true, name: true, username: true, avatar: true },
          orderBy: { name: "asc" },
          take: 50,
        })
      : []

    // Récents abonnés (pour "Mes amis / abonnés" alternatif)
    const recentFollowers = await prisma.follow.findMany({
      where: { followingId: user.id },
      orderBy: { createdAt: "desc" },
      take: 9,
      include: {
        follower: { select: { id: true, name: true, username: true, avatar: true } },
      },
    })

    // Photos récentes (publications avec image)
    const photoPosts = await prisma.post.findMany({
      where: { authorId: user.id, image: { not: null }, active: "1" },
      orderBy: { createdAt: "desc" },
      take: 9,
      select: { id: true, image: true, createdAt: true },
    })

    // Groupes de l'utilisateur
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      orderBy: { group: { createdAt: "desc" } },
      include: {
        group: {
          include: {
            members: { select: { id: true } },
            _count: { select: { members: true } },
          },
        },
      },
    })

    // Pages créées + aimées
    const [ownedPages, likedPages] = await Promise.all([
      prisma.page.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.pageLike
        .findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: { pageId: true },
          take: 12,
        })
        .then((rows) =>
          prisma.page.findMany({
            where: { id: { in: rows.map((r) => r.pageId) } },
          })
        ),
    ])

    // Suivi par l'utilisateur connecté
    let isFollowing = false
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      })
      isFollowing = !!follow
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        username: user.username,
        slug: user.slug,
        email: user.email,
        avatar: user.avatar || "/images/avatar.png",
        cover: user.cover || DEFAULT_COVER,
        bio: user.bio,
        gender: user.gender,
        phone: user.phone,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        countryId: user.countryId,
        birthdate: user.birthdate,
        joined: user.joined,
        active: user.active,
        role: user.role,
        isAdmin: user.isAdmin,
        twoFactor: user.twoFactor,
      },
      info: {
        email: user.email,
        phone: user.phone,
        phoneNumber: user.phoneNumber,
        country: user.country,
        gender: user.gender,
        birthdate: user.birthdate,
        joined: user.joined,
        registered: user.registered,
      },
      stats: {
        posts: postsCount,
        followers: followersCount,
        following: followingCount,
        friends: friendsCount,
      },
      friends,
      recentFollowers: recentFollowers.map((f) => f.follower),
      photos: photoPosts.map((p) => ({
        id: p.id,
        url: p.image,
        createdAt: p.createdAt,
      })),
      groups: memberships.map((m) => ({
        id: m.groupId,
        name: m.group.name,
        image: m.group.image,
        description: m.group.description,
        role: m.role,
        memberCount: m.group._count.members,
      })),
      pages: {
        owned: ownedPages.map((p) => ({
          id: p.id,
          name: p.name,
          image: p.image,
          cover: p.cover,
          description: p.description,
          likes: p.likes,
        })),
        liked: likedPages.map((l) => ({
          id: l.id,
          name: l.name,
          image: l.image,
          cover: l.cover,
          description: l.description,
          likes: l.likes,
        })),
      },
      isFollowing,
    })
  } catch (error) {
    console.error("PROFILE GET ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors du chargement du profil." }, { status: 500 })
  }
}