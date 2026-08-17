import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    const now = new Date()

    // Pages suggérées : 8, actives, non créées, non likées par l'utilisateur
    const [pages, pageLikes] = await Promise.all([
      prisma.page.findMany({
        where: userId ? { active: true, userId: { not: userId } } : { active: true },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      userId
        ? prisma.pageLike.findMany({ where: { userId }, select: { pageId: true } })
        : Promise.resolve([]),
    ])
    const likedPageIds = new Set(pageLikes.map((l) => l.pageId))
    const suggestedPages = pages.filter((p) => !likedPageIds.has(p.id)).slice(0, 8)

    // Groupes suggérés : 15 actifs, non rejoints + compteur de membres
    const [groups, memberships] = await Promise.all([
      prisma.group.findMany({ take: 15, orderBy: { createdAt: "desc" } }),
      userId
        ? prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
        : Promise.resolve([]),
    ])
    const joinedGroupIds = new Set(memberships.map((m) => m.groupId))
    const filteredGroups = groups.filter((g) => !joinedGroupIds.has(g.id)).slice(0, 15)

    // Count membres en une seule requête groupBy (au lieu de N count() individuels)
    const groupIds = filteredGroups.map((g) => g.id)
    const memberCounts = groupIds.length > 0
      ? await prisma.groupMember.groupBy({
          by: ["groupId"],
          where: { groupId: { in: groupIds } },
          _count: { groupId: true },
        })
      : []
    const countMap = new Map(memberCounts.map((m) => [m.groupId, m._count.groupId]))

    const suggestedGroups = filteredGroups.map((g) => ({
      ...g,
      memberCount: countMap.get(g.id) || 0,
    }))

    // Utilisateurs suggérés : 5 actifs, non suivis
    const [suggestedUsersRaw, follows] = await Promise.all([
      prisma.user.findMany({
        where: { active: "1" },
        take: 20,
        orderBy: { joined: "desc" },
        select: { id: true, name: true, username: true, avatar: true, slug: true },
      }),
      userId
        ? prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } })
        : Promise.resolve([]),
    ])
    const followingIds = new Set(follows.map((f) => f.followingId))
    const suggestedUsers = suggestedUsersRaw
      .filter((u) => u.id !== userId && !followingIds.has(u.id))
      .slice(0, 5)

    // Événements suggérés : 3 futurs, non participants/intéressés
    const events = await prisma.event.findMany({
      where: {
        date: { gte: now },
        ...(userId ? { NOT: { attendees: { some: { userId } } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { _count: { select: { attendees: true } } },
    })

    // Produits suggérés : 4 actifs
    const products = await prisma.product.findMany({
      where: { active: "1" },
      take: 4,
      orderBy: { createdAt: "desc" },
    })

    // Hashtags tendances : 4 par trendUseNum DESC + compteur de posts
    const hashtags = await prisma.hashtag.findMany({
      orderBy: { trendUseNum: "desc" },
      take: 4,
    })
    const tagNames = hashtags.map((h) => h.tag)
    const tagCounts = tagNames.length > 0
      ? await Promise.all(
          tagNames.map((tag) =>
            prisma.post.count({
              where: { active: "1", content: { contains: `#${tag}`, mode: "insensitive" as const } },
            })
          )
        )
      : []
    const hashtagsWithCount = hashtags.map((h, i) => ({
      ...h,
      postCount: tagCounts[i] || 0,
    }))

    // Activités récentes : 10 dernières
    const activities = await prisma.activity.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Posts boostés sidebar : 2
    const boostedPosts = await prisma.post.findMany({
      where: { active: "1", boosted: true },
      orderBy: { createdAt: "desc" },
      take: 2,
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        likes: { select: { id: true, type: true } },
        _count: { select: { comments: true, likes: true } },
      },
    })

    // Stats utilisateur
    let userStats = null
    if (userId) {
      const [postCount, followingCount, followerCount, points] = await Promise.all([
        prisma.post.count({ where: { authorId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
        prisma.follow.count({ where: { followingId: userId } }),
        prisma.historiquePoints
          .aggregate({ where: { userId }, _sum: { points: true } })
          .then((r) => r._sum.points || 0),
      ])
      userStats = { postCount, followingCount, followerCount, points }
    }

    return NextResponse.json({
      success: true,
      pages: suggestedPages,
      groups: suggestedGroups,
      users: suggestedUsers,
      events,
      products,
      hashtags: hashtagsWithCount,
      activities,
      boostedPosts,
      userStats,
    })
  } catch (error) {
    console.error("SUGGESTIONS ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
