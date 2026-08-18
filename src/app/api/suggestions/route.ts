import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dughu, dughuApi, mapPosts, resolveMediaUrl } from "@/lib/dughu"
import { resolveDughuUserIdFromLocalId } from "@/lib/dughu-user"

// Extrait le tableau de données d'une réponse Dughu (result.data / data / tableau direct)
function arrOf(raw: any): any[] {
  const d = raw?.result
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.data)) return d.data
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw)) return raw
  return []
}

function mapPages(raw: any) {
  return arrOf(raw).map((p) => ({
    id: String(p.page_id ?? p.id ?? ""),
    name: p.page_title || p.page_name || "Page",
    description: p.page_description || "",
    image: resolveMediaUrl(p.avatar) || "/images/page/default-avatar.jpg",
    cover: resolveMediaUrl(p.cover) || "/images/page/default-cover.jpg",
    category: p.page_category ?? null,
    likes: Number(p.likes ?? p.likesNbr ?? 0) || 0,
  }))
}

function mapGroups(raw: any) {
  return arrOf(raw).map((g) => ({
    id: String(g.id ?? ""),
    name: g.group_title || g.group_name || "Groupe",
    description: g.about || "",
    image: resolveMediaUrl(g.avatar) || "/images/group/default-avatar.jpg",
    cover: resolveMediaUrl(g.cover) || "/images/group/default-cover.jpg",
    category: g.category ?? null,
    privacy: String(g.privacy ?? "1"),
    memberCount: Number(g.member_count ?? g.members ?? g.nbr_members ?? 0) || 0,
  }))
}

function mapHashtags(raw: any) {
  return arrOf(raw)
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => ({ tag: `#${tag}`, postCount: 0 }))
}

// Normalise les activités Dughu (profile/{username}/activites) vers la forme
// attendue par la sidebar (ActivityItem). `user` est null : la sidebar replie
// sur l'utilisateur connecté (ce sont SES activités).
function mapActivities(raw: any): any[] {
  const arr = raw?.activities?.data || raw?.data || []
  if (!Array.isArray(arr)) return []
  const toIso = (v: any): string => {
    if (!v) return new Date().toISOString()
    if (typeof v === "number") return new Date(v * 1000).toISOString()
    const s = String(v)
    if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString()
    return s
  }
  return arr.map((a: any) => ({
    id: String(a.id ?? a.activity_id ?? a.post_id ?? a.time ?? ""),
    activityType: String(a.activity_type || a.activityType || "post"),
    postId: a.post_id ? String(a.post_id) : null,
    description: a.description || "",
    createdAt: toIso(a.time ?? a.created_at ?? a.createdAt),
    user: null,
  }))
}

export async function GET(req: NextRequest) {
  try {
    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    // ID Dughu de l'utilisateur connecté : via le paramètre userId, sinon cookie.
    let dughuUserId = userId ? await resolveDughuUserIdFromLocalId(userId) : ""
    if (!dughuUserId) {
      const cookiesModule = await import("next/headers")
      const cookies = await cookiesModule.cookies()
      const token =
        cookies.get("next-auth.session-token")?.value ||
        cookies.get("__Secure-next-auth.session-token")?.value
      if (token) {
        const session = await prisma.session.findUnique({ where: { sessionToken: token } }).catch(() => null)
        if (session) dughuUserId = await resolveDughuUserIdFromLocalId(session.userId)
      }
    }

    const [pagesRaw, groupsRaw, hashtagsRaw, popularRaw] = await Promise.all([
      dughuUserId ? dughuApi.suggestPages({ user_id: dughuUserId }).catch(() => null) : Promise.resolve(null),
      dughuUserId ? dughuApi.suggestGroups({ user_id: dughuUserId }).catch(() => null) : Promise.resolve(null),
      dughuApi.getHashtags("").catch(() => null),
      dughuUserId ? dughuApi.getPopularPosts(dughuUserId).catch(() => null) : Promise.resolve(null),
    ])

    const pages = mapPages(pagesRaw)
    const groups = mapGroups(groupsRaw)
    const hashtags = mapHashtags(hashtagsRaw)

    // Posts populaires (boostés) → forme attendue par BoostedPostCard
    const boostedPosts = mapPosts(popularRaw?.result ?? popularRaw).map((p: any) => ({
      id: p.id,
      content: p.content,
      image: p.image || p.video || p.thumb || null,
      video: p.video || null,
      author: p.author || { id: "", name: null, username: null, avatar: null },
      _count: { comments: p._count?.comments, likes: p._count?.likes, views: null },
    }))

    // Activités récentes : endpoint Dughu profile/{username}/activites
    let activities: any[] = []
    if (userId) {
      const localUser = await prisma.user
        .findUnique({ where: { id: userId }, select: { username: true } })
        .catch(() => null)
      let username = localUser?.username || ""
      if (!username && dughuUserId) {
        // Utilisateur "token Dughu" (sans compte local) → username depuis l'API.
        const profileRaw = await dughuApi.getUser(dughuUserId, dughuUserId).catch(() => null)
        const profileObj = profileRaw?.user ?? profileRaw?.data ?? profileRaw?.profile ?? profileRaw?.result ?? profileRaw
        username = profileObj?.username || profileObj?.user_name || profileObj?.slug || ""
      }
      if (username) {
        const activitiesRaw = await dughuApi.getUserActivities(username, 1).catch(() => null)
        activities = mapActivities(activitiesRaw)
      }
    }

    return NextResponse.json({
      success: true,
      pages,
      groups,
      hashtags,
      users: [],
      events: [],
      products: [],
      activities,
      boostedPosts,
      userStats: null,
    })
  } catch (error) {
    console.error("SUGGESTIONS ERROR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
