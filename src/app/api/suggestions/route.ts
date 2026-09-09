import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, mapPosts, resolveMediaUrl } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

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
  const arr = Array.isArray(raw)
    ? raw
    : raw?.result?.data || raw?.result || raw?.data || raw?.hashtags || []
  if (!Array.isArray(arr)) return []

  const list = arr
    .map((t: any) => {
      if (typeof t === "string") {
        const clean = t.trim().replace(/^#/, "")
        return clean ? { tag: `#${clean}`, postCount: 0 } : null
      }
      if (t && typeof t === "object") {
        const rawTag = String(t.tag || t.name || t.hashtag || t.title || "").trim().replace(/^#/, "")
        if (!rawTag) return null
        const count = Number(t.count ?? t.postCount ?? t.posts_count ?? t.nbr_posts ?? t.uses ?? 0) || 0
        return { tag: `#${rawTag}`, postCount: count }
      }
      return null
    })
    .filter((x): x is { tag: string; postCount: number } => Boolean(x && x.tag && x.tag !== "#"))

  // Dédoublonnage par tag insensible à la casse
  const uniqueMap = new Map<string, { tag: string; postCount: number }>()
  for (const item of list) {
    const key = item.tag.toLowerCase()
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item)
    } else if (item.postCount > (uniqueMap.get(key)?.postCount || 0)) {
      uniqueMap.set(key, item)
    }
  }

  const result = Array.from(uniqueMap.values())
  // Si des counts existent, trier par fréquence d'utilisation décroissante
  if (result.some((r) => r.postCount > 0)) {
    result.sort((a, b) => b.postCount - a.postCount)
  }
  return result.slice(0, 10)
}

// Normalise les activités Dughu (profile/{username}/activites) vers la forme
// attendue par la sidebar (ActivityItem).
function mapActivities(raw: any): any[] {
  const arr = raw?.activities?.data || raw?.data || raw?.activites?.data || raw?.result || (Array.isArray(raw) ? raw : [])
  if (!Array.isArray(arr)) return []
  const toIso = (v: any): string => {
    if (!v) return new Date().toISOString()
    if (typeof v === "number") return new Date(v * 1000).toISOString()
    const s = String(v)
    if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString()
    return s
  }
  return arr.map((a: any) => {
    const postId = a.post_id ? String(a.post_id) : a.postId ? String(a.postId) : (a.type === "post" && a.id ? String(a.id) : null)
    return {
      id: String(a.id ?? a.activity_id ?? a.post_id ?? a.time ?? Math.random()),
      activityType: String(a.activity_type || a.activityType || a.type || "post"),
      postId: postId ? String(postId) : null,
      description: a.description || a.content || a.text || "",
      createdAt: toIso(a.time ?? a.created_at ?? a.createdAt ?? a.date),
      user: a.user ? {
        id: String(a.user.id || ""),
        name: a.user.name || null,
        avatar: resolveMediaUrl(a.user.avatar || a.user.image) || null,
        username: a.user.username || null,
      } : null,
    }
  })
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
    const usernameParam = searchParams.get("username") || ""

    // ID Dughu de l'utilisateur connecté : paramètre dughuUserId / dughhuUserId, sinon cookie.
    let dughuUserId = searchParams.get("dughuUserId") || searchParams.get("dughhuUserId") || ""
    if (!dughuUserId) dughuUserId = await getDughuUserIdFromCookies()

    const [pagesRaw, groupsRaw, hashtagsRaw, popularRaw] = await Promise.all([
      dughuUserId ? dughuApi.suggestPages({ user_id: dughuUserId }).catch(() => null) : Promise.resolve(null),
      dughuUserId ? dughuApi.suggestGroups({ user_id: dughuUserId }).catch(() => null) : Promise.resolve(null),
      // Endpoint /getHashtags?q=post demandé pour les hashtags les plus utilisés
      dughuApi.getHashtags("post").catch(() => null),
      dughuUserId ? dughuApi.getPopularPosts(dughuUserId).catch(() => null) : Promise.resolve(null),
    ])

    const pages = mapPages(pagesRaw)
    const groups = mapGroups(groupsRaw)
    const rawHashtags = mapHashtags(hashtagsRaw)

    // Résolution du nombre réel de publications par hashtag via getPostByHashtags
    const hashtags = await Promise.all(
      rawHashtags.slice(0, 8).map(async (h) => {
        const cleanTag = h.tag.replace(/^#/, "").trim()
        if (!cleanTag) return h
        try {
          const res = await dughuApi.getPostByHashtags(cleanTag, 1).catch(() => null)
          const postsObj = res?.posts ?? res?.data ?? res
          const total = Number(
            postsObj?.total ??
            postsObj?.count ??
            (Array.isArray(postsObj?.data) ? postsObj.data.length : Array.isArray(postsObj) ? postsObj.length : 0)
          ) || 0
          return {
            ...h,
            postCount: total > 0 ? total : (h.postCount || 0),
          }
        } catch {
          return h
        }
      })
    )

    // Tri par fréquence de publications décroissante
    if (hashtags.some((h) => h.postCount > 0)) {
      hashtags.sort((a, b) => b.postCount - a.postCount)
    }

    // Posts populaires (boostés) → forme attendue par BoostedPostCard
    const boostedPosts = mapPosts(popularRaw?.result ?? popularRaw).map((p: any) => ({
      id: p.id,
      content: p.content,
      image: p.image || p.video || p.thumb || null,
      video: p.video || null,
      author: p.author || { id: "", name: null, username: null, avatar: null },
      _count: { comments: p._count?.comments, likes: p._count?.likes, views: null },
    }))

    // Activités récentes : endpoint Dughu profile/{username}/activites?page=1.
    // Le username provient directement de la session utilisateur ou est résolu depuis Dughu.
    let activities: any[] = []
    let resolvedUsername = usernameParam
    let resolvedName = ""
    let resolvedAvatar = ""

    if (dughuUserId) {
      const profileRaw = await dughuApi.getUser(dughuUserId, dughuUserId).catch(() => null)
      const profileObj = profileRaw?.user ?? profileRaw?.data ?? profileRaw?.profile ?? profileRaw?.result ?? profileRaw
      if (!resolvedUsername) {
        resolvedUsername = profileObj?.username || profileObj?.user_name || profileObj?.slug || ""
      }
      resolvedName = profileObj?.name || (profileObj?.first_name ? `${profileObj?.first_name} ${profileObj?.last_name || ""}`.trim() : resolvedUsername || "Utilisateur")
      resolvedAvatar = resolveMediaUrl(profileObj?.avatar || profileObj?.image) || ""
    }

    if (resolvedUsername) {
      const activitiesRaw = await dughuApi.getUserActivities(resolvedUsername, 1).catch(() => null)
      activities = mapActivities(activitiesRaw)
    }

    // Si l'endpoint profile/{username}/activites n'a pas encore persisté d'activités,
    // on extrait les vrais posts publiés et posts likés de l'utilisateur (posts, likes, réactions)
    if (activities.length === 0 && dughuUserId) {
      try {
        const [userPostsRaw, likedPostsRaw] = await Promise.allSettled([
          dughuApi.getUserPosts(dughuUserId, dughuUserId, 1).catch(() => null),
          dughuApi.getLikedPosts(dughuUserId).catch(() => null),
        ])

        const fallbackActivities: any[] = []

        // 1. Posts publiés récemment par l'utilisateur
        if (userPostsRaw.status === "fulfilled" && userPostsRaw.value) {
          const userPosts = mapPosts(userPostsRaw.value)
          for (const p of userPosts.slice(0, 5)) {
            fallbackActivities.push({
              id: `post-${p.id}`,
              activityType: "post",
              postId: String(p.id),
              description: p.content || "a publié une publication",
              createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
              user: {
                id: String(dughuUserId),
                name: resolvedName || "Utilisateur",
                avatar: resolvedAvatar || null,
                username: resolvedUsername || null,
              },
            })
          }
        }

        // 2. Posts likés récemment par l'utilisateur
        if (likedPostsRaw.status === "fulfilled" && likedPostsRaw.value) {
          const rawLikes = arrOf(likedPostsRaw.value)
          for (const l of rawLikes.slice(0, 5)) {
            const likedId = String(l.post_id ?? l.id ?? "")
            if (likedId) {
              const toIsoDate = (v: any) => {
                if (!v) return new Date().toISOString()
                if (typeof v === "number") return new Date(v * 1000).toISOString()
                const s = String(v)
                if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString()
                return s
              }
              fallbackActivities.push({
                id: `like-${likedId}`,
                activityType: "reaction",
                postId: likedId,
                description: l.content || l.text || "a aimé une publication",
                createdAt: toIsoDate(l.created_at ?? l.time),
                user: {
                  id: String(dughuUserId),
                  name: resolvedName || "Utilisateur",
                  avatar: resolvedAvatar || null,
                  username: resolvedUsername || null,
                },
              })
            }
          }
        }

        if (fallbackActivities.length > 0) {
          fallbackActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          activities = fallbackActivities.slice(0, 8)
        }
      } catch (err) {
        console.error("FALLBACK ACTIVITIES ERROR:", err)
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
